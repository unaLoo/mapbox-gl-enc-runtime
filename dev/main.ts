import mapboxgl from 'mapbox-gl'
import { ENCLayer } from '../src/core/ENCLayer'
import type { ENCLayerOptions } from '../src/core/ENCLayer'

const TILE_SOURCES = [
	{
		id: 'enc-area-test',
		type: 'vector' as const,
		url: 'https://localhost:3000/mbtiles/LNDARE.mbtiles/{z}/{x}/{y}.pbf',
		layers: ['LNDARE'],
		maxzoom: 14
	},
	{
		id: 'enc-line-test',
		type: 'vector' as const,
		url: 'https://localhost:3000/mbtiles/area_common_line.mbtiles/{z}/{x}/{y}.pbf',
		layers: ['area_common_line'],
		maxzoom: 14 // 数据源的最大zoom
	},
	// {
	// 	id: 'enc-point-test',
	// 	type: 'vector' as const,
	// 	url: 'https://localhost:3000/mbtiles/point_soundg.mbtiles/{z}/{x}/{y}.pbf',
	// 	layers: ['point_soundg'],
	// 	maxzoom: 14 // 数据源的最大zoom
	// },
]

const map = new mapboxgl.Map({
	container: 'map',
	center: [-122.5122, 47.522],
	zoom: 8.9,
	style: 'mapbox://styles/mapbox/light-v10',
	accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})

let encLayer: ENCLayer | null = null

map.on('load', () => {
	map.showTileBoundaries = true
	const layerOptions: ENCLayerOptions = {
		id: 'enc-chart',
		context: {
			displayMode: 'standard',
			environment: 'day',
			safetyDepth: {
				depth: 20,
				shallowContour: 10,
				deepContour: 30,
			},
		},
		tileSources: TILE_SOURCES,
		rules: [],
		debug: true,
	}

	encLayer = new ENCLayer(layerOptions)
	map.addLayer(encLayer)

	// const tileManager = encLayer.getTileManager();
	// if (tileManager) {
	// 	console.log('tileSouces Count:', tileManager.tileSouces.size);
	// }

	// 挂载 DOM 事件
	setupControls()
})

const zoom = document.getElementById('zoom') as HTMLSpanElement
const center = document.getElementById('center') as HTMLSpanElement
const cleanBtn = document.getElementById('cleanBtn') as HTMLButtonElement
cleanBtn.addEventListener('click', () => {
	encLayer?.getTileManager()?.cleanCache()
})
map.on('move', (_) => {
	zoom.textContent = map.getZoom().toFixed(4)
	center.textContent = `[${map.getCenter().lng.toFixed(2)}, ${map.getCenter().lat.toFixed(2)}]`
})

// ==================== 设置控制面板 ====================
function setupControls() {
	const displayModeSelect = document.getElementById('displayMode') as HTMLSelectElement
	const environmentSelect = document.getElementById('environment') as HTMLSelectElement
	const safetyDepthInput = document.getElementById('safetyDepth') as HTMLInputElement
	const updateBtn = document.getElementById('updateBtn') as HTMLButtonElement

	if (!encLayer) return

	const runtime = encLayer.getRuntime()
	const contextManager = runtime.getContextManager()

	updateBtn.addEventListener('click', () => {
		// 更新显示模式
		contextManager.setDisplayMode(displayModeSelect.value as 'base' | 'standard' | 'all')

		// 更新环境模式
		contextManager.setEnvironment(environmentSelect.value as 'day' | 'dusk' | 'night')

		// 更新安全深度
		const depth = parseFloat(safetyDepthInput.value)
		if (!isNaN(depth)) {
			contextManager.setSafetyDepth({ depth })
			console.log('✅ 安全深度已更新为:', depth, '米')
		}

		// 触发地图重绘
		map.triggerRepaint()
	})

	// 初始值同步
	const context = contextManager.getContext()
	displayModeSelect.value = context.displayMode
	environmentSelect.value = context.environment
	safetyDepthInput.value = context.safetyDepth.depth.toString()
}

console.log('🚀 DEV MODE START')
