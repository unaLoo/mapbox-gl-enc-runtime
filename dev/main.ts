import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import EncRuntime from '../src/core/EncRuntime'

import { generateStyle, updateMapWithStyle } from './enc-style-lib/index'
import { StyleConfig, defaultStyleConfig } from './enc-style-lib/StyleConfig'
import Stats from 'three/addons/libs/stats.module.js'
import style from './enc-style-lib/index'

const staticServer = 'http://localhost:8081'
const renderStats = new Stats()

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
    dragRotate: false,
    pitchWithRotate: false,
    // style: {
    //     version: 8,
    //     sources: {},
    //     layers: [],
    //     glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
    //     sprite: staticServer + '/sprite/rastersymbols-day',
    // },
    accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})

let encLayer: EncRuntime | null = null
let currentConfig: StyleConfig = { ...defaultStyleConfig }

map.on('load', () => {
    map.getCanvas().parentElement?.appendChild(renderStats.dom)
    renderStats.dom.style.position = 'absolute'
    renderStats.dom.style.top = '0px'
    renderStats.dom.style.left = 'auto'
    renderStats.dom.style.right = '0px'

    updateMapWithStyle(map, style, currentConfig).then(() => {
        addClickListener(map)
    })
})

map.on('render', () => {
    renderStats.update()
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

// UI Elements
const zoomEl = document.getElementById('zoom') as HTMLSpanElement
const centerEl = document.getElementById('center') as HTMLSpanElement
const cursorPosEl = document.getElementById('cursorPos') as HTMLSpanElement
const cleanBtn = document.getElementById('cleanBtn') as HTMLButtonElement
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
const themeSelector = document.getElementById('themeSelector') as HTMLDivElement
const basemapSelector = document.getElementById('basemapSelector') as HTMLDivElement
const showLandCheckbox = document.getElementById('showLand') as HTMLInputElement
const showTextCheckbox = document.getElementById('showText') as HTMLInputElement

// Theme Selection
themeSelector?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('.theme-btn') as HTMLButtonElement
    if (!btn) return

    const theme = btn.dataset.theme
    if (!theme) return

    themeSelector.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')

    currentConfig.theme = theme as any
    applyStyleConfig()
})

// Basemap Selection
basemapSelector?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('.theme-btn') as HTMLButtonElement
    if (!btn) return

    const basemap = btn.dataset.basemap as 'raster' | 'vector'
    if (!basemap) return

    basemapSelector.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')

    currentConfig.basemap = basemap
    applyStyleConfig()
})

// Display Toggles
showLandCheckbox?.addEventListener('change', () => {
    currentConfig.showLand = showLandCheckbox.checked
    applyStyleConfig()
})

showTextCheckbox?.addEventListener('change', () => {
    currentConfig.showText = showTextCheckbox.checked
    applyStyleConfig()
})

// Button Actions
cleanBtn?.addEventListener('click', () => {
    // @ts-ignore
    encLayer?.tileManager?.cleanCache()
    console.log('Cache cleared')
})

resetBtn?.addEventListener('click', () => {
    map.flyTo({
        center: [-122.5122, 47.522],
        zoom: 15,
        pitch: 49,
        bearing: 0,
        duration: 1500,
    })
})

function applyStyleConfig() {
    const newStyle = generateStyle(currentConfig)
    updateMapWithStyle(map, newStyle, currentConfig).then(() => {
        addClickListener(map)
    })
}

// Map Events
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

map.on('pitchend', () => debouncedSaveMapState(map))
map.on('rotateend', () => debouncedSaveMapState(map))
map.on('click', (e) => console.log('click lng lat', e.lngLat.toString()))

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
