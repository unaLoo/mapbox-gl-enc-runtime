import { SymbolLayerSpecification, FillLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const SEAARE_SYMBOL_0: SymbolLayerSpecification = {
	id: 'COMARE_SEAARE_SYMBOL_0',
	type: 'symbol',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 119],
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

const fills: FillLayerSpecification[] = []
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = [SEAARE_SYMBOL_0]

export default {
	fills,
	lines,
	symbols,
}
