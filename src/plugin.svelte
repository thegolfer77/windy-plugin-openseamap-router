<section
    class="osm-plugin"
    class:plugin__content={!isMobileOrTablet}
    class:osm-mobile={isMobileOrTablet}
>
    {#if isMobileOrTablet}
        <!-- Compact bar for phones -->
        <div class="mbar">
            <span class="chip" class:on={showSeamarks} on:click={() => (showSeamarks = !showSeamarks)} title="Seezeichen"
                >⚓</span
            >
            <span class="chip" class:active={mode === 'info'} on:click={() => (mode = 'info')}>ℹ️</span>
            <span class="chip" class:active={mode === 'route'} on:click={() => (mode = 'route')}>🧭</span>
            <span class="chip" class:active={mode === 'track'} on:click={() => (mode = 'track')}
                >{recording ? '🔴' : '⏺'}</span
            >
            <span class="chip more" on:click={() => (expanded = !expanded)}>{expanded ? '▾' : '▴'}</span>
            <span class="chip" on:click={() => bcast.emit('rqstOpen', 'menu')} title="Schließen">✕</span>
        </div>
        <div class="msum">
            {#if mode === 'info'}
                {#if infoLoading}
                    Lade…
                {:else if infos.length}
                    <span on:click={() => (expanded = true)}
                        ><b>{infos[0].title}</b>{infos[0].subtitle ? ' · ' + infos[0].subtitle : ''}{infos[0]
                            .lights.length
                            ? ' · 💡 ' + infos[0].lights[0]
                            : ''}</span
                    >
                {:else if infoError}
                    <span class="error">{infoError}</span>
                {:else}
                    <span class="dim">Tippe auf ein Seezeichen</span>
                {/if}
            {:else if mode === 'route'}
                {#if routing}
                    {routeStatus || 'Berechne…'}
                {:else if route.length > 1}
                    <b>{totalNm.toFixed(1)} sm</b> · {fmtDuration(totalNm / speedKn)}
                    <span class="mbtn" on:click={() => (expanded = true)}>Kurse</span>
                    <span class="mbtn" on:click={exportGpx}>GPX</span>
                    <span class="mbtn" on:click={clearRoute}>✕</span>
                {:else if routeError}
                    <span class="error">{routeError}</span>
                {:else}
                    <span class="dim">{points.length ? `${points.length} Punkt(e)` : 'Tippe Start und Ziel'}</span>
                    {#if points.length}
                        <span class="mbtn" on:click={() => removePoint(points.length - 1)}>↶</span>
                    {/if}
                    {#if points.length > 1}
                        <span class="mbtn primary" on:click={computeRoute}>Berechnen</span>
                    {/if}
                {/if}
            {:else}
                {#if trackPts.length}
                    <b>{stats.distanceNm.toFixed(2)} sm</b>
                    {#if recording}· {liveSog !== null ? liveSog.toFixed(1) : '–'} kn{/if}
                    · {fmtSeconds(stats.durationS)}
                {:else}
                    <span class="dim">Kein Track</span>
                {/if}
                {#if recording}
                    <span class="mbtn" on:click={stopRecording}>⏸</span>
                {:else}
                    <span class="mbtn primary" on:click={startRecording}>▶</span>
                {/if}
            {/if}
        </div>
    {:else}
        <div
            class="plugin__title plugin__title--chevron-back"
            on:click={() => bcast.emit('rqstOpen', 'menu')}
        >
            {title}
        </div>
    {/if}

    {#if !isMobileOrTablet || expanded}
    <div class:mscroll={isMobileOrTablet}>

    <!-- LAYER -->
    <div class="box">
        <label class="row">
            <input type="checkbox" bind:checked={showSeamarks} />
            <span>Seezeichen (OpenSeaMap)</span>
        </label>
        {#if showSeamarks}
            <label class="row small">
                <span>Deckkraft</span>
                <input type="range" min="0.2" max="1" step="0.05" bind:value={opacity} />
                <span class="num">{Math.round(opacity * 100)}%</span>
            </label>
        {/if}
        <p class="hint">Seezeichen erscheinen ab ca. Zoom 9, Details ab Zoom 12.</p>
    </div>

    {#if !isMobileOrTablet}
    <!-- MODE -->
    <div class="tabs">
        <div class="tab" class:active={mode === 'info'} on:click={() => (mode = 'info')}>ℹ️ Info</div>
        <div class="tab" class:active={mode === 'route'} on:click={() => (mode = 'route')}>🧭 Route</div>
        <div class="tab" class:active={mode === 'track'} on:click={() => (mode = 'track')}>
            {recording ? '🔴' : '⏺'} Track
        </div>
    </div>
    {/if}

    {#if mode === 'info'}
        <p class="hint">Klicke auf der Karte auf ein Seezeichen, einen Hafen oder ein Hindernis.</p>
        {#if infoLoading}
            <p class="status">Lade Daten…</p>
        {/if}
        {#if infoError}
            <p class="error">{infoError}</p>
        {/if}
        {#if infoClicked && !infoLoading && !infoError && infos.length === 0}
            <p class="status">Hier ist nichts eingetragen. Zoome näher heran und klicke direkt auf das Symbol.</p>
        {/if}
        {#each infos as info, i}
            <div class="card" on:mouseenter={() => highlight(info)}>
                <div class="card-title">{info.title}</div>
                {#if info.subtitle}<div class="card-sub">{info.subtitle}</div>{/if}
                {#if info.lights.length}
                    <div class="lights">
                        {#each info.lights as l}
                            <div>💡 {l}</div>
                        {/each}
                    </div>
                {/if}
                {#if info.rows.length}
                    <table>
                        {#each info.rows as [k, v]}
                            <tr><td class="k">{k}</td><td>{v}</td></tr>
                        {/each}
                    </table>
                {/if}
                <div class="small coords">{fmtLatLon([info.lat, info.lon])}</div>
                <details>
                    <summary>Alle Tags ({info.raw.length})</summary>
                    <table class="raw">
                        {#each info.raw as [k, v]}
                            <tr><td class="k">{k}</td><td>{v}</td></tr>
                        {/each}
                    </table>
                    <a href={info.osmUrl} target="_blank" rel="noopener">In OpenStreetMap ansehen</a>
                </details>
                {#if i === 0 && mode === 'info'}
                    <div class="button-row">
                        <span class="btn small-btn" on:click={() => addPoint([info.lat, info.lon], true)}
                            >+ Als Routenpunkt</span
                        >
                    </div>
                {/if}
            </div>
        {/each}
    {:else if mode === 'route'}
        <p class="hint">
            Klicke Start, optional Zwischenpunkte und Ziel auf die Karte. Danach „Route berechnen“.
        </p>

        {#if points.length}
            <ol class="points">
                {#each points as p, i}
                    <li>
                        <span class="pin">{i === 0 ? 'S' : i === points.length - 1 ? 'Z' : i}</span>
                        <span class="small">{fmtLatLon(p)}</span>
                        <span class="x" title="Entfernen" on:click={() => removePoint(i)}>✕</span>
                    </li>
                {/each}
            </ol>
        {/if}

        <div class="settings">
            <label class="row small">
                <span>Abstand zur Küste</span>
                <input type="number" min="0" max="1000" step="10" bind:value={clearanceM} />
                <span>m</span>
            </label>
            <label class="row small">
                <span>Geschwindigkeit</span>
                <input type="number" min="1" max="40" step="0.5" bind:value={speedKn} />
                <span>kn</span>
            </label>
        </div>

        <div class="button-row">
            <span
                class="btn primary"
                class:disabled={points.length < 2 || routing}
                on:click={computeRoute}>{routing ? 'Berechne…' : 'Route berechnen'}</span
            >
            <span class="btn" class:disabled={!points.length} on:click={() => removePoint(points.length - 1)}
                >↶ Punkt</span
            >
            <span class="btn" class:disabled={!points.length} on:click={clearRoute}>Löschen</span>
        </div>

        {#if routeStatus}<p class="status">{routeStatus}</p>{/if}
        {#each notes as n}<p class="note">📍 {n}</p>{/each}
        {#if routeError}<p class="error">{routeError}</p>{/if}

        {#if route.length > 1}
            <div class="summary">
                <div><b>{totalNm.toFixed(1)} sm</b> · {route.length - 1} Schläge</div>
                <div>ca. {fmtDuration(totalNm / speedKn)} bei {speedKn} kn</div>
            </div>
            <table class="legs">
                <tr><th>#</th><th>Kurs</th><th>Distanz</th><th>Ziel</th></tr>
                {#each legs as leg, i}
                    <tr>
                        <td>{i + 1}</td>
                        <td>{String(Math.round(leg.course) % 360).padStart(3, '0')}°</td>
                        <td>{leg.nm.toFixed(2)} sm</td>
                        <td class="small">{fmtLatLon(leg.to)}</td>
                    </tr>
                {/each}
            </table>
            <p class="hint">Kurse sind rechtweisend (ohne Missweisung).</p>
            <div class="button-row">
                <span class="btn" on:click={exportGpx}>⬇ GPX exportieren</span>
            </div>
        {/if}
    {:else}
        <p class="hint">
            Zeichnet deine Position per GPS auf. Windy muss dabei geöffnet bleiben. Bei gesperrtem
            Bildschirm oder im Hintergrund pausiert das Handy die Aufzeichnung.
        </p>
        <div class="button-row">
            {#if !recording}
                <span class="btn primary" on:click={startRecording}
                    >▶ {trackPts.length ? 'Fortsetzen' : 'Aufzeichnung starten'}</span
                >
            {:else}
                <span class="btn primary" on:click={stopRecording}>⏸ Pause</span>
            {/if}
            <span class="btn" class:disabled={trackPts.length < 2} on:click={exportTrack}>⬇ GPX</span>
            {#if !confirmClear}
                <span class="btn" class:disabled={!trackPts.length} on:click={() => (confirmClear = true)}
                    >🗑 Neu</span
                >
            {:else}
                <span class="btn danger" on:click={clearTrack}>Track wirklich löschen?</span>
                <span class="btn" on:click={() => (confirmClear = false)}>Abbrechen</span>
            {/if}
        </div>
        <label class="row small">
            <input type="checkbox" bind:checked={followGps} />
            <span>Karte folgt der Position</span>
        </label>
        <label class="row small">
            <input type="checkbox" bind:checked={keepAwake} />
            <span>Bildschirm während der Aufzeichnung anlassen</span>
        </label>

        {#if gpsError}<p class="error">{gpsError}</p>{/if}
        {#if recording}
            <p class="status">
                ● Aufzeichnung läuft{gpsAcc !== null ? ` · GPS ±${Math.round(gpsAcc)} m` : ' · warte auf GPS…'}
            </p>
        {/if}

        {#if trackPts.length}
            <table class="stats">
                <tr><td class="k">Distanz</td><td><b>{stats.distanceNm.toFixed(2)} sm</b></td></tr>
                <tr><td class="k">Dauer</td><td>{fmtSeconds(stats.durationS)}</td></tr>
                <tr><td class="k">In Fahrt</td><td>{fmtSeconds(stats.movingS)}</td></tr>
                <tr><td class="k">Ø Fahrt</td><td>{stats.avgKn.toFixed(1)} kn</td></tr>
                <tr><td class="k">Max.</td><td>{stats.maxKn.toFixed(1)} kn</td></tr>
                {#if recording}
                    <tr>
                        <td class="k">SOG / COG</td>
                        <td>
                            {liveSog !== null ? liveSog.toFixed(1) + ' kn' : '–'} /
                            {stats.cog !== null ? String(Math.round(stats.cog) % 360).padStart(3, '0') + '°' : '–'}
                        </td>
                    </tr>
                {/if}
                <tr><td class="k">Punkte</td><td>{trackPts.length}</td></tr>
                <tr><td class="k">Start</td><td>{new Date(trackPts[0].t).toLocaleString('de-AT')}</td></tr>
            </table>
            <p class="hint">Der Track bleibt gespeichert, auch wenn du Windy schließt, bis du „Neu“ drückst.</p>
        {/if}

        <hr />
        <div class="section-title">📂 GPX aus Navionics & Co.</div>
        <p class="hint">
            In Navionics: Menü → Tracks oder Routen → auswählen → Teilen → „GPX exportieren“ und die Datei
            speichern. Dann hier öffnen.
        </p>
        <label class="btn file-btn">
            GPX-Datei öffnen…
            <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" multiple on:change={onGpxFiles} />
        </label>
        {#if importError}<p class="error">{importError}</p>{/if}
        {#each imports as it (it.id)}
            <div class="import-item">
                <span class="swatch" style="background:{it.color}"></span>
                <div class="import-main">
                    <div class="import-name">{it.icon} {it.name}</div>
                    <div class="small">{it.info}</div>
                </div>
                <span class="ico" title={it.visible ? 'Ausblenden' : 'Einblenden'} on:click={() => toggleImport(it)}
                    >{it.visible ? '👁' : '🚫'}</span
                >
                <span class="ico" title="Hinzoomen" on:click={() => zoomTo(it.pts)}>🎯</span>
                {#if it.kind === 'route'}
                    <span class="ico" title="Als Routenpunkte übernehmen" on:click={() => useAsRoute(it)}>🧭</span>
                {/if}
                <span class="ico" title="Entfernen" on:click={() => removeImport(it)}>✕</span>
            </div>
        {/each}
    {/if}

    <p class="disclaimer">
        Daten © OpenSeaMap & OpenStreetMap-Mitwirkende (ODbL). Nur zur Planung, ersetzt keine amtliche
        Seekarte. Wassertiefen werden beim Routing nicht berücksichtigt.
    </p>
    </div>
    {/if}
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { isMobileOrTablet } from '@windy/rootScope';
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';

    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';
    import { distanceNm, bearingDeg, legBBox, pathLengthNm, fmtLatLon } from './lib/geo';
    import { fetchSeamarksAround, fetchObstacles } from './lib/overpass';
    import { routeLeg, nearestWater, defaultRouteOptions } from './lib/router';
    import { describe } from './lib/seamark';
    import { toGpx, download } from './lib/gpx';
    import {
        loadTrack,
        saveTrack,
        acceptFix,
        trackStats,
        trackToGpx,
        toLL,
        MS_TO_KNOTS,
    } from './lib/track';
    import type { TrackPoint } from './lib/track';
    import { parseGpx } from './lib/gpxImport';

    import type { LL } from './lib/geo';
    import type { SeamarkInfo } from './lib/seamark';
    import type { LatLon } from '@windy/interfaces';

    const { name, title } = config;
    const SETTINGS_KEY = 'windy-plugin-openseamap-router:settings';

    // ---------- persistent settings ----------
    let showSeamarks = true;
    let opacity = 1;
    let clearanceM = 150;
    let speedKn = 6;
    try {
        const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (typeof s.showSeamarks === 'boolean') showSeamarks = s.showSeamarks;
        if (typeof s.opacity === 'number') opacity = s.opacity;
        if (typeof s.clearanceM === 'number') clearanceM = s.clearanceM;
        if (typeof s.speedKn === 'number') speedKn = s.speedKn;
    } catch (_e) {
        /* ignore */
    }
    const saveSettings = (s: object) => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        } catch (_e) {
            /* ignore */
        }
    };
    $: saveSettings({ showSeamarks, opacity, clearanceM, speedKn });

    let mode: 'info' | 'route' | 'track' = 'info';
    let expanded = false;

    // ---------- OpenSeaMap tile layer ----------
    let seamarkLayer: L.TileLayer | null = null;

    const ensureLayer = (on: boolean) => {
        if (on && !seamarkLayer) {
            seamarkLayer = new L.TileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
                opacity,
                maxZoom: 18,
                attribution: '© OpenSeaMap',
            }).addTo(map);
        } else if (!on && seamarkLayer) {
            seamarkLayer.remove();
            seamarkLayer = null;
        }
    };
    $: ensureLayer(showSeamarks);
    $: seamarkLayer?.setOpacity(opacity);

    // ---------- Info mode ----------
    let infos: SeamarkInfo[] = [];
    let infoLoading = false;
    let infoError = '';
    let infoClicked = false;
    let highlightMarker: L.Marker | null = null;
    let infoRequest = 0;

    const highlight = (info: SeamarkInfo | null) => {
        highlightMarker?.remove();
        highlightMarker = null;
        if (!info) return;
        highlightMarker = new L.Marker([info.lat, info.lon], {
            icon: new L.DivIcon({
                className: 'osm-plugin-hl',
                html: '<div class="osm-plugin-ring"></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            }),
            interactive: false,
        }).addTo(map);
    };

    const showInfo = async (lat: number, lon: number) => {
        const req = ++infoRequest;
        infoClicked = true;
        infoLoading = true;
        infoError = '';
        try {
            const zoom = map.getZoom();
            // ~25 screen pixels in metres, but at least 30 m and at most 3 km
            const mPerPx = (40075016 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
            const radius = Math.max(30, Math.min(3000, mPerPx * 25));
            const els = await fetchSeamarksAround(lat, lon, radius);
            if (req !== infoRequest) return;
            infos = els
                .map(describe)
                .sort((a, b) => distanceNm([lat, lon], [a.lat, a.lon]) - distanceNm([lat, lon], [b.lat, b.lon]))
                .slice(0, 5);
            highlight(infos[0] || null);
        } catch (e) {
            if (req !== infoRequest) return;
            infos = [];
            infoError = 'Abfrage fehlgeschlagen (Overpass-Server ausgelastet?). Bitte nochmal klicken.';
            console.error(e);
        } finally {
            if (req === infoRequest) infoLoading = false;
        }
    };

    // ---------- Route mode ----------
    let points: LL[] = [];
    let pointMarkers: L.Marker[] = [];
    let route: LL[] = [];
    let routeLine: L.Polyline | null = null;
    let routeDots: L.CircleMarker[] = [];
    let routing = false;
    let routeStatus = '';
    let routeError = '';
    let notes: string[] = [];
    let abort: AbortController | null = null;

    $: legs = route.slice(1).map((to, i) => ({
        to,
        nm: distanceNm(route[i], to),
        course: bearingDeg(route[i], to),
    }));
    $: totalNm = pathLengthNm(route);

    const pinIcon = (label: string, color: string) =>
        new L.DivIcon({
            className: 'osm-plugin-pin',
            html: `<div style="background:${color}">${label}</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
        });

    const redrawPoints = () => {
        pointMarkers.forEach(m => m.remove());
        pointMarkers = points.map((p, i) => {
            const isStart = i === 0;
            const isEnd = i === points.length - 1 && points.length > 1;
            const label = isStart ? 'S' : isEnd ? 'Z' : String(i);
            const color = isStart ? '#2e9d4a' : isEnd ? '#d0342c' : '#2a6fdb';
            return new L.Marker(p, { icon: pinIcon(label, color) }).addTo(map);
        });
    };

    const clearRouteDrawing = () => {
        routeLine?.remove();
        routeLine = null;
        routeDots.forEach(d => d.remove());
        routeDots = [];
    };

    const drawRoute = () => {
        clearRouteDrawing();
        if (route.length < 2) return;
        routeLine = new L.Polyline(route, { color: '#ff7a00', weight: 3, opacity: 0.95 }).addTo(map);
        routeDots = route.slice(1, -1).map(p =>
            new L.CircleMarker(p, {
                radius: 3,
                color: '#ff7a00',
                fillColor: '#fff',
                fillOpacity: 1,
                weight: 2,
            }).addTo(map),
        );
    };

    const addPoint = (p: LL, switchMode = false) => {
        points = [...points, p];
        route = [];
        clearRouteDrawing();
        routeError = '';
        routeStatus = '';
        notes = [];
        redrawPoints();
        if (switchMode) mode = 'route';
    };

    const removePoint = (i: number) => {
        if (i < 0) return;
        points = points.filter((_, j) => j !== i);
        route = [];
        clearRouteDrawing();
        redrawPoints();
    };

    const clearRoute = () => {
        abort?.abort();
        points = [];
        route = [];
        routeError = '';
        routeStatus = '';
        notes = [];
        clearRouteDrawing();
        redrawPoints();
    };

    const MAX_LEG_NM = 60;
    const nextFrame = () => new Promise(r => setTimeout(r, 30));

    const computeRoute = async () => {
        if (points.length < 2 || routing) return;
        abort?.abort();
        abort = new AbortController();
        const signal = abort.signal;
        routing = true;
        routeError = '';
        notes = [];
        route = [];
        clearRouteDrawing();
        const opts = { ...defaultRouteOptions, clearanceM: Math.max(0, +clearanceM || 0) };
        const full: LL[] = [];
        try {
            const label = (idx: number) => (idx === 0 ? 'S' : idx === points.length - 1 ? 'Z' : String(idx));
            const offsetM = Math.max(30, Math.min(100, opts.clearanceM));
            const fixed = new Set<number>();
            for (let i = 1; i < points.length; i++) {
                let a = points[i - 1],
                    b = points[i];
                const nm = distanceNm(a, b);
                if (nm > MAX_LEG_NM)
                    throw new Error(
                        `Etappe ${i} ist ${nm.toFixed(0)} sm lang. Bitte Zwischenpunkte setzen (max. ${MAX_LEG_NM} sm pro Etappe).`,
                    );
                let leg: LL[] | null = null;
                let lastMsg = '';
                for (const grow of [0.6, 1.6, 3.5]) {
                    routeStatus = `Etappe ${i}/${points.length - 1}: lade Küstendaten…`;
                    const bbox = legBBox(a, b, grow);
                    const obs = await fetchObstacles(bbox, signal);
                    if (grow === 0.6) {
                        // Points on land (inaccurate click or chart): move them into the water
                        for (const idx of [i - 1, i]) {
                            if (fixed.has(idx)) continue;
                            fixed.add(idx);
                            const w = nearestWater(points[idx], obs.coastlines, offsetM);
                            if (w) {
                                points[idx] = w.point;
                                notes = [
                                    ...notes,
                                    `Punkt ${label(idx)} lag an Land und wurde ${Math.round(w.movedM)} m ins Wasser verschoben.`,
                                ];
                            }
                        }
                        a = points[i - 1];
                        b = points[i];
                        points = points;
                        redrawPoints();
                    }
                    routeStatus = `Etappe ${i}/${points.length - 1}: berechne Route…`;
                    await nextFrame();
                    const r = routeLeg(a, b, bbox, obs, opts);
                    if (r.ok) {
                        leg = r.path;
                        break;
                    }
                    lastMsg = r.message || '';
                }
                if (!leg) throw new Error(`Etappe ${i}: ${lastMsg}`);
                if (full.length) leg = leg.slice(1);
                full.push(...leg);
            }
            route = full;
            routeStatus = '';
            drawRoute();
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') return;
            routeStatus = '';
            routeError =
                (e as Error)?.message && !/Overpass|fetch/i.test((e as Error).message)
                    ? (e as Error).message
                    : 'Küstendaten konnten nicht geladen werden (Overpass-Server ausgelastet?). Bitte später nochmal.';
            console.error(e);
        } finally {
            routing = false;
        }
    };

    const fmtDuration = (h: number) => {
        if (!isFinite(h)) return '–';
        const hh = Math.floor(h);
        const mm = Math.round((h - hh) * 60);
        return `${hh} h ${String(mm).padStart(2, '0')} min`;
    };

    const exportGpx = () => {
        const d = new Date().toISOString().slice(0, 10);
        download(toGpx(route, `Route ${d}`), `route-${d}.gpx`);
    };


    // ---------- Track recording ----------
    let trackPts: TrackPoint[] = loadTrack();
    let recording = false;
    let followGps = true;
    let keepAwake = true;
    let confirmClear = false;
    let gpsError = '';
    let gpsAcc: number | null = null;
    let liveSog: number | null = null;
    let watchId: number | null = null;
    let trackLine: L.Polyline | null = null;
    let boatMarker: L.Marker | null = null;
    let wakeLock: { release: () => Promise<void> } | null = null;
    let lastSave = 0;

    $: stats = trackStats(trackPts, liveSog);

    const boatIcon = (cog: number | null) =>
        new L.DivIcon({
            className: 'osm-plugin-boat',
            html: `<div style="transform:rotate(${cog ?? 0}deg)">${cog === null ? '●' : '▲'}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

    const drawTrack = () => {
        const ll = toLL(trackPts);
        if (ll.length > 1) {
            if (trackLine) trackLine.setLatLngs(ll);
            else
                trackLine = new L.Polyline(ll, { color: '#e0245e', weight: 3, opacity: 0.9 }).addTo(map);
        } else if (trackLine) {
            trackLine.remove();
            trackLine = null;
        }
    };

    const updateBoat = (p: LL | null, cog: number | null) => {
        if (!p) {
            boatMarker?.remove();
            boatMarker = null;
            return;
        }
        if (!boatMarker) boatMarker = new L.Marker(p, { icon: boatIcon(cog), interactive: false }).addTo(map);
        else {
            boatMarker.setLatLng(p);
            boatMarker.setIcon(boatIcon(cog));
        }
    };

    const requestWakeLock = async () => {
        if (!keepAwake || !recording || wakeLock) return;
        try {
            const nav = navigator as unknown as {
                wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
            };
            if (nav.wakeLock) wakeLock = await nav.wakeLock.request('screen');
        } catch (_e) {
            /* not supported / denied */
        }
    };
    const releaseWakeLock = () => {
        wakeLock?.release().catch(() => {});
        wakeLock = null;
    };
    $: if (!keepAwake) releaseWakeLock();
    $: if (keepAwake && recording) requestWakeLock();

    const onVisibility = () => {
        // The browser drops the wake lock when the page is hidden; take it again on return
        if (document.visibilityState === 'visible') {
            wakeLock = null;
            requestWakeLock();
        }
    };

    const onFix = (pos: GeolocationPosition) => {
        gpsError = '';
        const c = pos.coords;
        gpsAcc = c.accuracy;
        liveSog = c.speed !== null && c.speed !== undefined && !isNaN(c.speed) ? c.speed * MS_TO_KNOTS : null;
        const p: TrackPoint = {
            lat: c.latitude,
            lon: c.longitude,
            t: pos.timestamp || Date.now(),
            acc: Math.round(c.accuracy),
        };
        if (liveSog !== null) p.sog = Math.round(liveSog * 10) / 10;
        const here: LL = [p.lat, p.lon];
        if (acceptFix(trackPts[trackPts.length - 1], p)) {
            trackPts = [...trackPts, p];
            drawTrack();
            if (Date.now() - lastSave > 10000) {
                saveTrack(trackPts);
                lastSave = Date.now();
            }
        }
        const heading = c.heading !== null && c.heading !== undefined && !isNaN(c.heading) ? c.heading : stats.cog;
        updateBoat(here, heading);
        if (followGps) map.panTo(here);
    };

    const onGpsError = (err: GeolocationPositionError) => {
        gpsError =
            err.code === 1
                ? 'GPS-Zugriff verweigert. Bitte im Browser bzw. in der App den Standortzugriff für Windy erlauben.'
                : err.code === 2
                  ? 'Keine GPS-Position verfügbar.'
                  : 'GPS antwortet nicht, versuche weiter…';
    };

    const startRecording = () => {
        if (recording) return;
        if (!('geolocation' in navigator)) {
            gpsError = 'Dieses Gerät bzw. dieser Browser unterstützt kein GPS.';
            return;
        }
        confirmClear = false;
        recording = true;
        gpsAcc = null;
        watchId = navigator.geolocation.watchPosition(onFix, onGpsError, {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 30000,
        });
        requestWakeLock();
    };

    const stopRecording = () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        recording = false;
        liveSog = null;
        releaseWakeLock();
        saveTrack(trackPts);
    };

    const clearTrack = () => {
        stopRecording();
        trackPts = [];
        saveTrack(trackPts);
        drawTrack();
        updateBoat(null, null);
        confirmClear = false;
    };

    const exportTrack = () => {
        if (trackPts.length < 2) return;
        const d = new Date(trackPts[0].t).toISOString().slice(0, 10);
        download(trackToGpx(trackPts, `Track ${d}`), `track-${d}.gpx`);
    };

    const fmtSeconds = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h} h ${String(m).padStart(2, '0')} min`;
    };

    // ---------- GPX import (Navionics, Garmin, OpenCPN, …) ----------
    interface ImportItem {
        id: number;
        kind: 'track' | 'route' | 'waypoints';
        name: string;
        icon: string;
        info: string;
        color: string;
        visible: boolean;
        pts: LL[];
        times?: number[];
        labels?: string[];
    }
    const IMPORT_KEY = 'windy-plugin-openseamap-router:imports';
    const PALETTE = ['#00b3ff', '#b05cff', '#ffd400', '#00d68f', '#ff5ca8', '#7fdbff', '#ff9f43'];
    let imports: ImportItem[] = [];
    let importError = '';
    let importSeq = 1;
    const importLayers = new Map<number, L.Layer[]>();

    const describeImport = (it: ImportItem) => {
        const nm = pathLengthNm(it.pts);
        if (it.kind === 'waypoints') return `${it.pts.length} Wegpunkte`;
        if (it.kind === 'route') return `Route · ${nm.toFixed(1)} sm · ${it.pts.length} Punkte`;
        let s = `Track · ${nm.toFixed(1)} sm`;
        if (it.times && it.times.length > 1 && it.times[0] > 0) {
            const st = trackStats(it.pts.map((p, i) => ({ lat: p[0], lon: p[1], t: it.times![i] })));
            s += ` · ${fmtSeconds(st.durationS)} · Ø ${st.avgKn.toFixed(1)} kn · max ${st.maxKn.toFixed(1)} kn`;
            s += ` · ${new Date(it.times[0]).toLocaleDateString('de-AT')}`;
        }
        return s;
    };

    const persistImports = () => {
        try {
            localStorage.setItem(
                IMPORT_KEY,
                JSON.stringify(imports.map(({ kind, name, color, visible, pts, times, labels }) => ({
                    kind, name, color, visible, pts, times, labels,
                }))),
            );
        } catch (_e) {
            /* too large for local storage: keep for this session only */
        }
    };

    const drawImport = (it: ImportItem) => {
        importLayers.get(it.id)?.forEach(l => l.remove());
        importLayers.delete(it.id);
        if (!it.visible) return;
        const layers: L.Layer[] = [];
        if (it.kind === 'waypoints') {
            it.pts.forEach((p, i) =>
                layers.push(
                    new L.Marker(p, {
                        icon: new L.DivIcon({
                            className: 'osm-plugin-wpt',
                            html: `<div style="background:${it.color}"></div><span>${(it.labels?.[i] || '')
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')}</span>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6],
                        }),
                        title: it.labels?.[i] || '',
                    }).addTo(map),
                ),
            );
        } else {
            layers.push(
                new L.Polyline(it.pts, {
                    color: it.color,
                    weight: 3,
                    opacity: 0.9,
                    dashArray: it.kind === 'route' ? '8 6' : undefined,
                }).addTo(map),
            );
        }
        importLayers.set(it.id, layers);
    };

    const addImport = (partial: Omit<ImportItem, 'id' | 'info'>) => {
        const it: ImportItem = { ...partial, id: importSeq++, info: '' };
        it.info = describeImport(it);
        imports = [...imports, it];
        drawImport(it);
        return it;
    };

    const nextColor = () => PALETTE[imports.length % PALETTE.length];

    const onGpxFiles = async (ev: Event) => {
        const input = ev.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        importError = '';
        const added: ImportItem[] = [];
        for (const f of files) {
            try {
                const base = f.name.replace(/\.gpx$/i, '');
                const data = parseGpx(await f.text(), base);
                for (const t of data.tracks)
                    added.push(
                        addImport({
                            kind: 'track',
                            name: t.name,
                            icon: '〰',
                            color: nextColor(),
                            visible: true,
                            pts: t.pts.map(p => [p.lat, p.lon] as LL),
                            times: t.hasTime ? t.pts.map(p => p.t) : undefined,
                        }),
                    );
                for (const r of data.routes)
                    added.push(
                        addImport({ kind: 'route', name: r.name, icon: '🧭', color: nextColor(), visible: true, pts: r.pts }),
                    );
                if (data.waypoints.length)
                    added.push(
                        addImport({
                            kind: 'waypoints',
                            name: `${base}: Wegpunkte`,
                            icon: '📍',
                            color: nextColor(),
                            visible: true,
                            pts: data.waypoints.map(w => w.ll),
                            labels: data.waypoints.map(w => w.name),
                        }),
                    );
            } catch (e) {
                importError = `${f.name}: ${(e as Error).message || 'konnte nicht gelesen werden.'}`;
            }
        }
        input.value = '';
        persistImports();
        if (added.length) zoomTo(added.flatMap(a => a.pts));
    };

    const toggleImport = (it: ImportItem) => {
        it.visible = !it.visible;
        imports = imports;
        drawImport(it);
        persistImports();
    };

    const removeImport = (it: ImportItem) => {
        it.visible = false;
        drawImport(it);
        imports = imports.filter(x => x.id !== it.id);
        persistImports();
    };

    const zoomTo = (pts: LL[]) => {
        if (!pts.length) return;
        if (pts.length === 1) map.setView(pts[0], 13);
        else map.fitBounds(new L.LatLngBounds(pts), { padding: [40, 40] });
    };

    /** Take a route from Navionics as clicked points, so it can be recalculated or exported. */
    const useAsRoute = (it: ImportItem) => {
        points = [...it.pts];
        route = [...it.pts];
        routeError = '';
        routeStatus = '';
        notes = [`Route „${it.name}“ übernommen. „Route berechnen“ legt sie neu übers Wasser.`];
        redrawPoints();
        drawRoute();
        mode = 'route';
    };

    const restoreImports = () => {
        try {
            const arr = JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]');
            if (!Array.isArray(arr)) return;
            for (const x of arr)
                if (x && Array.isArray(x.pts) && x.pts.length)
                    addImport({
                        kind: x.kind,
                        name: x.name,
                        icon: x.kind === 'track' ? '〰' : x.kind === 'route' ? '🧭' : '📍',
                        color: x.color,
                        visible: x.visible !== false,
                        pts: x.pts,
                        times: x.times,
                        labels: x.labels,
                    });
        } catch (_e) {
            /* ignore */
        }
    };

    // ---------- map clicks ----------
    const onMapClick = (latLon: LatLon) => {
        const { lat, lon } = latLon;
        if (mode === 'info') showInfo(lat, lon);
        else if (mode === 'route') addPoint([lat, lon]);
    };

    export const onopen = (_params: unknown) => {
        /* nothing to do */
    };

    onMount(() => {
        singleclick.on(name, onMapClick);
        document.addEventListener('visibilitychange', onVisibility);
        drawTrack();
        restoreImports();
        if (trackPts.length) {
            const last = trackPts[trackPts.length - 1];
            updateBoat([last.lat, last.lon], null);
        }
    });

    onDestroy(() => {
        singleclick.off(name, onMapClick);
        document.removeEventListener('visibilitychange', onVisibility);
        stopRecording();
        trackLine?.remove();
        updateBoat(null, null);
        importLayers.forEach(ls => ls.forEach(l => l.remove()));
        importLayers.clear();
        abort?.abort();
        ensureLayer(false);
        highlight(null);
        pointMarkers.forEach(m => m.remove());
        clearRouteDrawing();
    });
</script>

<style lang="less">
    .osm-mobile {
        padding: 6px 10px 8px;
        font-size: 13px;
        .mbar {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .chip {
            flex: none;
            min-width: 34px;
            height: 30px;
            line-height: 30px;
            text-align: center;
            border-radius: 15px;
            background: rgba(255, 255, 255, 0.12);
            cursor: pointer;
            &.active {
                background: #ff7a00;
            }
            &.on {
                box-shadow: inset 0 0 0 2px #2a9df4;
            }
            &.more {
                margin-left: auto;
            }
        }
        .msum {
            margin-top: 6px;
            min-height: 22px;
            line-height: 22px;
            white-space: nowrap;
            overflow-x: auto;
            .dim {
                opacity: 0.7;
            }
        }
        .mbtn {
            display: inline-block;
            margin-left: 6px;
            padding: 0 10px;
            border-radius: 11px;
            background: rgba(255, 255, 255, 0.15);
            cursor: pointer;
            &.primary {
                background: #ff7a00;
                color: #fff;
                font-weight: bold;
            }
        }
        .mscroll {
            margin-top: 8px;
            max-height: 40vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
    }
    .osm-plugin {
        .box {
            background: rgba(255, 255, 255, 0.06);
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 12px;
        }
        .row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 4px 0;
            cursor: pointer;
            input[type='range'] {
                flex: 1;
            }
            input[type='number'] {
                width: 70px;
                margin-left: auto;
            }
        }
        .num {
            width: 38px;
            text-align: right;
        }
        .small {
            font-size: 11px;
        }
        .hint {
            font-size: 11px;
            opacity: 0.7;
            margin: 4px 0 8px;
        }
        .status {
            color: #ffd27a;
        }
        .error {
            color: #ff8a80;
        }
        .note {
            font-size: 11px;
            color: #9ad0ff;
            margin: 2px 0;
        }
        .tabs {
            display: flex;
            gap: 6px;
            margin-bottom: 8px;
        }
        .tab {
            flex: 1;
            text-align: center;
            padding: 6px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            cursor: pointer;
            &.active {
                background: #ff7a00;
                color: #fff;
            }
        }
        .card {
            background: rgba(255, 255, 255, 0.06);
            border-left: 3px solid #ff7a00;
            border-radius: 4px;
            padding: 8px 10px;
            margin-bottom: 10px;
        }
        .card-title {
            font-size: 14px;
            font-weight: bold;
        }
        .card-sub {
            opacity: 0.75;
            margin-bottom: 4px;
        }
        .lights {
            margin: 4px 0;
            font-family: monospace;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            td,
            th {
                padding: 2px 4px;
                vertical-align: top;
                text-align: left;
            }
            .k {
                opacity: 0.7;
                white-space: nowrap;
            }
        }
        .raw {
            font-family: monospace;
            font-size: 10px;
            word-break: break-all;
        }
        details {
            margin-top: 4px;
            summary {
                cursor: pointer;
                opacity: 0.8;
            }
            a {
                color: #7ab8ff;
            }
        }
        .coords {
            opacity: 0.7;
            margin-top: 4px;
        }
        .points {
            padding-left: 0;
            list-style: none;
            li {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 3px 0;
            }
            .pin {
                display: inline-block;
                width: 18px;
                height: 18px;
                line-height: 18px;
                text-align: center;
                border-radius: 50%;
                background: #2a6fdb;
                font-size: 10px;
                font-weight: bold;
            }
            .x {
                margin-left: auto;
                cursor: pointer;
                opacity: 0.6;
            }
        }
        .settings {
            margin: 8px 0;
        }
        .button-row {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin: 8px 0;
        }
        .btn {
            padding: 6px 10px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.12);
            cursor: pointer;
            user-select: none;
            &.primary {
                background: #ff7a00;
                color: #fff;
                font-weight: bold;
            }
            &.disabled {
                opacity: 0.4;
                pointer-events: none;
            }
            &.danger {
                background: #c62828;
                color: #fff;
            }
            &.small-btn {
                font-size: 11px;
                padding: 3px 8px;
            }
        }
        .summary {
            margin: 8px 0;
            padding: 8px 10px;
            border-radius: 6px;
            background: rgba(255, 122, 0, 0.15);
        }
        .legs th {
            opacity: 0.7;
            font-weight: normal;
        }
        .section-title {
            font-weight: bold;
            margin: 6px 0 2px;
        }
        .file-btn {
            display: inline-block;
            position: relative;
            overflow: hidden;
            input {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
            }
        }
        .import-item {
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 6px 0;
            padding: 6px 8px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.06);
            .swatch {
                width: 10px;
                height: 10px;
                border-radius: 2px;
                flex: none;
            }
            .import-main {
                flex: 1;
                min-width: 0;
            }
            .import-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .ico {
                cursor: pointer;
                opacity: 0.8;
                padding: 0 2px;
            }
        }
        .disclaimer {
            margin-top: 16px;
            font-size: 10px;
            opacity: 0.55;
        }
    }

    :global(.osm-plugin-pin div) {
        width: 22px;
        height: 22px;
        line-height: 22px;
        border-radius: 50%;
        color: #fff;
        font: bold 11px sans-serif;
        text-align: center;
        border: 2px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        box-sizing: border-box;
    }
    :global(.osm-plugin-boat div) {
        width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
        color: #e0245e;
        font-size: 18px;
        text-shadow: 0 0 3px #fff, 0 0 6px #fff;
    }
    :global(.osm-plugin-wpt div) {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-sizing: border-box;
    }
    :global(.osm-plugin-wpt span) {
        position: absolute;
        left: 14px;
        top: -3px;
        white-space: nowrap;
        font: 11px sans-serif;
        color: #fff;
        text-shadow: 0 0 3px #000, 0 0 3px #000;
    }
    :global(.osm-plugin-ring) {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid #ff7a00;
        box-shadow: 0 0 8px #ff7a00;
        box-sizing: border-box;
    }
</style>
