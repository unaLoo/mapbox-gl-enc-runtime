import mapboxgl, { Popup } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import EncRuntime from '../src/core/EncRuntime'
import addTestLayer from './testStyle'

import { ThreeMapLayer } from './3d/ThreeMapLayer'
import { addGLTF } from './3d/addGLTF'
import { addWater } from './3d/addWater'
import SunCalc from 'suncalc'


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
		url: 'https://localhost:3000/mbtiles/r15.mbtiles/{z}/{x}/{y}.pbf',
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
const staticServer = 'http://localhost:8081'

const map = new mapboxgl.Map({
	container: 'map',
	center: [-122.5122, 47.522],
	pitch: 49,
	zoom: 15,
	// style: {
	// 	version: 8,
	// 	sources: {},
	// 	layers: [],
	// 	glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
	// 	sprite: staticServer + '/sprite/rastersymbols-day',
	// },
	style: "mapbox://styles/mapbox/satellite-v9",
	// style: "mapbox://styles/mapbox/dark-v10",
	accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})

let encLayer: EncRuntime | null = null

map.on('load', () => {

	map.addLayer({
		'id': 'sky-layer',
		'type': 'sky',
		'paint': {
			'sky-opacity': [
				'interpolate',
				['linear'],
				['zoom'],
				0,
				0,
				5,
				0.3,
				8,
				1
			],
			'sky-type': 'atmosphere',
			'sky-atmosphere-sun': [90, 90],
			'sky-atmosphere-sun-intensity': 20
		}
	});

	// // three map layer
	const threeLayer = new ThreeMapLayer()
	map.addLayer(threeLayer)

	const anchor = [-122.5122, 47.522] as [number, number];
	threeLayer.setAnchor(anchor);
	// new mapboxgl.Popup().setText('scene-anchor').setLngLat(anchor).addTo(map)

	addGLTF(threeLayer, 'test', staticServer + '/models/test.glb', anchor, 0)
	addWater(threeLayer, anchor)
	// new mapboxgl.Popup().setText('scene-anchor').setLngLat([-122.5122, 47.5]).addTo(map)


	// test local tile server
	// map.addSource('terrainRGB', {
	// 	type: 'raster',
	// 	url: 'https://localhost:3000/terrain/1.mbtiles/tilejson.json'
	// })
	// map.addLayer({
	// 	id: 'terrain-rgb-test',
	// 	type: 'raster',
	// 	source: 'terrainRGB',
	// });

	// // test terrain rgb
	// map.addSource('terrain', {
	// 	type: 'raster-dem',
	// 	url: 'https://localhost:3000/terrain/1.mbtiles/tilejson.json'
	// })
	// map.setTerrain({
	// 	source: 'terrain',
	// 	exaggeration: 3
	// })



	// map.showTileBoundaries = true
	// addMaputnikLayer(map)
	// addTestLayer(map).then(() => {
	// 	const layerOptions = {
	// 		tileSources: TILE_SOURCES,
	// 		// id: 'enc-chart',
	// 		// context: {
	// 		// 	displayMode: 'standard',
	// 		// 	environment: 'day',
	// 		// 	safetyDepth: {
	// 		// 		depth: 20,
	// 		// 		shallowContour: 10,
	// 		// 		deepContour: 30,
	// 		// 	},
	// 		// },
	// 		// rules: [],
	// 		// debug: true,
	// 	}
	// 	encLayer = new EncRuntime(layerOptions)
	// 	// map.addLayer(encLayer)

	// 	// Event
	// 	addClickListener(map)

	// 	// 挂载 DOM 事件
	// 	setupControls()

	// 	// map.addLayer(new WaterLayer("http://127.0.0.1:8081/temp.geojson", staticServer + "/texture/WaterNormal1.png"))

	// })



	// map.addSource('water-geojson', {
	// 	type: 'geojson',
	// 	data: "http://127.0.0.1:8081/test.geojson"
	// })
	// map.addLayer({
	// 	id: 'water-polygons',
	// 	type: 'fill',
	// 	source: 'water-geojson',
	// 	paint: {
	// 		'fill-color': '#ff0000',
	// 		'fill-opacity': 0.3,
	// 	}
	// });

})

function addClickListener(map: mapboxgl.Map) {
	const layers = Object.keys(map.style._layers)
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
				layer: item.layer,
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
map.on('move', (_) => {
	zoom.textContent = map.getZoom().toFixed(4)
	center.textContent = `[${map.getCenter().lng.toFixed(2)}, ${map.getCenter().lat.toFixed(2)}]`
})
map.on('click', (e) => {
	// console.log(e.lngLat.toString())
	window.alert(e.lngLat.toString())
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

let curDate = new Date()
const ipt = document.querySelector('#ipt') as HTMLInputElement
ipt.oninput = (e) => {
	const hours = Number(ipt.value)
	const date = new Date(curDate.getTime() + hours * 60 * 60 * 1000)
	const anchor = [-122.5122, 47.522] as [number, number]

	const res = updateSunPosition(map, date, anchor, 'sky-layer')
	console.log(res)
}
function updateSunPosition(
	map: mapboxgl.Map,
	time: Date,
	[latitude, longitude]: [number, number],
	skyLayerId = "dynamic-sky") {

	// 1. 计算 SunCalc (弧度)
	const sunPosition = SunCalc.getPosition(time, latitude, longitude);

	// 2. 转换方位角 (Azimuth)
	// SunCalc: 0=南, 顺时针
	// Mapbox: 0=北, 顺时针
	// 转换: +180度
	const azimuth = (sunPosition.azimuth * 180 / Math.PI) + 180;

	// 3. 转换高度角 (Altitude) 为 Mapbox 极角 (Polar Angle)
	// SunCalc: 90=头顶, 0=地平线, -90=脚底
	// Mapbox: 0=头顶, 90=地平线, 180=脚底 (范围必须是 0-180)
	const altitudeDegrees = sunPosition.altitude * 180 / Math.PI;
	const mapboxPolarAngle = 90 - altitudeDegrees;

	// 4. 更新属性
	// 这里传入的是 [方位角, 极角]
	map.setPaintProperty(skyLayerId, 'sky-atmosphere-sun', [azimuth, mapboxPolarAngle]);

	// 5. 强度计算 (继续使用原始的高度角来计算强度，逻辑更直观)
	// 简单的平滑逻辑：高度角 < 0 则暗，> 0 则亮
	const sunIntensity = Math.max(
		0.1, // 最小强度 (夜晚)
		Math.max(0, Math.sin(sunPosition.altitude)) * 15.0 // 最大强度 (白天)
	);

	map.setPaintProperty(skyLayerId, 'sky-atmosphere-sun-intensity', sunIntensity);
	return {
		time: time.toISOString(),
		azimuth: azimuth,
		altitude: altitudeDegrees, // 调试时还是看高度角比较符合直觉
		mapboxPolar: mapboxPolarAngle, // 实际传给 Mapbox 的值
		intensity: sunIntensity
	};
}