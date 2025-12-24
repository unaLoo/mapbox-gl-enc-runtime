import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable from '../ColorTable'

//  <style type="multi" style="key:22001;">
//    <style type="latex.point" style="text:3;type:-1;unicode:false;-1:rank(3),color(0xff1E1E1E),size(30),position(1)" />
//  </style>

const PCMTEX_ANNOTA_TEXT_0: SymbolLayerSpecification = {
    id: 'PCMTEX_ANNOTA_TEXT_0',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['==', ['get', 'OBJL'], 22001],
    layout: {
        'text-field': [
            'get',
            'OBJNAM',
        ],
        'text-anchor': 'center',
        'text-offset': [0, 0], // position(1)
        'text-allow-overlap': true,
        'text-font': ['Roboto Medium'],
        'text-size': 14,
    },
    paint: {
        'text-color': '#1E1E1E', // color(0xff1E1E1E)
    },
}

const texts: SymbolLayerSpecification[] = [PCMTEX_ANNOTA_TEXT_0]

export default {
    texts,
}
