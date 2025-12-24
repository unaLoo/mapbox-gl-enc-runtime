import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_DYKCON_LINE_0: LineLayerSpecification = {
	id: 'LCMLIN_DYKCON_LINE_0',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 49], ['==', ['get', 'LineType'], 1]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 2,
	},
}

const LCMLIN_DYKCON_LINE_1: LineLayerSpecification = {
	id: 'LCMLIN_DYKCON_LINE_1',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 49], ['==', ['get', 'LineType'], 2]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 3,
	},
}

const lines = [LCMLIN_DYKCON_LINE_0, LCMLIN_DYKCON_LINE_1]

export default {
	lines,
}
