import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_FORSTC_LINE: LineLayerSpecification = {
	id: 'LCMLIN_FORSTC_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 59],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 3,
	},
}

const lines = [LCMLIN_FORSTC_LINE]

export default {
	lines,
}
