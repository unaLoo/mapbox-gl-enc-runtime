import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_LAKSHR_LINE: LineLayerSpecification = {
	id: 'LCMLIN_LAKSHR_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 70],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CSTLN,
		'line-width': 1.2,
	},
}

const lines = [LCMLIN_LAKSHR_LINE]

export default {
	lines,
}
