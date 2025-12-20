import mapboxgl, { Popup } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import EncRuntime from '../src/core/EncRuntime'
import WaterLayer from './3dLayers/waterLayer'
import modelLayer from './3dLayers/modelLayer'
import cubeLayer from './3dLayers/cubeLayer'
import { ThreeMapLayer } from './3dLayers/ThreeMapLayer'
import * as THREE from 'three'
// import type { ENCLayerOptions } from '../src/core/ENCLayer'
import addMaputnikLayer from './maputnik'
import addTestLayer from './testStyle'
import { addCustomWater } from './3dLayers/customWaterLayer'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js'

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
	accessToken: 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg',
})

let encLayer: EncRuntime | null = null

map.on('load', () => {
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

	// model layer with water
	// map.addLayer(modelLayer as mapboxgl.AnyLayer)
	// map.addLayer(cubeLayer as mapboxgl.AnyLayer)



	// // three map layer
	const threeLayer = new ThreeMapLayer()
	map.addLayer(threeLayer)

	const anchor = [-122.5122, 47.522] as [number, number];
	threeLayer.setAnchor(anchor);
	// new mapboxgl.Popup().setText('scene-anchor').setLngLat(anchor).addTo(map)

	// test: add a cube 
	const addOneCube = (lnglat: [number, number]) => {
		// 在 addLayer 之后立即测试
		const debugCenter = lnglat;

		// 创建一个 100米 x 100米 x 100米 的红色盒子
		const geometry = new THREE.BoxGeometry(50, 50, 50);
		const material = new THREE.MeshBasicMaterial({ color: 0xf00000 });
		const cube = new THREE.Mesh(geometry, material);

		const posRelativeToAnchor = threeLayer.projectToScene(debugCenter, 15);
		cube.position.copy(posRelativeToAnchor)
		threeLayer.addToScene('debug-box', cube);
	}

	// test: add a glb
	const addOneGlb = () => {
		const loader = new GLTFLoader()
		loader.load(staticServer + '/models/test.glb', (gltf) => {
			const model = gltf.scene
			model.position.set(0, 0, 0) // 就在 anchor 上
			model.scale.set(100, 100, 100)
			threeLayer.addToScene('center-floating', model)
		})
	}

	// test: add water 
	const addOneWater = (lnglat: [number, number]) => {
		const layer = threeLayer
		const scene = layer.scene;
		// const renderer = layer.renderer!;

		const waterAnchor = lnglat as [number, number];
		const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

		// new mapboxgl.Popup().setText('waterAnchor').setLngLat(waterAnchor).addTo(map)

		const water = new Water(
			waterGeometry,
			{
				textureWidth: 1024,
				textureHeight: 1024,
				waterNormals: new THREE.TextureLoader().load(
					'http://localhost:8081/texture/WaterNormal1.png', // 确保你有这张图
					function (texture) {
						texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
					}
				),
				distortionScale: 3.7,
				fog: scene.fog !== undefined,
				// sunDirection: new THREE.Vector3(0, 2, 3).normalize(),
				// sunColor: 0xffffff,
				// waterColor: 0xffffff,
				// alpha: 0.8,
				side: THREE.DoubleSide
			}
		);

		const waterPos = layer.projectToScene(waterAnchor, 0);
		water.position.copy(waterPos);
		water.rotation.x = -Math.PI / 2;
		water.material.transparent = true;
		water.renderOrder = 1;

		layer.addToScene('ocean-water', water);

		layer.animatedObjects.push(water);

		// const cubeGeo = new THREE.BoxGeometry(50, 50, 50);
		// const cubeMat = new THREE.MeshStandardMaterial({
		// 	roughness: 0, // 0 粗糙度 = 镜面反射
		// 	metalness: 1
		// });
		// const cube = new THREE.Mesh(cubeGeo, cubeMat);

		// const cubePos = waterPos.clone();
		// cubePos.y += 0;
		// cube.position.copy(cubePos);

		// layer.addToScene('reflection-test-cube', cube);
	};


	addCustomWater(threeLayer, anchor)
	addOneGlb()
	// addOneWater(anchor)
	// addOneCube([anchor[0], anchor[1] + 0.01])
})

function addClickListener(map: mapboxgl.Map) {
	const layers = Object.keys(map.style._layers)
	console.log(layers)
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
