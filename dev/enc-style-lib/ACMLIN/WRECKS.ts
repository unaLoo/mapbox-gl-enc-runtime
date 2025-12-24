import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_WRECKS_LINE_0: LineLayerSpecification = {
	id: 'ACMLIN_WRECKS_LINE_0',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 159], ['match', ['get', 'LineType'], [1, 3, 6], true, false]], // dash ...
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': [
			'case',
			['==', ['get', 'LineType'], 6],
			ColorTable.CSTLN,
			ColorTable.CHBLK, // LineType == 1,3
		],
		'line-width': [
			'case',
			['==', ['get', 'LineType'], 1],
			1,
			2, // LineType == 3, 6
		],
		'line-dasharray': [4, 4],
	},
}
const ACMLIN_WRECKS_LINE_1: LineLayerSpecification = {
	id: 'ACMLIN_WRECKS_LINE_1',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 159], ['match', ['get', 'LineType'], [5], true, false]], // solid ...
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-width': 2,
		'line-color': ColorTable.CSTLN,
	},
}
const ACMLIN_WRECKS_LINE_2: LineLayerSpecification = {
	id: 'ACMLIN_WRECKS_LINE_2',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 86], ['match', ['get', 'LineType'], [2, 4], true, false]], // dot...
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-width': 2,
		'line-color': [
			'case',
			['==', ['get', 'LineType'], 2],
			ColorTable.CHBLK,
			ColorTable.CSTLN, // LineType == 4
		],
		'line-dasharray': [0, 2, 2, 2], // like:   --    --   --
	},
}

const lines = [ACMLIN_WRECKS_LINE_0, ACMLIN_WRECKS_LINE_1, ACMLIN_WRECKS_LINE_2]

export default {
	lines,
}
