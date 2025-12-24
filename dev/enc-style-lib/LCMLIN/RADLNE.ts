import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_RADLNE_LINE: LineLayerSpecification = {
	id: 'LCMLIN_RADLNE_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 99],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.TRFCD,
		'line-width': 2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_RADLNE_LINE]

export default {
	lines,
}
