import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const SBDARE_FILL_0: FillLayerSpecification = {
	id: 'COMARE_SBDARE_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 121], ['==', ['get', 'FillType'], 1]],
	paint: {
		'fill-pattern': 'RCKLDG01',
		'fill-opacity': 1,
	},
}

const SBDARE_SYMBOL_0: SymbolLayerSpecification = {
	id: 'COMARE_SBDARE_SYMBOL_0',
	type: 'symbol',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 121], ['==', ['get', 'FillType'], 2]],
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

const fills: FillLayerSpecification[] = [SBDARE_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = [SBDARE_SYMBOL_0]

export default {
	fills,
	lines,
	symbols,
}
