import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_MARCUL_LINE: LineLayerSpecification = {
	id: 'LCMLIN_MARCUL_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 82],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRF,
		'line-width': 2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_MARCUL_LINE]

export default {
	lines,
}
