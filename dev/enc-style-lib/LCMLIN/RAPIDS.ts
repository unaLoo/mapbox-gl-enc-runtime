import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_RAPIDS_LINE: LineLayerSpecification = {
	id: 'LCMLIN_RAPIDS_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 107],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 3,
	},
}

const lines = [LCMLIN_RAPIDS_LINE]

export default {
	lines,
}
