import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_BRIDGE_LINE: LineLayerSpecification = {
	id: 'LCMLIN_BRIDGE_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 11],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 4,
	},
}

const lines = [LCMLIN_BRIDGE_LINE]

export default {
	lines,
}
