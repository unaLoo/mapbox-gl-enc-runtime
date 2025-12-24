import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable, { ColorTableType } from '../ColorTable'

export function createWRECKSTexts(colors: ColorTableType) {
    const PCMTEX_WRECKS_TEXT_0: SymbolLayerSpecification = {
        id: 'PCMTEX_WRECKS_TEXT_0',
        type: 'symbol',
        ...SOURCE_DESC,
        filter: ['==', ['get', 'OBJL'], 159],
        layout: {
            'text-field': ['get', 'OBJNAM'],
            'text-anchor': 'center',
            'text-offset': [0, 0.2],
            'text-allow-overlap': false,
            'text-font': ['Roboto Medium'],
            'text-size': 12,
        },
        paint: {
            'text-color': colors.CHGRD,
        },
    }

    return { texts: [PCMTEX_WRECKS_TEXT_0] as SymbolLayerSpecification[] }
}

export default createWRECKSTexts(ColorTable)
