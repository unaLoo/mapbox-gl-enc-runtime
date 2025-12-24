import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable, { ColorTableType } from '../ColorTable'

export function createOBSTRNTexts(colors: ColorTableType) {
    const PCMTEX_OBSTRN_TEXT_0: SymbolLayerSpecification = {
        id: 'PCMTEX_OBSTRN_TEXT_0',
        type: 'symbol',
        ...SOURCE_DESC,
        filter: ['==', ['get', 'OBJL'], 86],
        minzoom: 11,
        layout: {
            'text-field': ['get', 'OBJNAM'],
            'text-anchor': 'center',
            'text-offset': [0, 0.2],
            'text-allow-overlap': true,
            'text-font': ['Roboto Medium'],
            'text-size': 12,
        },
        paint: {
            'text-color': colors.CHGRD,
        },
    }

    return { texts: [PCMTEX_OBSTRN_TEXT_0] as SymbolLayerSpecification[] }
}

export default createOBSTRNTexts(ColorTable)
