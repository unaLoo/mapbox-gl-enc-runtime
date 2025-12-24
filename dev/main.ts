import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import EncRuntime from '../src/core/EncRuntime'
import addTestLayer from './archive/testStyle'

import myStyle, { generateStyle, updateMapWithStyle } from './enc-style-lib/index'
import { StyleConfig, defaultStyleConfig, getAvailableThemes } from './enc-style-lib/StyleConfig'
import Stats from 'three/addons/libs/stats.module.js'

import LIGHTSLAYER from './enc-style-lib/LIGHTS'
import defaultColorTable from './enc-style-lib/ColorTable'
import style from './enc-style-lib/index'

const staticServer = 'http://localhost:8081'
const renderStats = new Stats()

//#region Map State Management

// 保存和恢复地图状态
interface MapState {
    zoom: number
    pitch: number
    center: [number, number]
    bearing?: number
}

let saveStateTimer: NodeJS.Timeout | null = null


// 获取初始地图状态
const initialState = getMapStateFromUrl() || getMapStateFromLocalStorage() || {
    zoom: 15,
    pitch: 49,
    center: [-122.5122, 47.522] as [number, number],
    bearing: 0,
}

//#endregion

const map = new mapboxgl.Map({
    container: 'map',
    center: initialState.center,
    pitch: initialState.pitch,
    zoom: initialState.zoom,
    bearing: initialState.bearing || 0,
    style: {
        version: 8,
        sources: {},
        layers: [],
        glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
        sprite: staticServer + '/sprite/rastersymbols-day',
    },
    // style: 'mapbox://styles/mapbox/satellite-v9',
    // style: "mapbox://styles/mapbox/dark-v10",
    accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})

let encLayer: EncRuntime | null = null

map.on('load', () => {

    map.getCanvas().parentElement?.appendChild(renderStats.dom)

    updateMapWithStyle(map, style, currentConfig).then(() => {
        addClickListener(map)
    })


})

map.on('render', () => {
    renderStats.update()
})

function addClickListener(map: mapboxgl.Map) {
    const layers = Object.keys(map.style!._layers)
    console.log('layer count:', layers)
    map.on('click', (e) => {
        // console.log(e.features?.map(item => {
        // 	const { layer, properties } = item
        // 	return { layer, properties }
        // }))
        const bbox = [
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5],
        ] as any
        // Find features intersecting the bounding box.
        const selectedFeatures = map.queryRenderedFeatures(bbox, {
            layers: layers,
        })
        console.log(
            selectedFeatures.map((item) => ({
                layer: item.layer!.id,
                properties: item.properties,
            })),
        )
    })
}

const zoom = document.getElementById('zoom') as HTMLSpanElement
const center = document.getElementById('center') as HTMLSpanElement
const cleanBtn = document.getElementById('cleanBtn') as HTMLButtonElement
cleanBtn.addEventListener('click', () => {
    // @ts-ignore
    encLayer?.tileManager?.cleanCache()
})

// 样式配置状态
let currentConfig: StyleConfig = { ...defaultStyleConfig }

// 主题切换
const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement
if (themeSelect) {

    getAvailableThemes().forEach(theme => {
        const option = document.createElement('option')
        option.value = theme
        option.textContent = theme.replace(/_/g, ' ')
        option.selected = theme === currentConfig.theme
        themeSelect.appendChild(option)
    })
    themeSelect.addEventListener('change', () => {
        console.log('1')
        currentConfig.theme = themeSelect.value as any
        applyStyleConfig()
    })
}

// 应用样式配置
function applyStyleConfig() {
    const newStyle = generateStyle(currentConfig)
    updateMapWithStyle(map, newStyle, currentConfig).then(() => {
        addClickListener(map)
    })
}
map.on('move', (_) => {
    zoom.textContent = map.getZoom().toFixed(4)
    center.textContent = `[${map.getCenter().lng.toFixed(2)}, ${map.getCenter().lat.toFixed(2)}]`
    debouncedSaveMapState(map)
})
map.on('pitchend', () => {
    debouncedSaveMapState(map)
})
map.on('rotateend', () => {
    debouncedSaveMapState(map)
})
map.on('click', (e) => {
    console.log('click lng lat', e.lngLat.toString())
})


function debouncedSaveMapState(map: mapboxgl.Map, delay = 500) {
    if (saveStateTimer) {
        clearTimeout(saveStateTimer)
    }
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
            if (isNaN(lng) || isNaN(lat)) {
                console.warn('Invalid center coordinates in URL')
                return null
            }
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

    // 保存到 localStorage
    try {
        localStorage.setItem('mapState', JSON.stringify(state))
    } catch (e) {
        console.warn('Failed to save map state to localStorage:', e)
    }

    // 更新 URL (使用 replaceState 避免创建历史记录)
    const params = new URLSearchParams()
    params.set('zoom', state.zoom.toFixed(4))
    params.set('pitch', state.pitch.toFixed(2))
    params.set('center', `${state.center[0].toFixed(4)},${state.center[1].toFixed(4)}`)
    if (state.bearing) {
        params.set('bearing', state.bearing.toFixed(2))
    }
    try {
        window.history.replaceState({}, '', `?${params.toString()}`)
    } catch (e) {
        console.warn('Failed to update URL:', e)
    }
}