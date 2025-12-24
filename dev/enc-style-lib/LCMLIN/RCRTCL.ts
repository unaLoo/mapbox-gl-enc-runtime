import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_RCRTCL_LINE: LineLayerSpecification = {
	id: 'LCMLIN_RCRTCL_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 108],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 1.2,
	},
}

const lines = [LCMLIN_RCRTCL_LINE]

export default {
	lines,
}
