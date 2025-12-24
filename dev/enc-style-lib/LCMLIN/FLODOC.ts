import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_FLODOC_LINE: LineLayerSpecification = {
	id: 'LCMLIN_FLODOC_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 57],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CSTLN,
		'line-width': 3,
	},
}

const lines = [LCMLIN_FLODOC_LINE]

export default {
	lines,
}
