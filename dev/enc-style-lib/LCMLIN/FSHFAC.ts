import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_FSHFAC_LINE_0: LineLayerSpecification = {
	id: 'LCMLIN_FSHFAC_LINE_0',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 55], ['==', ['get', 'LineType'], 1]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 1.2,
		'line-dasharray': [4, 4],
	},
}

const LCMLIN_FSHFAC_LINE_1: LineLayerSpecification = {
	id: 'LCMLIN_FSHFAC_LINE_1',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 55], ['==', ['get', 'LineType'], 2]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_FSHFAC_LINE_0, LCMLIN_FSHFAC_LINE_1]

export default {
	lines,
}
