import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const MARCUL_FILL_0: FillLayerSpecification = {
	id: 'COMARE_MARCUL_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 82],
	paint: {
		'fill-pattern': 'fish_area1',
		'fill-opacity': 1,
	},
}

const fills: FillLayerSpecification[] = [MARCUL_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
