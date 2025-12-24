import { StyleSpecification, FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from './ColorTable'

const DRGARE_FILL_0: FillLayerSpecification = {
	id: 'DRGARE_FILL_0',
	type: 'fill',
	source: 'DRGARE',
	'source-layer': 'area_drgare',
	paint: {
		'fill-color': [
			'case',
			['all', ['<', ['get', 'DRVAL1'], 0], ['<=', ['get', 'DRVAL2'], 0]],
			ColorTable.DEPIT,
			['<=', ['get', 'DRVAL1'], 2],
			ColorTable.DEPVS,
			['<=', ['get', 'DRVAL1'], 5],
			ColorTable.DEPMS,
			['<=', ['get', 'DRVAL1'], 10],
			ColorTable.DEPMD,
			ColorTable.DEPMD,
		],
	},
}

const fills: FillLayerSpecification[] = [DRGARE_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
