import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_PONTON_LINE: LineLayerSpecification = {
	id: 'LCMLIN_PONTON_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 95],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CSTLN,
		'line-width': 2,
	},
}

const lines = [LCMLIN_PONTON_LINE]

export default {
	lines,
}
