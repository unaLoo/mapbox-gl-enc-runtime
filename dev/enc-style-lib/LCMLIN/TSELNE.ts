import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_TSELNE_LINE: LineLayerSpecification = {
	id: 'LCMLIN_TSELNE_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 145],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.TRFCF,
		'line-width': 6,
	},
}

const lines = [LCMLIN_TSELNE_LINE]

export default {
	lines,
}
