import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LNDRGN_FILL_0: FillLayerSpecification = {
    id: 'COMARE_LNDRGN_FILL_0',
    type: 'fill',
    source: 'AREA_COMMON_AREA',
    'source-layer': 'area_common_polygon',
    filter: ['all', ['==', ['get', 'OBJL'], 73], ['==', ['get', 'FillType'], 1]],
    paint: {
        'fill-pattern': 'MARSHES1P',
        'fill-opacity': 1,
    },
}

const LNDRGN_SYMBOL_0: SymbolLayerSpecification = {
    id: 'COMARE_LNDRGN_SYMBOL_0',
    type: 'symbol',
    source: 'AREA_COMMON_AREA',
    'source-layer': 'area_common_polygon',
    filter: ['all', ['==', ['get', 'OBJL'], 73], ['==', ['get', 'FillType'], 2]],
    layout: {
        'text-field': ['get', 'OBJNAM'],
        'text-allow-overlap': true,
        'text-font': ['Roboto Medium'],
        'text-size': 13,
    },
    paint: {
        'text-color': ColorTable.CHBLK,
    },
}

const fills: FillLayerSpecification[] = [LNDRGN_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = [LNDRGN_SYMBOL_0]

export default {
    fills,
    lines,
    symbols,
}
