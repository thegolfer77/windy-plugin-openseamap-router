// Minimal, tolerant GPX parser (tracks, routes, waypoints) – works with files from
// Navionics Boating, Garmin, OpenCPN, Navily, OsmAnd etc.

import type { LL } from './geo';
import type { TrackPoint } from './track';

export interface ImportedTrack {
    name: string;
    pts: TrackPoint[]; // t = 0 if the file has no timestamps
    hasTime: boolean;
}
export interface ImportedRoute {
    name: string;
    pts: LL[];
}
export interface ImportedWaypoint {
    name: string;
    ll: LL;
}
export interface GpxData {
    tracks: ImportedTrack[];
    routes: ImportedRoute[];
    waypoints: ImportedWaypoint[];
}

const decode = (s: string) =>
    s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(+d))
        .replace(/&amp;/g, '&')
        .trim();

// Tag names may carry a namespace prefix (e.g. <gpx:trkpt>)
const tag = (name: string) => `(?:[\\w-]+:)?${name}`;

const childText = (xml: string, name: string): string => {
    const m = xml.match(new RegExp(`<${tag(name)}\\b[^>]*>([\\s\\S]*?)</${tag(name)}>`, 'i'));
    return m ? decode(m[1]) : '';
};

/** Name of the element itself, ignoring names of nested points. */
const ownName = (xml: string, pointTag: string): string => {
    const cut = xml.search(new RegExp(`<${tag(pointTag)}\\b`, 'i'));
    return childText(cut >= 0 ? xml.slice(0, cut) : xml, 'name');
};

const attr = (attrs: string, name: string): number => {
    const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return m ? parseFloat(m[1]) : NaN;
};

const elements = (xml: string, name: string): { attrs: string; body: string }[] => {
    const re = new RegExp(
        `<${tag(name)}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag(name)}\\s*>)`,
        'gi',
    );
    const out: { attrs: string; body: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) out.push({ attrs: m[1] || '', body: m[2] || '' });
    return out;
};

const point = (attrs: string): LL | null => {
    const lat = attr(attrs, 'lat'),
        lon = attr(attrs, 'lon');
    return isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
};

export const parseGpx = (xml: string, fallbackName = 'Import'): GpxData => {
    if (!/<(?:[\w-]+:)?gpx\b/i.test(xml)) throw new Error('Keine GPX-Datei.');
    const data: GpxData = { tracks: [], routes: [], waypoints: [] };

    elements(xml, 'trk').forEach((trk, ti) => {
        const name = ownName(trk.body, 'trkseg') || `${fallbackName} Track ${ti + 1}`;
        const pts: TrackPoint[] = [];
        let hasTime = true;
        for (const p of elements(trk.body, 'trkpt')) {
            const ll = point(p.attrs);
            if (!ll) continue;
            const time = Date.parse(childText(p.body, 'time'));
            if (!isFinite(time)) hasTime = false;
            pts.push({ lat: ll[0], lon: ll[1], t: isFinite(time) ? time : 0 });
        }
        if (pts.length > 1) data.tracks.push({ name, pts, hasTime });
    });

    elements(xml, 'rte').forEach((rte, ri) => {
        const name = ownName(rte.body, 'rtept') || `${fallbackName} Route ${ri + 1}`;
        const pts = elements(rte.body, 'rtept')
            .map(p => point(p.attrs))
            .filter((x): x is LL => !!x);
        if (pts.length > 1) data.routes.push({ name, pts });
    });

    // Waypoints at top level only (strip tracks/routes first)
    const top = xml.replace(/<(?:[\w-]+:)?(trk|rte)\b[\s\S]*?<\/(?:[\w-]+:)?\1\s*>/gi, '');
    elements(top, 'wpt').forEach((w, wi) => {
        const ll = point(w.attrs);
        if (ll) data.waypoints.push({ name: childText(w.body, 'name') || `WP ${wi + 1}`, ll });
    });

    if (!data.tracks.length && !data.routes.length && !data.waypoints.length)
        throw new Error('Die Datei enthält keine Tracks, Routen oder Wegpunkte.');
    return data;
};
