import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_RAILWY_LINE: LineLayerSpecification = {
	id: 'LCMLIN_RAILWY_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 106],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 2,
	},
}

const lines = [LCMLIN_RAILWY_LINE]

export default {
	lines,
}
