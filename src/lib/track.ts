// GPS track recording with simple filtering, statistics and local persistence.

import { distanceM, bearingDeg } from './geo';
import type { LL } from './geo';

export interface TrackPoint {
    lat: number;
    lon: number;
    t: number; // epoch ms
    acc?: number; // metres
    sog?: number; // knots, from GPS if available
}

export interface TrackStats {
    distanceNm: number;
    durationS: number;
    movingS: number;
    avgKn: number;
    maxKn: number;
    sogKn: number | null;
    cog: number | null;
}

const STORE_KEY = 'windy-plugin-openseamap-router:track';
const MS_TO_KN = 1.943844;

/** Max accepted GPS accuracy in metres. */
export const MAX_ACCURACY_M = 50;
/** Minimum movement before a new point is stored, in metres. */
export const MIN_STEP_M = 8;
/** Plausibility limit to drop GPS jumps, in knots. */
const MAX_PLAUSIBLE_KN = 60;

export const loadTrack = (): TrackPoint[] => {
    try {
        const arr = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (_e) {
        return [];
    }
};

export const saveTrack = (pts: TrackPoint[]) => {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(pts));
    } catch (_e) {
        /* storage full or unavailable: keep in memory only */
    }
};

/**
 * Decide whether a new fix should be appended. Returns false for inaccurate fixes,
 * jitter while standing still, and implausible jumps.
 */
export const acceptFix = (prev: TrackPoint | undefined, p: TrackPoint): boolean => {
    if (p.acc !== undefined && p.acc > MAX_ACCURACY_M) return false;
    if (!prev) return true;
    const d = distanceM([prev.lat, prev.lon], [p.lat, p.lon]);
    const dt = (p.t - prev.t) / 1000;
    if (dt <= 0) return false;
    if ((d / dt) * MS_TO_KN > MAX_PLAUSIBLE_KN) return false;
    // Require more movement when the fix is imprecise
    return d >= Math.max(MIN_STEP_M, (p.acc ?? 0) * 0.5);
};

export const trackStats = (pts: TrackPoint[], latestSogKn: number | null = null): TrackStats => {
    let dist = 0,
        moving = 0,
        maxKn = 0;
    for (let i = 1; i < pts.length; i++) {
        const d = distanceM([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
        const dt = (pts[i].t - pts[i - 1].t) / 1000;
        dist += d;
        if (dt > 0) {
            const kn = (d / dt) * MS_TO_KN;
            // Gaps longer than 5 minutes (pause, app in background) don't count as moving time
            if (dt < 300 && kn > 0.5) moving += dt;
            if (dt >= 5 && dt < 300) maxKn = Math.max(maxKn, kn);
        }
        if (pts[i].sog !== undefined) maxKn = Math.max(maxKn, pts[i].sog!);
    }
    const durationS = pts.length > 1 ? (pts[pts.length - 1].t - pts[0].t) / 1000 : 0;
    const distanceNm = dist / 1852;
    const n = pts.length;
    const cog =
        n > 1 ? bearingDeg([pts[n - 2].lat, pts[n - 2].lon], [pts[n - 1].lat, pts[n - 1].lon]) : null;
    return {
        distanceNm,
        durationS,
        movingS: moving,
        avgKn: moving > 0 ? distanceNm / (moving / 3600) : 0,
        maxKn,
        sogKn: latestSogKn,
        cog,
    };
};

export const trackToGpx = (pts: TrackPoint[], name: string): string => {
    const seg = pts
        .map(
            p =>
                `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><time>${new Date(
                    p.t,
                ).toISOString()}</time>${
                    p.sog !== undefined ? `<extensions><speed>${(p.sog / MS_TO_KN).toFixed(2)}</speed></extensions>` : ''
                }</trkpt>`,
        )
        .join('\n');
    const esc = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="windy-plugin-openseamap-router" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${esc}</name>
    <trkseg>
${seg}
    </trkseg>
  </trk>
</gpx>
`;
};

export const toLL = (pts: TrackPoint[]): LL[] => pts.map(p => [p.lat, p.lon]);

export const MS_TO_KNOTS = MS_TO_KN;
