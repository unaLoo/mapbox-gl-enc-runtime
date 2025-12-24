import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_OILBAR_LINE: LineLayerSpecification = {
	id: 'LCMLIN_OILBAR_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 89],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 1.2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_OILBAR_LINE]

export default {
	lines,
}
