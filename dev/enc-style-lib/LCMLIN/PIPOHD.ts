import { LineLayerSpecification, SymbolLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_PIPOHD_LINE: LineLayerSpecification = {
	id: 'LCMLIN_PIPOHD_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 93],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 3,
	},
}

const LCMLIN_PIPOHD_TEXT: SymbolLayerSpecification = {
	id: 'LCMLIN_PIPOHD_TEXT',
	type: 'symbol',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 93],
	layout: {
		'symbol-placement': 'line',
		'text-field': ['get', 'OBJNAM'],
		'text-allow-overlap': false,
		'text-font': ['Roboto Medium'],
		'text-size': 14,
	},
	paint: {
		'text-color': ColorTable.CHBLK,
	},
}

const lines = [LCMLIN_PIPOHD_LINE]
const symbols = [LCMLIN_PIPOHD_TEXT]

export default {
	lines,
	symbols,
}
