import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_SLOTOP_LINE_0: LineLayerSpecification = {
	id: 'LCMLIN_SLOTOP_LINE_0',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 126], ['==', ['get', 'LineType'], 1]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 1.2,
	},
}

const LCMLIN_SLOTOP_LINE_1: LineLayerSpecification = {
	id: 'LCMLIN_SLOTOP_LINE_1',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 126], ['==', ['get', 'LineType'], 2]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 1.2,
	},
}

const LCMLIN_SLOTOP_LINE_2: LineLayerSpecification = {
	id: 'LCMLIN_SLOTOP_LINE_2',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 126], ['==', ['get', 'LineType'], 3]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 1.2,
	},
}

const lines = [LCMLIN_SLOTOP_LINE_0, LCMLIN_SLOTOP_LINE_1, LCMLIN_SLOTOP_LINE_2]

export default {
	lines,
}
