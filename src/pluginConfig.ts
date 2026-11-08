import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-openseamap-router',
    version: '0.3.0',
    icon: '⚓',
    title: 'OpenSeaMap & Routing',
    description:
        'OpenSeaMap-Seezeichen als Layer, Detailinfos per Klick (Tonnen, Feuer, Häfen, Hindernisse) und automatisches Routing übers Wasser um Küsten, Inseln und Hindernisse sowie GPS-Trackaufzeichnung, jeweils mit GPX-Export.',
    author: 'Andreas',
    repository: 'https://github.com/windycom/windy-plugin-template',
    desktopUI: 'rhpane',
    desktopWidth: 360,
    mobileUI: 'fullscreen',
    routerPath: '/openseamap-router',
    listenToSingleclick: true,
    private: true,
};

export default config;
