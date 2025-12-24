import { FillLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const COMARE_ICEARE_FILL_0: FillLayerSpecification = {
	id: 'COMARE_ICEARE_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 66],
	paint: {
		'fill-color': ColorTable.NODTA,
	},
}
const COMARE_ICEARE_FILL_1: FillLayerSpecification = {
	id: 'COMARE_ICEARE_FILL_1',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 66],
	paint: {
		'fill-pattern': 'ICEARE04',
		'fill-opacity': 1,
	},
}

const ICEARE = {
	fills: [COMARE_ICEARE_FILL_0, COMARE_ICEARE_FILL_1],
	lines: [],
	symbols: [],
}

export default ICEARE
