import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_VEGATN_LINE_0: LineLayerSpecification = {
	id: 'LCMLIN_VEGATN_LINE_0',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 155],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 1.2,
		'line-dasharray': [4, 4],
	},
}

const LCMLIN_VEGATN_LINE_1: LineLayerSpecification = {
	id: 'LCMLIN_VEGATN_LINE_1',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 156],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 1.2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_VEGATN_LINE_0, LCMLIN_VEGATN_LINE_1]

export default {
	lines,
}
