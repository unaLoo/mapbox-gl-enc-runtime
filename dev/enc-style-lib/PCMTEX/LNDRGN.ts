import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable from '../ColorTable'

//  <style type="latex.point" style="key:73;text:3;hide_dupl:0;type:-1;unicode:false;-1:rank(5),color(0xFF000000),size(30),position(2),rect(-13, -13, 13, 13)"/>

const PCMTEX_LNDRGN_TEXT_0: SymbolLayerSpecification = {
    id: 'PCMTEX_LNDRGN_TEXT_0',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['==', ['get', 'OBJL'], 73],
    layout: {
        'text-field': [
            'get',
            'OBJNAM',
        ],
        'text-anchor': 'center',
        'text-offset': [0, 0], // position(2)
        'text-allow-overlap': true,
        'text-font': ['Roboto Medium'],
        'text-size': 14,
    },
    paint: {
        'text-color': '#000000', // color(0xFF000000)
    },
}

const texts: SymbolLayerSpecification[] = [PCMTEX_LNDRGN_TEXT_0]

export default {
    texts,
}
