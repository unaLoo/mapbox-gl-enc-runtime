export default function addMaputnikLayer(map: mapboxgl.Map) {
	const sources = {
		DEPARE: {
			type: 'vector',
			url: 'https://localhost:3000/mbtiles/DEPARE.mbtiles/tilejson.json',
		},
		LNDARE: {
			type: 'vector',
			url: 'https://localhost:3000/mbtiles/LNDARE.mbtiles/tilejson.json',
		},
		area_common_line: {
			type: 'vector',
			url: 'https://localhost:3000/mbtiles/area_common_line.mbtiles/tilejson.json',
		},
		SOUNDG: {
			"type": "vector",
			"url": "https://localhost:3000/mbtiles/r15.mbtiles/tilejson.json"
		}
	}

	for (const [key, value] of Object.entries(sources)) {
		map.addSource(key, value as unknown as mapboxgl.AnySourceData)
	}

	const layers = [
		{
			id: 'DEPARE_FILL',
			type: 'fill',
			source: 'DEPARE',
			'source-layer': 'DEPARE',
			layout: {
				visibility: 'visible',
			},
			paint: {
				'fill-color': [
					'case',
					['all', ['<', ['get', 'DRVAL1'], 0], ['<=', ['get', 'DRVAL2'], 0]],
					'#83B295',
					['<=', ['get', 'DRVAL1'], 2],
					'#73B6EF',
					['<=', ['get', 'DRVAL1'], 5],
					'#98C5F2',
					['<=', ['get', 'DRVAL1'], 10],
					'#BAD5E1',
					'#D4EAEE',
				],
				'fill-opacity': 1,
			},
		},
		{
			id: 'LNDARE_FILL',
			type: 'fill',
			source: 'LNDARE',
			'source-layer': 'LNDARE',
			layout: {
				visibility: 'visible',
			},
			paint: {
				'fill-color': '#c9b97a',
				'fill-opacity': 1,
			},
		},
		{
			"id": "SOUNDG_TEXT",
			"type": "symbol",
			"source": "SOUNDG",
			"source-layer": "soundg3d",
			"layout": {
				"text-field": ["get", "VAL"],
				"text-font": [
					"Roboto Regular"
				],
				"icon-rotation-alignment": "map"
			},
			"paint": {
				"text-color": "rgba(139, 139, 139, 1)",
				"text-halo-color": "rgba(0, 0, 0, 1)"
			}
		}
	]

	for (const layer of layers) {
		map.addLayer(layer as mapboxgl.AnyLayer)
	}
}
