// Access to OpenStreetMap / OpenSeaMap data via the public Overpass API.

import type { BBox, LL } from './geo';

const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export interface OsmElement {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    geometry?: { lat: number; lon: number }[];
    tags?: Record<string, string>;
}

export const runOverpass = async (query: string, signal?: AbortSignal): Promise<OsmElement[]> => {
    let lastError: unknown = null;
    for (const url of ENDPOINTS) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query),
                signal,
            });
            if (!res.ok) {
                lastError = new Error(`Overpass ${res.status}`);
                continue; // 429 / 504: try next server
            }
            const json = await res.json();
            return (json.elements || []) as OsmElement[];
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') throw e;
            lastError = e;
        }
    }
    throw lastError ?? new Error('Overpass nicht erreichbar');
};

const bb = (b: BBox) =>
    `${b.south.toFixed(5)},${b.west.toFixed(5)},${b.north.toFixed(5)},${b.east.toFixed(5)}`;

/** Seamarks near a clicked point. */
export const fetchSeamarksAround = (lat: number, lon: number, radiusM: number) =>
    runOverpass(
        `[out:json][timeout:25];
        (
          nwr(around:${Math.round(radiusM)},${lat.toFixed(6)},${lon.toFixed(6)})["seamark:type"];
          nwr(around:${Math.round(radiusM)},${lat.toFixed(6)},${lon.toFixed(6)})["leisure"="marina"];
        );
        out tags center 40;`,
    );

export interface Obstacles {
    /** Lines that must not be crossed: coastlines, breakwaters, piers. */
    lines: LL[][];
    /** Coastlines only (with OSM direction: land on the left), for land detection. */
    coastlines: LL[][];
    /** Point hazards: rocks, wrecks, obstructions. */
    points: LL[];
}

const cache = new Map<string, Obstacles>();

/** Everything the router needs inside a bbox. */
export const fetchObstacles = async (b: BBox, signal?: AbortSignal): Promise<Obstacles> => {
    const key = bb(b);
    const hit = cache.get(key);
    if (hit) return hit;

    const q = `[out:json][timeout:120][maxsize:536870912];
    (
      way["natural"="coastline"](${key});
      way["man_made"~"^(breakwater|pier|groyne)$"](${key});
      node["seamark:type"~"^(rock|wreck|obstruction)$"](${key});
      way["seamark:type"~"^(rock|wreck|obstruction)$"](${key});
    );
    out geom qt;`;

    const els = await runOverpass(q, signal);
    const result: Obstacles = { lines: [], coastlines: [], points: [] };

    for (const el of els) {
        const t = el.tags || {};
        const harmlessWreck = /non-dangerous/.test(t['seamark:wreck:category'] || '');
        if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
            if (!harmlessWreck) result.points.push([el.lat, el.lon]);
        } else if (el.type === 'way' && el.geometry && el.geometry.length > 1) {
            const line: LL[] = el.geometry.map(g => [g.lat, g.lon]);
            if (t['natural'] === 'coastline') {
                result.coastlines.push(line);
                result.lines.push(line);
            } else if (t['seamark:type']) {
                if (!harmlessWreck) result.lines.push(line);
            } else {
                result.lines.push(line);
            }
        }
    }
    cache.set(key, result);
    return result;
};
