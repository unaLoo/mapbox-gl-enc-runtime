import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'

// TIDEWY uses latex.point for text only
const ACMMRK_TIDEWY_TEXT: SymbolLayerSpecification = {
	id: 'ACMMRK_TIDEWY_TEXT',
	type: 'symbol',
	...SOURCE_DESC,
	filter: ['==', ['get', 'OBJL'], 143],
	layout: {
		'text-field': ['get', 'OBJNAM'],
		'text-allow-overlap': false,
		'text-font': ['Roboto Medium'],
		'text-size': 14,
	},
	paint: {
		'text-color': '#1E1E1E',
	},
}

const symbols: SymbolLayerSpecification[] = [ACMMRK_TIDEWY_TEXT]

export default {
	symbols,
}
