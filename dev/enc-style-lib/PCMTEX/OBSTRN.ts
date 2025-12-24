import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable from '../ColorTable'

//  <style type="latex.point" style="key:86;text:3;hide_dupl:0;half_dot:1;type:-1;unicode:false;-1:rank(5),color(0xFF7d898c),size(30),position(5),rect(-13, -13, 13, 13)"/>

const PCMTEX_OBSTRN_TEXT_0: SymbolLayerSpecification = {
    id: 'PCMTEX_OBSTRN_TEXT_0',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['==', ['get', 'OBJL'], 86],
    minzoom: 11,
    layout: {
        'text-field': [
            'get',
            'OBJNAM',
        ],
        'text-anchor': 'center',
        'text-offset': [0, 0.2], // position(5)
        'text-allow-overlap': true,
        'text-font': ['Roboto Medium'],
        'text-size': 12,
    },
    paint: {
        'text-color': '#7d898c', // color(0xFF7d898c)
    },
}

const texts: SymbolLayerSpecification[] = [PCMTEX_OBSTRN_TEXT_0]

export default {
    texts,
}
