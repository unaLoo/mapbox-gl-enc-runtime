import mapboxgl from 'mapbox-gl'
// import { ENCLayer } from '../src/core/ENCLayer'
import EncRuntime from '../src/core/EncRuntime'
// import type { ENCLayerOptions } from '../src/core/ENCLayer'
import addMaputnikLayer from './maputnik'

const TILE_SOURCES = [
	{
		id: 'LNDARE',
		type: 'vector' as const,
		url: 'https://localhost:3000/mbtiles/LNDARE.mbtiles/{z}/{x}/{y}.pbf',
		layers: ['LNDARE'],
		maxzoom: 14,
	},
	{
		id: 'DEPARE',
		type: 'vector' as const,
		url: 'https://localhost:3000/mbtiles/DEPARE.mbtiles/{z}/{x}/{y}.pbf',
		layers: ['DEPARE'],
		maxzoom: 14,
	},
	{
		// id: 'SOUNDG',
		id: 'soundg3d',
		type: 'vector' as const,
		url: 'https://localhost:3000/mbtiles/SOUNDG3D.mbtiles/{z}/{x}/{y}.pbf',
		layers: ['soundg3d'],
		maxzoom: 14,
	},
	// {
	// 	id: 'enc-line-test',
	// 	type: 'vector' as const,
	// 	url: 'https://localhost:3000/mbtiles/area_common_line.mbtiles/{z}/{x}/{y}.pbf',
	// 	layers: ['area_common_line'],
	// 	maxzoom: 14 // 数据源的最大zoom
	// },

	// {
	// 	id: 'enc-point-test',
	// 	type: 'vector' as const,
	// 	url: 'https://localhost:3000/mbtiles/area_common_point.mbtiles/{z}/{x}/{y}.pbf',
	// 	layers: ['area_common_point'],
	// 	maxzoom: 7 // 数据源的最大zoom
	// },
]

const map = new mapboxgl.Map({
	container: 'map',
	center: [-122.5122, 47.522],
	zoom: 8.9,
	style: 'mapbox://styles/mapbox/light-v10',
	accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})

let encLayer: EncRuntime | null = null

map.on('load', () => {
	map.showTileBoundaries = true
	// addMaputnikLayer(map)
	const layerOptions = {
		tileSources: TILE_SOURCES,
		// id: 'enc-chart',
		// context: {
		// 	displayMode: 'standard',
		// 	environment: 'day',
		// 	safetyDepth: {
		// 		depth: 20,
		// 		shallowContour: 10,
		// 		deepContour: 30,
		// 	},
		// },
		// rules: [],
		// debug: true,
	}

	encLayer = new EncRuntime(layerOptions)
	map.addLayer(encLayer)

	// 挂载 DOM 事件
	setupControls()
})

const zoom = document.getElementById('zoom') as HTMLSpanElement
const center = document.getElementById('center') as HTMLSpanElement
const cleanBtn = document.getElementById('cleanBtn') as HTMLButtonElement
cleanBtn.addEventListener('click', () => {
	encLayer?.tileManager?.cleanCache()
})
map.on('move', (_) => {
	zoom.textContent = map.getZoom().toFixed(4)
	center.textContent = `[${map.getCenter().lng.toFixed(2)}, ${map.getCenter().lat.toFixed(2)}]`
})

// ==================== 设置控制面板 ====================
function setupControls() {
	const updateBtn = document.getElementById('updateBtn') as HTMLButtonElement
	if (!encLayer) return
	// const runtime = encLayer
	updateBtn.addEventListener('click', () => {
		console.log('not implemented')
		// 触发地图重绘
		map.triggerRepaint()
	})
}
