import type { LL } from './geo';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const toGpx = (path: LL[], name: string): string => {
    const pts = path
        .map(
            ([lat, lon], i) =>
                `    <rtept lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><name>WP${String(i + 1).padStart(
                    2,
                    '0',
                )}</name></rtept>`,
        )
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="windy-plugin-openseamap-router" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>${esc(name)}</name>
${pts}
  </rte>
</gpx>
`;
};

export const download = (content: string, filename: string, mime = 'application/gpx+xml') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
