// Human-readable (German) description of OpenSeaMap seamark tags.

import type { OsmElement } from './overpass';

const TYPES: Record<string, string> = {
    buoy_lateral: 'Lateraltonne',
    buoy_cardinal: 'Kardinaltonne',
    buoy_isolated_danger: 'Einzelgefahrentonne',
    buoy_safe_water: 'Ansteuerungstonne (sicheres Wasser)',
    buoy_special_purpose: 'Sondertonne',
    buoy_installation: 'Tonne (Anlage)',
    beacon_lateral: 'Lateralbake',
    beacon_cardinal: 'Kardinalbake',
    beacon_isolated_danger: 'Einzelgefahrenbake',
    beacon_safe_water: 'Bake (sicheres Wasser)',
    beacon_special_purpose: 'Sonderbake',
    light: 'Leuchtfeuer',
    light_major: 'Leuchtfeuer (Hauptfeuer)',
    light_minor: 'Leuchtfeuer (Nebenfeuer)',
    light_vessel: 'Feuerschiff',
    light_float: 'Leuchttonne / Feuerfloß',
    landmark: 'Landmarke',
    daymark: 'Tageszeichen',
    fog_signal: 'Nebelsignal',
    radar_transponder: 'Radarantwortbake (Racon)',
    radio_station: 'Funkstelle',
    harbour: 'Hafen',
    harbour_basin: 'Hafenbecken',
    small_craft_facility: 'Sportboot-Einrichtung',
    anchorage: 'Ankerplatz',
    anchor_berth: 'Ankerliegeplatz',
    mooring: 'Festmacher / Mooring',
    berth: 'Liegeplatz',
    rock: 'Felsen',
    wreck: 'Wrack',
    obstruction: 'Hindernis',
    restricted_area: 'Sperr-/Beschränkungsgebiet',
    cable_submarine: 'Unterwasserkabel',
    cable_overhead: 'Freileitung',
    pipeline_submarine: 'Unterwasser-Pipeline',
    bridge: 'Brücke',
    lock_basin: 'Schleuse',
    gate: 'Tor / Sperrwerk',
    fairway: 'Fahrwasser',
    recommended_track: 'Empfohlener Kurs',
    navigation_line: 'Leitlinie',
    separation_zone: 'Trennzone (Verkehrstrennung)',
    separation_line: 'Trennlinie',
    marine_farm: 'Aquakultur / Fischzucht',
    platform: 'Plattform',
    pile: 'Pfahl',
    rescue_station: 'Rettungsstation',
    signal_station_traffic: 'Verkehrssignalstelle',
    signal_station_warning: 'Warnsignalstelle',
    coastguard_station: 'Küstenwache',
    pilot_boarding: 'Lotsenversetzpunkt',
    distance_mark: 'Kilometermarke',
    sea_area: 'Seegebiet',
    seabed_area: 'Meeresboden',
    shoreline_construction: 'Uferbauwerk',
    checkpoint: 'Kontrollpunkt',
    hulk: 'Hulk',
    dumping_ground: 'Verklappungsgebiet',
    production_area: 'Produktionsgebiet',
};

const COLOURS: Record<string, string> = {
    red: 'rot',
    green: 'grün',
    yellow: 'gelb',
    white: 'weiß',
    black: 'schwarz',
    orange: 'orange',
    blue: 'blau',
    grey: 'grau',
    brown: 'braun',
    violet: 'violett',
    amber: 'bernstein',
    magenta: 'magenta',
    pink: 'rosa',
};

const CATEGORIES: Record<string, string> = {
    port: 'Backbord',
    starboard: 'Steuerbord',
    preferred_channel_port: 'Abzweigung, Hauptfahrwasser an Backbord',
    preferred_channel_starboard: 'Abzweigung, Hauptfahrwasser an Steuerbord',
    north: 'Nord',
    east: 'Ost',
    south: 'Süd',
    west: 'West',
    marina: 'Marina',
    fishing: 'Fischereihafen',
    ferry_terminal: 'Fährhafen',
    yacht: 'Yachthafen',
    harbour_master: 'Hafenmeister',
    awash: 'trockenfallend/überspült',
    covers: 'zeitweise bedeckt',
    submerged: 'unter Wasser',
    dangerous: 'gefährlich',
    'non-dangerous': 'ungefährlich',
    distributed_remains: 'verstreute Reste',
    mast_showing: 'Mast sichtbar',
    hull_showing: 'Rumpf sichtbar',
};

const SHAPES: Record<string, string> = {
    conical: 'Spitztonne (kegelförmig)',
    can: 'Stumpftonne (zylindrisch)',
    spherical: 'Kugeltonne',
    pillar: 'Spierentonne / Leuchttonne (Pfeiler)',
    spar: 'Spiere',
    barrel: 'Fasstonne',
    super_buoy: 'Großtonne',
    ice_buoy: 'Eistonne',
    stake: 'Stange',
    pole: 'Pfahl',
    post: 'Pfosten',
    tower: 'Turm',
    lattice: 'Gittermast',
    pile: 'Pfahl',
    cairn: 'Steinmann',
    buoyant: 'schwimmend',
};

const tr = (dict: Record<string, string>, v?: string) =>
    v
        ? v
              .split(';')
              .map(s => dict[s.trim()] || s.trim().replace(/_/g, ' '))
              .join(' / ')
        : '';

export const typeLabel = (type?: string) => (type ? TYPES[type] || type.replace(/_/g, ' ') : 'Objekt');

const colourAbbr: Record<string, string> = {
    white: 'W',
    red: 'R',
    green: 'G',
    yellow: 'Y',
    blue: 'Bu',
    orange: 'Or',
    violet: 'Vi',
    amber: 'Am',
};

/** Build a chart-style light description like "Fl(2) G 6s 8m 4M". */
const lightString = (t: Record<string, string>, prefix: string): string | null => {
    const g = (k: string) => t[`${prefix}:${k}`];
    const ch = g('character');
    if (!ch && !g('colour') && !g('period')) return null;
    const grp = g('group');
    const col = (g('colour') || '')
        .split(';')
        .map(c => colourAbbr[c.trim()] || c.trim())
        .filter(Boolean)
        .join('');
    const parts = [
        ch ? `${ch}${grp ? `(${grp})` : ''}` : '',
        col,
        g('period') ? `${g('period')}s` : '',
        g('height') ? `${g('height')}m` : '',
        g('range') ? `${g('range')}M` : '',
    ].filter(Boolean);
    let s = parts.join(' ');
    const sec1 = g('sector_start'),
        sec2 = g('sector_end');
    if (sec1 && sec2) s += ` (Sektor ${sec1}°–${sec2}°)`;
    if (g('category')) s += ` · ${g('category').replace(/_/g, ' ')}`;
    return s;
};

export interface SeamarkInfo {
    title: string;
    subtitle: string;
    rows: [string, string][];
    lights: string[];
    raw: [string, string][];
    lat: number;
    lon: number;
    osmUrl: string;
}

export const describe = (el: OsmElement): SeamarkInfo => {
    const t = el.tags || {};
    const type = t['seamark:type'] || (t['leisure'] === 'marina' ? 'harbour' : undefined);
    const name = t['seamark:name'] || t['name'] || '';
    const k = (suffix: string) => (type ? t[`seamark:${type}:${suffix}`] : undefined);

    const rows: [string, string][] = [];
    const add = (label: string, v?: string) => {
        if (v) rows.push([label, v]);
    };
    add('Kategorie', tr(CATEGORIES, k('category')));
    add('Form', tr(SHAPES, k('shape')));
    add('Farbe', tr(COLOURS, k('colour')));
    add('Farbmuster', k('colour_pattern')?.replace(/_/g, ' '));
    add('Wasserstand', tr(CATEGORIES, k('water_level') || t['seamark:rock:water_level']));
    add('Tiefe', t['seamark:wreck:depth'] || t['depth'] ? `${t['seamark:wreck:depth'] || t['depth']} m` : '');
    add('System', t['seamark:buoy_lateral:system'] || t['seamark:beacon_lateral:system']);
    add(
        'Toppzeichen',
        t['seamark:topmark:shape']
            ? `${t['seamark:topmark:shape'].replace(/_/g, ' ')}${
                  t['seamark:topmark:colour'] ? ', ' + tr(COLOURS, t['seamark:topmark:colour']) : ''
              }`
            : '',
    );
    add('Kennung (Tonne)', k('reference') || t['seamark:reference'] || t['ref']);
    add('Höhe', k('height') ? `${k('height')} m` : '');
    add('Nebelsignal', t['seamark:fog_signal:category']?.replace(/_/g, ' '));
    add('Racon', t['seamark:radar_transponder:group']);
    add('Kanal (UKW)', t['seamark:harbour:communication_channel'] || t['seamark:communication:channel'] || t['vhf']);
    add('Liegeplätze', t['capacity']);
    add('Telefon', t['phone'] || t['contact:phone']);
    add('Website', t['website'] || t['contact:website']);
    add('Info', t['seamark:information'] || t['description'] || t['note']);

    // Lights: single light (seamark:light:*) and sectored lights (seamark:light:1:*, :2:*, …)
    const lights: string[] = [];
    const l0 = lightString(t, 'seamark:light');
    if (l0) lights.push(l0);
    const idx = new Set<number>();
    for (const key of Object.keys(t)) {
        const m = key.match(/^seamark:light:(\d+):/);
        if (m) idx.add(+m[1]);
    }
    for (const i of [...idx].sort((a, b) => a - b)) {
        const s = lightString(t, `seamark:light:${i}`);
        if (s) lights.push(`${i}: ${s}`);
    }

    const lat = el.lat ?? el.center?.lat ?? 0;
    const lon = el.lon ?? el.center?.lon ?? 0;
    return {
        title: name || typeLabel(type),
        subtitle: name ? typeLabel(type) : '',
        rows,
        lights,
        raw: Object.entries(t).sort(([a], [b]) => a.localeCompare(b)),
        lat,
        lon,
        osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    };
};
