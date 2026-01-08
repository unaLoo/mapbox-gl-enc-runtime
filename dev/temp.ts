import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'


const staticServer = 'http://localhost:8081'

interface MapState {
    zoom: number
    pitch: number
    center: [number, number]
    bearing?: number
}

let saveStateTimer: NodeJS.Timeout | null = null

const initialState = getMapStateFromUrl() || getMapStateFromLocalStorage() || {
    zoom: 15,
    pitch: 49,
    center: [-122.5122, 47.522] as [number, number],
    bearing: 0,
}

const map = new mapboxgl.Map({
    container: 'map',
    center: initialState.center,
    pitch: initialState.pitch,
    zoom: initialState.zoom,
    bearing: initialState.bearing || 0,
    // style: 'mapbox://styles/mapbox/standard',
    style: {
        version: 8,
        sources: {},
        layers: [],
        glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
        sprite: staticServer + '/sprite/rastersymbols-day',
    },
    accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})


map.on('load', () => {

    const style: mapboxgl.StyleSpecification = {
        version: 8,
        sources: {
            DEPARE: {
                type: 'vector',
                url: 'https://localhost:3000/mbtiles/DEPARE.mbtiles/tilejson.json',
            },
            LNDARE: {
                type: 'vector',
                url: 'https://localhost:3000/mbtiles/LNDARE.mbtiles/tilejson.json',
            },
            POINT_COMMON_POINT: {
                // point_common
                type: 'vector',
                url: 'https://localhost:3000/mbtiles/point_common.mbtiles/tilejson.json',
            },
            AREA_COMMON_POINT: {
                type: 'vector',
                url: 'https://localhost:3000/mbtiles/area_common_point.mbtiles/tilejson.json',
            },
        },
        glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
        sprite: staticServer + '/sprite/rastersymbols-day',
        layers: [{
            id: 'DEPARE_FILL_0',
            type: 'fill',
            source: 'DEPARE',
            'source-layer': 'DEPARE',
            'slot': 'bottom',
            paint: {
                'fill-color': [
                    'case',
                    ['all', ['<', ['get', 'DRVAL1'], 0], ['<=', ['get', 'DRVAL2'], 0]],
                    '#83b295',
                    ['<=', ['get', 'DRVAL1'], 2],
                    '#73b6ef',
                    ['<=', ['get', 'DRVAL1'], 5],
                    '#98c5f2',
                    ['<=', ['get', 'DRVAL1'], 10],
                    '#bad5e1',
                    '#bad5e1',
                ],
            },
        }, {
            id: 'LNDARE_FILL_0',
            type: 'fill',
            slot: 'bottom',
            source: 'LNDARE',
            'source-layer': 'LNDARE',
            paint: {
                'fill-color': '#c9b97a'
            },
        }, {
            id: 'ACMMRK_TSSLPT_SYMBOL_0',
            type: 'symbol',
            source: 'AREA_COMMON_POINT',
            'source-layer': 'area_common_point',
            // filter: ['==', ['get', 'OBJL'], 148],
            filter: [
                'all',
                ['==', ['get', 'OBJL'], 148],
                [
                    "case",
                    ["<=", ["pitch"], 40
                    ],
                    true,
                    ["case", ["<=", ["pitch"], 50],
                        true,
                        [
                            "step",
                            [
                                "pitch"
                            ],
                            true,
                            50,
                            [
                                "<=",
                                [
                                    "distance-from-center"
                                ],
                                0.8
                            ],
                            55,
                            [
                                "<",
                                [
                                    "distance-from-center"
                                ],
                                0.7
                            ],
                            60,
                            [
                                "<",
                                [
                                    "distance-from-center"
                                ],
                                0.7
                            ],
                            65,
                            [
                                "<",
                                [
                                    "distance-from-center"
                                ],
                                0.5
                            ],
                            70,
                            [
                                "<",
                                [
                                    "distance-from-center"
                                ],
                                -0.05
                            ]
                        ]
                    ]
                ]
                // [
                //     "case",
                //     // case picth < 40
                //     ["<=", ["pitch"], 40], true,
                //     // else
                //     [
                //         "case",
                //         ["<=", ["pitch"], 50],
                //         true,
                //         ["step", ["pitch"], true,
                //             50, ["<=", ["distance-from-center"], 0.8],
                //             55, ["<", ["distance-from-center"], 0.7],
                //             60, ["<", ["distance-from-center"], 0.7],
                //             65, ["<", ["distance-from-center"], 0.5],
                //             70, ["<", ["distance-from-center"], -0.05],
                //         ]
                //     ]
                // ]
            ],
            layout: {
                'icon-allow-overlap': true,
                'icon-rotation-alignment': 'map',
                // 'icon-pitch-alignment': 'map',
                'icon-image': 'TSSLPT51',
                'icon-rotate': ['get', 'ORIENT'],
            },
            paint: {
                'icon-opacity': 0.5,
            },
        }, {
            id: 'PCMMRK_ACHBRT_SYMBOL',
            type: 'symbol',
            source: 'POINT_COMMON_POINT',
            'source-layer': 'point_common',
            filter: [
                'all',
                ['==', ['get', 'OBJL'], 3],
                [
                    "case",
                    // case picth < 40
                    ["<=", ["pitch"], 40], true,
                    // else
                    [
                        "case",
                        [
                            "<=",
                            [
                                "pitch"
                            ],
                            40
                        ],
                        true,
                        ["step", ["pitch"], true,
                            40, ["<=", ["distance-from-center"], 0.4],
                            50, ["<", ["distance-from-center"], 0.2],
                            55, ["<", ["distance-from-center"], 0],
                            60, ["<", ["distance-from-center"], -0.05]
                        ]
                    ]
                ]],
            layout: {
                'icon-allow-overlap': true,
                'icon-image': 'ACHBRT07',
            },
            paint: {},
        }],
        imports: [{
            "id": "basemap",
            "url": "mapbox://styles/mapbox/standard",
        }]

    }

    setTimeout(() => {
        map.setStyle(style)
    }, 1000);

})

map.on('render', () => {
})

// 保存 click handler 引用，避免重复添加
let mapClickHandler: ((e: mapboxgl.MapMouseEvent) => void) | null = null

function addClickListener(map: mapboxgl.Map) {
    // 先移除旧的监听器
    if (mapClickHandler) {
        map.off('click', mapClickHandler)
    }

    const layers = Object.keys(map.style!._layers)
    console.log('layer count:', layers.length)

    mapClickHandler = (e: mapboxgl.MapMouseEvent) => {
        const bbox = [
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5],
        ] as any
        const selectedFeatures = map.queryRenderedFeatures(bbox, { layers })
        console.log(
            selectedFeatures.map((item) => ({
                layer: item.layer!.id,
                properties: item.properties,
            })),
        )
    }

    map.on('click', mapClickHandler)
}

const zoomEl = document.getElementById('zoom') as HTMLSpanElement
const centerEl = document.getElementById('center') as HTMLSpanElement
const cursorPosEl = document.getElementById('cursorPos') as HTMLSpanElement
// Map Events

map.on('pitchend', () => debouncedSaveMapState(map))
map.on('rotateend', () => debouncedSaveMapState(map))
map.on('click', (e) => console.log('click lng lat', e.lngLat.toString()))

map.on('move', () => {
    const zoom = map.getZoom()
    const center = map.getCenter()
    const bearing = map.getBearing()

    if (zoomEl) zoomEl.textContent = zoom.toFixed(4)
    if (centerEl) centerEl.textContent = `${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}`

    debouncedSaveMapState(map)
})

map.on('mousemove', (e) => {
    if (cursorPosEl) {
        cursorPosEl.textContent = `${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`
    }
})

// State Persistence
function debouncedSaveMapState(map: mapboxgl.Map, delay = 500) {
    if (saveStateTimer) clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(() => {
        saveMapState(map)
        saveStateTimer = null
    }, delay)
}

function getMapStateFromUrl(): MapState | null {
    try {
        const params = new URLSearchParams(window.location.search)
        const zoom = params.get('zoom')
        const pitch = params.get('pitch')
        const center = params.get('center')
        const bearing = params.get('bearing')

        if (zoom && pitch && center) {
            const [lng, lat] = center.split(',').map(Number)
            if (isNaN(lng) || isNaN(lat)) return null
            return {
                zoom: Number(zoom),
                pitch: Number(pitch),
                center: [lng, lat],
                bearing: bearing ? Number(bearing) : 0,
            }
        }
    } catch (e) {
        console.warn('Failed to parse map state from URL:', e)
    }
    return null
}

function getMapStateFromLocalStorage(): MapState | null {
    const stored = localStorage.getItem('mapState')
    if (stored) {
        try {
            return JSON.parse(stored)
        } catch (e) {
            console.warn('Failed to parse stored map state:', e)
        }
    }
    return null
}

function saveMapState(map: mapboxgl.Map) {
    const state: MapState = {
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        center: [map.getCenter().lng, map.getCenter().lat],
        bearing: map.getBearing(),
    }

    try {
        localStorage.setItem('mapState', JSON.stringify(state))
    } catch (e) {
        console.warn('Failed to save map state to localStorage:', e)
    }

    const params = new URLSearchParams()
    params.set('zoom', state.zoom.toFixed(4))
    params.set('pitch', state.pitch.toFixed(2))
    params.set('center', `${state.center[0].toFixed(4)},${state.center[1].toFixed(4)}`)
    if (state.bearing) params.set('bearing', state.bearing.toFixed(2))

    try {
        window.history.replaceState({}, '', `?${params.toString()}`)
    } catch (e) {
        console.warn('Failed to update URL:', e)
    }
}
