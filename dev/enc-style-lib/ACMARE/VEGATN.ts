import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const VEGATN_FILL_0: FillLayerSpecification = {
	id: 'COMARE_VEGATN_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 155],
	paint: {
		'fill-pattern': [
			'case',
			['==', ['get', 'FillType'], 1],
			'VEGATN03',
			['==', ['get', 'FillType'], 2],
			'VEGATN04',
			['==', ['get', 'FillType'], 3],
			'FOULAR01',
			'rgba(0,0,0,0)',
		],
		'fill-opacity': 1,
	},
}

const fills: FillLayerSpecification[] = [VEGATN_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
