// Geo helpers: distances in nautical miles, bearings, bounding boxes.

export type LL = [number, number]; // [lat, lon]

export interface BBox {
    south: number;
    west: number;
    north: number;
    east: number;
}

const R_EARTH_M = 6371008.8;
const M_PER_NM = 1852;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export const distanceM = (a: LL, b: LL): number => {
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
};

export const distanceNm = (a: LL, b: LL): number => distanceM(a, b) / M_PER_NM;

/** Initial true bearing from a to b, 0..360. */
export const bearingDeg = (a: LL, b: LL): number => {
    const f1 = toRad(a[0]);
    const f2 = toRad(b[0]);
    const dl = toRad(b[1] - a[1]);
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export const pathLengthNm = (path: LL[]): number => {
    let sum = 0;
    for (let i = 1; i < path.length; i++) sum += distanceNm(path[i - 1], path[i]);
    return sum;
};

/** Bounding box around points, padded by a fraction of its span (min padding in degrees). */
export const paddedBBox = (points: LL[], frac = 0.3, minPadDeg = 0.03): BBox => {
    let south = 90,
        north = -90,
        west = 180,
        east = -180;
    for (const [lat, lon] of points) {
        south = Math.min(south, lat);
        north = Math.max(north, lat);
        west = Math.min(west, lon);
        east = Math.max(east, lon);
    }
    const padLat = Math.max((north - south) * frac, minPadDeg);
    const padLon = Math.max((east - west) * frac, minPadDeg);
    return {
        south: Math.max(-85, south - padLat),
        north: Math.min(85, north + padLat),
        west: Math.max(-180, west - padLon),
        east: Math.min(180, east + padLon),
    };
};

/**
 * Roughly square search area around a leg a→b (in metres), so that islands lying
 * across the direct line can be sailed around. `grow` enlarges it for retries.
 */
export const legBBox = (a: LL, b: LL, grow = 0.6, minPadDeg = 0.03): BBox => {
    const midLat = (a[0] + b[0]) / 2;
    const k = Math.cos((midLat * Math.PI) / 180);
    const cLat = midLat;
    const cLon = (a[1] + b[1]) / 2;
    const spanLat = Math.abs(a[0] - b[0]);
    const spanLonM = Math.abs(a[1] - b[1]) * k; // in "lat degrees"
    const half = Math.max(spanLat, spanLonM) / 2;
    const halfLat = half * (1 + grow) + minPadDeg;
    const halfLon = (half * (1 + grow)) / k + minPadDeg / k;
    return {
        south: Math.max(-85, cLat - halfLat),
        north: Math.min(85, cLat + halfLat),
        west: Math.max(-180, cLon - halfLon),
        east: Math.min(180, cLon + halfLon),
    };
};

export const fmtLatLon = ([lat, lon]: LL): string => {
    const f = (v: number, pos: string, neg: string) => {
        const h = v >= 0 ? pos : neg;
        const a = Math.abs(v);
        const d = Math.floor(a);
        const m = (a - d) * 60;
        return `${d}°${m.toFixed(3).padStart(6, '0')}'${h}`;
    };
    return `${f(lat, 'N', 'S')} ${f(lon, 'E', 'W')}`;
};
