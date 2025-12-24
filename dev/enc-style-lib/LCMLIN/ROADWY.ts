import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_ROADWY_LINE: LineLayerSpecification = {
	id: 'LCMLIN_ROADWY_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 116],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 2,
	},
}

const lines = [LCMLIN_ROADWY_LINE]

export default {
	lines,
}
