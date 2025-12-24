import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_WATFAL_LINE_0: LineLayerSpecification = {
	id: 'LCMLIN_WATFAL_LINE_0',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 157], ['==', ['get', 'LineType'], 1]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHWHT,
		'line-width': 3,
	},
}

const LCMLIN_WATFAL_LINE_1: LineLayerSpecification = {
	id: 'LCMLIN_WATFAL_LINE_1',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['all', ['==', ['get', 'OBJL'], 157], ['==', ['get', 'LineType'], 2]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRF,
		'line-width': 3,
	},
}

const lines = [LCMLIN_WATFAL_LINE_0, LCMLIN_WATFAL_LINE_1]

export default {
	lines,
}
