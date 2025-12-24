import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const SLCONS_FILL_0: FillLayerSpecification = {
	id: 'COMARE_SLCONS_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['all', ['==', ['get', 'OBJL'], 122], ['==', ['get', 'FillType'], 1]],
	paint: {
		'fill-color': 'rgba(255,177,145,0.22)',
	},
}

// style="color:[255,177,145,57];fill_style:3;"
// const SLCONS_FILL_0: FillLayerSpecification = {
//     id: 'COMARE_SLCONS_FILL_0',
//     type: 'fill',
//     source: 'AREA_COMMON_AREA',
//     'source-layer': 'area_common_polygon',
//     filter: ['all', ['==', ['get', 'OBJL'], 122], ['==', ['get', 'FillType'], 1]],
//     paint: {
//         'fill-pattern': 'RCKLDG01',
//         'fill-opacity': 1,
//     },
// }

const fills: FillLayerSpecification[] = [SLCONS_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
	fills,
	lines,
	symbols,
}
