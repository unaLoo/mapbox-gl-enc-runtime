import { LineLayerSpecification, SymbolLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_NAVLNE_LINE: LineLayerSpecification = {
	id: 'LCMLIN_NAVLNE_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 85],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.SYTRK,
		'line-width': 1.5,
		'line-dasharray': [4, 4],
	},
}

const LCMLIN_NAVLNE_TEXT: SymbolLayerSpecification = {
	id: 'LCMLIN_NAVLNE_TEXT',
	type: 'symbol',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 85],
	layout: {
		'text-field': ['get', 'OBJNAM'],
		'text-allow-overlap': false,
		'text-font': ['Roboto Medium'],
		'text-size': 14,
	},
	paint: {
		'text-color': ColorTable.CHBLK,
	},
}

const lines = [LCMLIN_NAVLNE_LINE]
const symbols = [LCMLIN_NAVLNE_TEXT]

export default {
	lines,
	symbols,
}
