// Shortest water route on a raster grid (A*), avoiding coastlines,
// breakwaters and point hazards, with a soft safety distance to land.

import type { BBox, LL } from './geo';
import type { Obstacles } from './overpass';

export interface RouteOptions {
    /** Preferred distance to land/hazards in metres (soft constraint). */
    clearanceM: number;
    /** Radius blocked around point hazards in metres. */
    hazardRadiusM: number;
    /** Maximum number of cells along the longer bbox side. */
    maxCells: number;
    /** Smallest cell size in metres. */
    minCellM: number;
}

export const defaultRouteOptions: RouteOptions = {
    clearanceM: 150,
    hazardRadiusM: 50,
    maxCells: 2000,
    minCellM: 20,
};

export interface RouteResult {
    ok: boolean;
    path: LL[];
    message?: string;
    cellM?: number;
}

class Grid {
    readonly lat0: number;
    readonly lon0: number;
    readonly mLat: number;
    readonly mLon: number;
    readonly cell: number;
    readonly nx: number;
    readonly ny: number;
    readonly blocked: Uint8Array;

    constructor(b: BBox, opt: RouteOptions) {
        const midLat = (b.south + b.north) / 2;
        this.lat0 = b.south;
        this.lon0 = b.west;
        this.mLat = 111320;
        this.mLon = 111320 * Math.cos((midLat * Math.PI) / 180);
        const w = (b.east - b.west) * this.mLon;
        const h = (b.north - b.south) * this.mLat;
        this.cell = Math.max(opt.minCellM, Math.max(w, h) / opt.maxCells);
        this.nx = Math.max(2, Math.ceil(w / this.cell));
        this.ny = Math.max(2, Math.ceil(h / this.cell));
        this.blocked = new Uint8Array(this.nx * this.ny);
    }

    /** Continuous grid coordinates (x = east, y = north). */
    fx(lon: number) {
        return ((lon - this.lon0) * this.mLon) / this.cell;
    }
    fy(lat: number) {
        return ((lat - this.lat0) * this.mLat) / this.cell;
    }
    idx(x: number, y: number) {
        return y * this.nx + x;
    }
    inside(x: number, y: number) {
        return x >= 0 && y >= 0 && x < this.nx && y < this.ny;
    }
    cellOf([lat, lon]: LL): [number, number] {
        return [Math.floor(this.fx(lon)), Math.floor(this.fy(lat))];
    }
    centerOf(i: number): LL {
        const x = i % this.nx;
        const y = (i - x) / this.nx;
        return [
            this.lat0 + ((y + 0.5) * this.cell) / this.mLat,
            this.lon0 + ((x + 0.5) * this.cell) / this.mLon,
        ];
    }

    /** Visit every cell touched by the segment (supercover, Amanatides & Woo). */
    traverse(x0: number, y0: number, x1: number, y1: number, visit: (i: number) => boolean | void) {
        // Clip to grid rectangle (Liang–Barsky)
        let t0 = 0,
            t1 = 1;
        const dx = x1 - x0,
            dy = y1 - y0;
        const clip = (p: number, q: number) => {
            if (p === 0) return q >= 0;
            const r = q / p;
            if (p < 0) {
                if (r > t1) return false;
                if (r > t0) t0 = r;
            } else {
                if (r < t0) return false;
                if (r < t1) t1 = r;
            }
            return true;
        };
        const eps = 1e-9;
        if (
            !clip(-dx, x0 - 0) ||
            !clip(dx, this.nx - eps - x0) ||
            !clip(-dy, y0 - 0) ||
            !clip(dy, this.ny - eps - y0)
        )
            return;
        const ax = x0 + t0 * dx,
            ay = y0 + t0 * dy;
        const bx = x0 + t1 * dx,
            by = y0 + t1 * dy;

        let cx = Math.floor(ax),
            cy = Math.floor(ay);
        const ex = Math.floor(bx),
            ey = Math.floor(by);
        const sx = bx > ax ? 1 : -1,
            sy = by > ay ? 1 : -1;
        const ddx = Math.abs(bx - ax),
            ddy = Math.abs(by - ay);
        const tdx = ddx > 0 ? 1 / ddx : Infinity,
            tdy = ddy > 0 ? 1 / ddy : Infinity;
        let tmx = ddx > 0 ? (sx > 0 ? cx + 1 - ax : ax - cx) * tdx : Infinity;
        let tmy = ddy > 0 ? (sy > 0 ? cy + 1 - ay : ay - cy) * tdy : Infinity;

        let guard = Math.abs(ex - cx) + Math.abs(ey - cy) + 2;
        while (guard-- >= 0) {
            if (this.inside(cx, cy) && visit(this.idx(cx, cy)) === false) return;
            if (cx === ex && cy === ey) return;
            if (tmx < tmy) {
                tmx += tdx;
                cx += sx;
            } else if (tmy < tmx) {
                tmy += tdy;
                cy += sy;
            } else {
                // Exactly through a corner: mark both neighbours to stay watertight
                if (this.inside(cx + sx, cy) && visit(this.idx(cx + sx, cy)) === false) return;
                if (this.inside(cx, cy + sy) && visit(this.idx(cx, cy + sy)) === false) return;
                tmx += tdx;
                tmy += tdy;
                cx += sx;
                cy += sy;
            }
        }
    }

    rasterLine(line: LL[]) {
        for (let i = 1; i < line.length; i++) {
            const a = line[i - 1],
                b = line[i];
            this.traverse(this.fx(a[1]), this.fy(a[0]), this.fx(b[1]), this.fy(b[0]), c => {
                this.blocked[c] = 1;
            });
        }
    }

    rasterPoint(p: LL, radiusM: number) {
        const [cx, cy] = this.cellOf(p);
        const r = Math.max(0, Math.ceil(radiusM / this.cell - 0.5));
        for (let y = cy - r; y <= cy + r; y++)
            for (let x = cx - r; x <= cx + r; x++)
                if (this.inside(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5)
                    this.blocked[this.idx(x, y)] = 1;
    }
}

/** Binary min-heap keyed by Float64 priority. */
class Heap {
    private keys: number[] = [];
    private vals: number[] = [];
    get size() {
        return this.vals.length;
    }
    push(k: number, v: number) {
        const K = this.keys,
            V = this.vals;
        let i = V.length;
        K.push(k);
        V.push(v);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (K[p] <= k) break;
            K[i] = K[p];
            V[i] = V[p];
            i = p;
        }
        K[i] = k;
        V[i] = v;
    }
    pop(): number {
        const K = this.keys,
            V = this.vals;
        const top = V[0];
        const lk = K.pop()!,
            lv = V.pop()!;
        const n = V.length;
        if (n > 0) {
            let i = 0;
            for (;;) {
                const l = 2 * i + 1;
                if (l >= n) break;
                const r = l + 1;
                const c = r < n && K[r] < K[l] ? r : l;
                if (K[c] >= lk) break;
                K[i] = K[c];
                V[i] = V[c];
                i = c;
            }
            K[i] = lk;
            V[i] = lv;
        }
        return top;
    }
}

/**
 * Point-in-land test using OSM coastline orientation (land is on the LEFT of a coastline way).
 * Returns true/false, or null if no coastline nearby.
 */
export const isOnLand = (p: LL, coastlines: LL[][], searchDeg = 0.2): boolean | null => {
    const k = Math.cos((p[0] * Math.PI) / 180);
    const px = p[1] * k,
        py = p[0];
    let best = Infinity,
        side = 0;
    for (const line of coastlines) {
        for (let i = 1; i < line.length; i++) {
            const ax = line[i - 1][1] * k,
                ay = line[i - 1][0];
            const bx = line[i][1] * k,
                by = line[i][0];
            if (
                Math.min(ax, bx) > px + searchDeg ||
                Math.max(ax, bx) < px - searchDeg ||
                Math.min(ay, by) > py + searchDeg ||
                Math.max(ay, by) < py - searchDeg
            )
                continue;
            const vx = bx - ax,
                vy = by - ay;
            const len2 = vx * vx + vy * vy || 1e-18;
            let t = ((px - ax) * vx + (py - ay) * vy) / len2;
            t = Math.max(0, Math.min(1, t));
            const qx = ax + t * vx,
                qy = ay + t * vy;
            const d = (px - qx) ** 2 + (py - qy) ** 2;
            if (d < best - 1e-18) {
                best = d;
                // For vertices (t=0/1) use the average direction of the adjacent segments
                let cross = vx * (py - ay) - vy * (px - ax);
                if ((t === 0 && i > 1) || (t === 1 && i < line.length - 1)) {
                    const j = t === 0 ? i - 1 : i + 1;
                    const o = t === 0 ? line[j - 1] : line[j];
                    const ox = o[1] * k,
                        oy = o[0];
                    const wx = t === 0 ? ax - ox : ox - bx,
                        wy = t === 0 ? ay - oy : oy - by;
                    const sxv = vx / Math.sqrt(len2) + wx / (Math.hypot(wx, wy) || 1);
                    const syv = vy / Math.sqrt(len2) + wy / (Math.hypot(wx, wy) || 1);
                    cross = sxv * (py - qy) - syv * (px - qx);
                }
                side = cross;
            }
        }
    }
    if (best === Infinity) return null;
    return side > 0;
};

/**
 * If p lies on land, move it to the nearest point in the water: the closest point on the
 * coastline, pushed `offsetM` metres beyond it to the sea side. Returns null if p is
 * already in the water (or no coastline is nearby).
 */
export const nearestWater = (
    p: LL,
    coastlines: LL[][],
    offsetM = 40,
): { point: LL; movedM: number } | null => {
    if (isOnLand(p, coastlines) !== true) return null;
    const k = Math.cos((p[0] * Math.PI) / 180);
    const M = 111320; // metres per degree latitude
    const px = p[1] * k,
        py = p[0];

    // Nearest point q on any coastline segment, plus that segment's direction
    let best = Infinity,
        qx = px,
        qy = py,
        sx = 0,
        sy = 0;
    for (const line of coastlines) {
        for (let i = 1; i < line.length; i++) {
            const ax = line[i - 1][1] * k,
                ay = line[i - 1][0];
            const bx = line[i][1] * k,
                by = line[i][0];
            const vx = bx - ax,
                vy = by - ay;
            const len2 = vx * vx + vy * vy || 1e-18;
            const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
            const cx = ax + t * vx,
                cy = ay + t * vy;
            const d = (px - cx) ** 2 + (py - cy) ** 2;
            if (d < best) {
                best = d;
                qx = cx;
                qy = cy;
                const l = Math.sqrt(len2);
                sx = vx / l;
                sy = vy / l;
            }
        }
    }
    if (best === Infinity) return null;

    const toLL = (x: number, y: number): LL => [y, x / k];
    const dist = Math.sqrt(best) || 1e-12;
    // Candidate directions: continue from p across the coast, or the segment's right-hand
    // normal (OSM coastlines have water on the right)
    const dirs: [number, number][] = [
        [(qx - px) / dist, (qy - py) / dist],
        [sy, -sx],
    ];
    for (let off = offsetM; off <= offsetM * 16; off *= 2) {
        const o = off / M;
        for (const [dx, dy] of dirs) {
            if (!isFinite(dx) || !isFinite(dy) || (dx === 0 && dy === 0)) continue;
            const cand = toLL(qx + dx * o, qy + dy * o);
            if (isOnLand(cand, coastlines) === false) {
                const movedM = Math.hypot((cand[1] - p[1]) * k, cand[0] - p[0]) * M;
                return { point: cand, movedM };
            }
        }
    }
    return null;
};

/** Compute a water route a → b inside bbox. */
export const routeLeg = (
    a: LL,
    b: LL,
    bbox: BBox,
    obstacles: Obstacles,
    opt: RouteOptions = defaultRouteOptions,
): RouteResult => {
    const g = new Grid(bbox, opt);
    const N = g.nx * g.ny;

    for (const line of obstacles.lines) g.rasterLine(line);
    for (const p of obstacles.points) g.rasterPoint(p, opt.hazardRadiusM);

    // Distance (in cells) to nearest blocked cell, capped at K – used for a soft safety margin
    const K = Math.max(1, Math.min(12, Math.round(opt.clearanceM / g.cell)));
    const dist = new Uint8Array(N).fill(255);
    let frontier: number[] = [];
    for (let i = 0; i < N; i++)
        if (g.blocked[i]) {
            dist[i] = 0;
            frontier.push(i);
        }
    for (let d = 1; d <= K && frontier.length; d++) {
        const next: number[] = [];
        for (const i of frontier) {
            const x = i % g.nx,
                y = (i - x) / g.nx;
            const nb = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
            ];
            for (const [nx, ny] of nb) {
                if (!g.inside(nx, ny)) continue;
                const j = g.idx(nx, ny);
                if (dist[j] === 255) {
                    dist[j] = d;
                    next.push(j);
                }
            }
        }
        frontier = next;
    }
    const PENALTY = 4;
    const cost = (i: number) => (dist[i] >= K ? 1 : 1 + (PENALTY * (K - dist[i])) / K);

    // Snap start/end to nearest free cell
    const snap = (p: LL): number => {
        const [x0, y0] = g.cellOf(p);
        const cx = Math.min(g.nx - 1, Math.max(0, x0)),
            cy = Math.min(g.ny - 1, Math.max(0, y0));
        for (let r = 0; r <= 40; r++) {
            let bestI = -1,
                bestD = Infinity;
            for (let y = cy - r; y <= cy + r; y++)
                for (let x = cx - r; x <= cx + r; x++) {
                    if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r) continue;
                    if (!g.inside(x, y)) continue;
                    const i = g.idx(x, y);
                    if (g.blocked[i]) continue;
                    const d = (x - cx) ** 2 + (y - cy) ** 2;
                    if (d < bestD) {
                        bestD = d;
                        bestI = i;
                    }
                }
            if (bestI >= 0) return bestI;
        }
        return -1;
    };
    const s = snap(a),
        t = snap(b);
    if (s < 0 || t < 0) return { ok: false, path: [], message: 'Kein freies Wasser am Start oder Ziel.' };

    // A*
    const gScore = new Float64Array(N).fill(Infinity);
    const parent = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const tx = t % g.nx,
        ty = (t - tx) / g.nx;
    const h = (i: number) => {
        const x = i % g.nx,
            y = (i - x) / g.nx;
        const dx = Math.abs(x - tx),
            dy = Math.abs(y - ty);
        return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    const heap = new Heap();
    gScore[s] = 0;
    heap.push(h(s), s);
    const DIRS: [number, number, number][] = [
        [1, 0, 1],
        [-1, 0, 1],
        [0, 1, 1],
        [0, -1, 1],
        [1, 1, Math.SQRT2],
        [1, -1, Math.SQRT2],
        [-1, 1, Math.SQRT2],
        [-1, -1, Math.SQRT2],
    ];
    let found = false;
    while (heap.size) {
        const i = heap.pop();
        if (closed[i]) continue;
        if (i === t) {
            found = true;
            break;
        }
        closed[i] = 1;
        const x = i % g.nx,
            y = (i - x) / g.nx;
        const ci = cost(i);
        for (const [dx, dy, len] of DIRS) {
            const nx = x + dx,
                ny = y + dy;
            if (!g.inside(nx, ny)) continue;
            const j = g.idx(nx, ny);
            if (g.blocked[j] || closed[j]) continue;
            // No corner cutting across blocked cells
            if (dx && dy && (g.blocked[g.idx(x + dx, y)] || g.blocked[g.idx(x, y + dy)])) continue;
            const ng = gScore[i] + (len * (ci + cost(j))) / 2;
            if (ng < gScore[j]) {
                gScore[j] = ng;
                parent[j] = i;
                heap.push(ng + h(j), j);
            }
        }
    }
    if (!found)
        return {
            ok: false,
            path: [],
            cellM: g.cell,
            message:
                'Keine Wasserverbindung gefunden. Liegt ein Punkt an Land oder in einem abgeschlossenen Becken? Ein Zwischenpunkt kann helfen.',
        };

    const cells: number[] = [];
    for (let i = t; i !== -1; i = parent[i]) cells.push(i);
    cells.reverse();

    // String pulling: keep only turning points that are needed for line of sight
    const minClear = Math.min(K, 2);
    const clear = (i: number, j: number) => {
        const [ax, ay] = [(cells[i] % g.nx) + 0.5, Math.floor(cells[i] / g.nx) + 0.5];
        const [bx, by] = [(cells[j] % g.nx) + 0.5, Math.floor(cells[j] / g.nx) + 0.5];
        // Allow the line to come closer to land only where the A* path itself did
        const need = Math.min(minClear, dist[cells[i]], dist[cells[j]]);
        let ok = true;
        g.traverse(ax, ay, bx, by, c => {
            if (g.blocked[c] || dist[c] < need) {
                ok = false;
                return false;
            }
            return true;
        });
        return ok;
    };
    const keep: number[] = [0];
    let i = 0;
    while (i < cells.length - 1) {
        // Binary-ish search for the farthest visible cell, then linear refine
        let j = cells.length - 1;
        let step = j - i;
        let best = i + 1;
        let probe = i + 1;
        while (step >= 1) {
            const cand = Math.min(cells.length - 1, probe + step);
            if (cand > best && clear(i, cand)) {
                best = cand;
                probe = cand;
            } else step = Math.floor(step / 2);
            if (cand === cells.length - 1 && cand === best) break;
        }
        keep.push(best);
        i = best;
    }

    const path: LL[] = keep.map(k => g.centerOf(cells[k]));
    // Use the exact clicked points as first/last waypoint
    path[0] = a;
    path[path.length - 1] = b;
    return { ok: true, path, cellM: g.cell };
};
