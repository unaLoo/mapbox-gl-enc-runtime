import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_DAMCON_LINE: LineLayerSpecification = {
	id: 'LCMLIN_DAMCON_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 38],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 4,
	},
}

const lines = [LCMLIN_DAMCON_LINE]

export default {
	lines,
}
