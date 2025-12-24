import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const BUAARE_FILL_0: FillLayerSpecification = {
	id: 'COMARE_BUAARE_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 13],
	layout: {},
	paint: {
		'fill-color': ColorTable.CHBRN,
	},
}

const BUAARE_SYMBOL_0: SymbolLayerSpecification = {
	id: 'COMARE_BUAARE_SYMBOL_0',
	type: 'symbol',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 12],
	layout: {
		'text-field': ['get', 'OBJNAM'],
		'text-allow-overlap': false,
		'text-font': ['Roboto Medium'],
		'text-size': 13,
		// position: 5 ?
	},
	paint: {
		'text-color': ColorTable.CHBLK,
	},
}

const fills: FillLayerSpecification[] = [BUAARE_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = [BUAARE_SYMBOL_0]

export default { fills, lines, symbols }
