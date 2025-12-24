import { StyleSpecification, FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from './ColorTable'

const LNDARE_FILL_0: FillLayerSpecification = {
    id: 'LNDARE_FILL_0',
    type: 'fill',
    source: 'LNDARE',
    'source-layer': 'LNDARE',
    paint: {
        'fill-color': '#c9b97a',
    },
}

const fills: FillLayerSpecification[] = [LNDARE_FILL_0]
const lines: LineLayerSpecification[] = []
const symbols: SymbolLayerSpecification[] = []

export default {
    fills,
    lines,
    symbols,
}
