import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_CONVYR_LINE_0: LineLayerSpecification = {
	id: 'LCMLIN_CONVYR_LINE_0',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 34], ['==', ['get', 'LineType'], 1]],
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

const LCMLIN_CONVYR_LINE_1: LineLayerSpecification = {
	id: 'LCMLIN_CONVYR_LINE_1',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 34], ['==', ['get', 'LineType'], 2]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 3,
	},
}

const lines = [LCMLIN_CONVYR_LINE_0, LCMLIN_CONVYR_LINE_1]

export default {
	lines,
}
