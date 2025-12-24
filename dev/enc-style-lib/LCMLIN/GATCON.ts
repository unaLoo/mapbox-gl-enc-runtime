import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_GATCON_LINE: LineLayerSpecification = {
	id: 'LCMLIN_GATCON_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 61],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CSTLN,
		'line-width': 2,
	},
}

const lines = [LCMLIN_GATCON_LINE]

export default {
	lines,
}
