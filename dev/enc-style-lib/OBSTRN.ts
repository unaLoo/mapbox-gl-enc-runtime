import { StyleSpecification, FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from './ColorTable'

const OBSTRN_FILL_0: FillLayerSpecification = {
	id: 'OBSTRN_FILL_0',
	type: 'fill',
	source: 'OBSTRN',
	'source-layer': 'area_obstrn',
	filter: ['==', ['get', 'FILLTYPE'], 1],
	paint: {
		'fill-pattern': 'FOULAR01',
	},
}
const OBSTRN_FILL_1: FillLayerSpecification = {
	id: 'OBSTRN_FILL_1',
	type: 'fill',
	source: 'OBSTRN',
	'source-layer': 'area_obstrn',
	filter: ['match', ['get', 'FILLTYPE'], [2, 3, 4], true, false],
	paint: {
		'fill-color': [
			'case',
			['==', ['get', 'FILLTYPE'], 2],
			ColorTable.DEPVS,
			['==', ['get', 'FILLTYPE'], 3],
			ColorTable.CHBRN,
			['==', ['get', 'FILLTYPE'], 4],
			ColorTable.DEPIT,
			'rgba(0,0,0,0)',
		],
	},
}

const fills: FillLayerSpecification[] = [OBSTRN_FILL_0, OBSTRN_FILL_1]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
