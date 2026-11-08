# OpenSeaMap & Routing – Windy-Plugin

Was das Plugin kann:

- **Layer „Seezeichen (OpenSeaMap)“** zum Ein- und Ausschalten, mit Regler für die Deckkraft
- **Info-Modus**: Klick auf ein Seezeichen, einen Hafen oder ein Hindernis zeigt die Details (Name, Art, Farbe, Form, Toppzeichen, Befeuerung wie `Fl(2) G 6s 4M`, Sektoren, UKW-Kanal, alle OSM-Tags)
- **Routen-Modus**: Start, Zwischenpunkte und Ziel auf die Karte klicken. „Route berechnen“ liefert den kürzesten Weg übers Wasser, um Küsten, Inseln, Molen, Felsen und Wracks herum, mit einstellbarem Abstand zur Küste.
  Ergebnis: Gesamtdistanz in sm, Fahrzeit, Kurs und Distanz je Schlag, **GPX-Export** (z. B. für Navionics, OpenCPN oder den Plotter)
- **Track-Modus**: zeichnet deine Fahrt per GPS auf, mit Distanz, Dauer, Ø- und Max.-Fahrt, SOG/COG live und GPX-Export

> Nur zur Planung. Wassertiefen werden nicht berücksichtigt, und die Daten (OpenStreetMap) können lückenhaft sein. Ersetzt keine amtliche Seekarte.

---

## A) Testen unter Windows (Entwicklermodus)

1. **Node.js installieren**: https://nodejs.org → Version „LTS“ herunterladen und mit allen Standard-Einstellungen installieren.
2. **ZIP entpacken**, z. B. nach `Dokumente\windy-plugin-openseamap-router`.
3. Den Ordner im Explorer öffnen, oben in die **Adresszeile** `cmd` tippen und Enter drücken. Es öffnet sich eine Eingabeaufforderung im richtigen Ordner.
4. Einmalig eingeben:
   ```
   npm install
   ```
5. Dann starten (das Fenster **offen lassen**, solange du testest):
   ```
   npm start
   ```
   Wenn `created dist/plugin.js` erscheint, läuft es.
6. Im Browser (Chrome/Edge) **https://localhost:9999/plugin.js** öffnen. Es kommt eine Zertifikatswarnung: auf **„Erweitert“ → „Weiter zu localhost (unsicher)“** klicken. Du siehst danach JavaScript-Code, das ist richtig.
7. **https://www.windy.com/developer-mode** öffnen (bei Windy angemeldet sein), als URL `https://localhost:9999/plugin.js` eintragen und laden.
8. Das Plugin „⚓ OpenSeaMap & Routing“ öffnet sich rechts.

Bei jeder Änderung am Code baut `npm start` automatisch neu. Danach das Plugin in Windy neu laden.

## B) Dauerhaft installieren (ohne `npm start`)

Windy lädt normale Plugins nur von `windy-plugins.com`. Dafür muss das Plugin einmal veröffentlicht werden. Es bleibt dabei privat (`private: true`).

1. Kostenloses Konto auf **github.com** anlegen und ein neues Repository erstellen, z. B. `windy-plugin-openseamap-router`.
2. Den Inhalt dieses Ordners hochladen (ohne `node_modules` und `dist`), z. B. über „Add file → Upload files“ auf der GitHub-Seite. **Wichtig:** Der Ordner `.github` muss mit hoch.
3. Auf **https://api.windy.com/keys** einen Key vom Typ **„Windy Plugins API“** erstellen.
4. In GitHub im Repository: **Settings → Secrets and variables → Actions → New repository secret**, Name `WINDY_API_KEY`, Wert ist der Key.
5. **Actions → publish-plugin → Run workflow**.
6. Im Log des Jobs steht die Adresse, z. B.
   `https://windy-plugins.com/<deine-id>/windy-plugin-openseamap-router/0.1.0/plugin.min.js`
7. Auf **https://www.windy.com/plugins** → „Load plugin directly from URL“ → Adresse einfügen → „Install untrusted plugin“.

Danach ist das Plugin auch in der Windy-App am Handy verfügbar, wenn du dort angemeldet bist. Für eine neue Version: in `src/pluginConfig.ts` **und** `package.json` die Versionsnummer erhöhen und Schritt 5–7 wiederholen.

---

## Bedienung

- **ℹ️ Info**: Klick neben ein Seezeichen. Gesucht wird im Umkreis von ca. 25 Bildschirmpixeln, also näher heranzoomen für genaue Treffer. Mit „+ Als Routenpunkt“ wird das Objekt direkt zum Wegpunkt.
- **🧭 Route**: Punkte klicken (S = Start, Z = Ziel, Zahlen = Zwischenpunkte), dann „Route berechnen“.
  - Max. 60 sm pro Etappe. Für längere Strecken einfach Zwischenpunkte setzen.
  - „Abstand zur Küste“ ist ein weicher Wert: Die Route hält ihn ein, wo Platz ist, geht in engen Durchfahrten aber näher heran.
  - Genauigkeit: Bei kurzen Etappen rechnet das Raster mit ca. 20 m, bei 60 sm mit ca. 100 m. Sehr enge Kanäle findet es deshalb nur bei kurzen Etappen.
  - Kurse sind **rechtweisend** (ohne Missweisung).

- **⏺ Track**: „Aufzeichnung starten“ drücken und den Standortzugriff erlauben.
  - Aufgezeichnet wird nur, **solange Windy offen und das Plugin geöffnet ist**. Bei gesperrtem Bildschirm oder wenn Windy im Hintergrund ist, pausiert das Handy die Aufzeichnung. Danach geht es weiter, und die Lücke erscheint als gerade Linie.
  - „Bildschirm anlassen“ verhindert, dass sich das Display sperrt. Das kostet Akku, also Ladekabel einplanen.
  - Ungenaue Positionen (über 50 m), GPS-Sprünge und Zittern im Stand werden herausgefiltert.
  - Der Track wird im Browser gespeichert und bleibt nach dem Schließen erhalten. „Pause“ und später „Fortsetzen“ hängen an denselben Track an, „Neu“ löscht ihn.
  - Für lange Törns mit gesperrtem Handy ist eine echte Tracking-App (z. B. Navionics) zuverlässiger. Deren Track kannst du per GPX importieren (siehe unten).
- **📂 GPX-Import** (im Track-Tab): Tracks, Routen und Wegpunkte aus Navionics, Garmin, OpenCPN, Navily, OsmAnd usw. anzeigen.
  - **Export aus Navionics Boating**: Menü → Tracks (oder Routen/Marker) → Eintrag auswählen → Teilen → „GPX exportieren“ → in „Dateien“ bzw. auf Google Drive speichern oder per Mail an dich schicken. Navionics verlangt dafür ein aktives Abo.
  - Im Plugin: „GPX-Datei öffnen…“ wählen. Mehrere Dateien gleichzeitig gehen auch.
  - Tracks erscheinen als farbige Linie mit Distanz, Dauer sowie Ø- und Max.-Fahrt, Routen gestrichelt, Wegpunkte mit Namen.
  - 👁 ein- und ausblenden, 🎯 hinzoomen, ✕ entfernen. Bei Routen übernimmt 🧭 die Route in den Routen-Tab, wo du sie neu berechnen oder als GPX exportieren kannst.
  - Importe bleiben gespeichert, bis du sie entfernst. Sehr große Dateien gelten nur für die aktuelle Sitzung.

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| Info/Routing meldet „Overpass-Server ausgelastet“ | Der kostenlose Datenserver ist kurz überlastet. Nach einer Minute nochmal probieren. |
| Seezeichen-Layer bleibt leer, Info-Klick funktioniert aber | Weiter hineinzoomen (ab Zoom 9). Bleibt er leer, blockiert evtl. der OpenSeaMap-Server die Kachel-Anfragen. In der Browser-Konsole (F12) stehen dann Fehler zu `tiles.openseamap.org`. Schick mir die Meldung. |
| Ein Punkt wurde verschoben | Lag er an Land, setzt ihn das Plugin automatisch auf den nächsten Wasserpunkt (ca. 30–100 m vor der Küste). Den Hinweis siehst du unter den Buttons. |
| „Keine Wasserverbindung gefunden“ | Zwischenpunkt in der Durchfahrt setzen, oder „Abstand zur Küste“ verkleinern. |
| Track: „GPS-Zugriff verweigert“ | In den Browser- bzw. App-Einstellungen Windy den Standortzugriff erlauben (am Handy „Genau“ bzw. „Präzise“). |
| `npm start` bricht mit einem Fehler ab | Die letzten Zeilen der Meldung kopieren und mir schicken. |

Daten: © OpenSeaMap und © OpenStreetMap-Mitwirkende (ODbL).
