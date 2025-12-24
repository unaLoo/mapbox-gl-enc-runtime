import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_TIDEWY_LINE: LineLayerSpecification = {
	id: 'LCMLIN_TIDEWY_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 143],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRF,
		'line-width': 1.2,
	},
}

const lines = [LCMLIN_TIDEWY_LINE]

export default {
	lines,
}
