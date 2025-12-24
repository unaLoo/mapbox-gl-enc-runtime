import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_CBLOHD_LINE: LineLayerSpecification = {
	id: 'LCMLIN_CBLOHD_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 21],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 4,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_CBLOHD_LINE]

export default {
	lines,
}
