import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const BUISGL_FILL_0: FillLayerSpecification = {
	id: 'COMARE_BUISGL_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 12],
	layout: {},
	paint: {
		'fill-color': ColorTable.CHBRN,
	},
}

const BUISGL_SYMBOL_0: SymbolLayerSpecification = {
	id: 'COMARE_BUISGL_SYMBOL_0',
	type: 'symbol',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 12],
	layout: {
		'text-field': ['get', 'OBJNAM'],
		'text-allow-overlap': false,
		'text-font': ['Roboto Medium'],
		'text-size': 13,
	},
	paint: {
		'text-color': ColorTable.CHBLK,
	},
}

const BUISGL = {
	fills: [BUISGL_FILL_0],
	lines: [],
	symbols: [BUISGL_SYMBOL_0],
}

export default BUISGL
