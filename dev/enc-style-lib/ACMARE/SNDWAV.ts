import { FillLayerSpecification } from 'mapbox-gl'

const COMARE_SADWAV_FILL_0: FillLayerSpecification = {
	id: 'COMARE_SADWAV_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 118],
	paint: {
		'fill-pattern': 'SNDWAV01',
	},
}

const SADWAV = {
	fills: [COMARE_SADWAV_FILL_0],
	lines: [],
	symbols: [],
}

export default SADWAV
