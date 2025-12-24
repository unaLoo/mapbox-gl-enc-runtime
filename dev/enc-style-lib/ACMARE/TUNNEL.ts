import { SymbolLayerSpecification, FillLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const TUNNEL_FILL_0: FillLayerSpecification = {
	id: 'COMARE_TUNNEL_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 151], ['==', ['get', 'FillType'], 4]],
	layout: {},
	paint: {
		'fill-color': ColorTable.DEPVS,
	},
}

const fills: FillLayerSpecification[] = [TUNNEL_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
