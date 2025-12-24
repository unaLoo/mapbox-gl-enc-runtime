import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_DOCARE_LINE_0: LineLayerSpecification = {
	id: 'ACMLIN_DOCARE_LINE_0',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 45], ['==', ['get', 'LineType'], 1]],
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
const ACMLIN_DOCARE_LINE_1: LineLayerSpecification = {
	id: 'ACMLIN_DOCARE_LINE_1',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 45], ['==', ['get', 'LineType'], 2]],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 1.2,
	},
}

const lines = [ACMLIN_DOCARE_LINE_0, ACMLIN_DOCARE_LINE_1]

export default {
	lines,
}
