import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_RUNWAY_LINE: LineLayerSpecification = {
	id: 'LCMLIN_RUNWAY_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 117],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 3,
	},
}

const lines = [LCMLIN_RUNWAY_LINE]

export default {
	lines,
}
