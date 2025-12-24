import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const UNSARE_FILL_0: FillLayerSpecification = {
	id: 'COMARE_UNSARE_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 154],
	paint: {
		'fill-color': ColorTable.RES01,
	},
}
const UNSARE_LINE_0: LineLayerSpecification = {
	id: 'COMARE_UNSARE_LINE_0',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 154],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-width': 2,
		'line-color': ColorTable.CHGRD,
	},
}

const fills: FillLayerSpecification[] = [UNSARE_FILL_0]
const lines: LineLayerSpecification[] = [UNSARE_LINE_0]
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
