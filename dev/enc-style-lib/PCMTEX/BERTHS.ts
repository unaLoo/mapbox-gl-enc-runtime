import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable from '../ColorTable'

//  <style type="latex.point" style="key:10;text:3;hide_dupl:0;type:-1;unicode:false;-1:rank(5),color(0xFF000000),size(30),position(1),rect(-13, -13, 13, 13)"/>

const PCMTEX_BERTHS_TEXT_0: SymbolLayerSpecification = {
    id: 'PCMTEX_BERTHS_TEXT_0',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['==', ['get', 'OBJL'], 10],
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
        'text-color': '#000000', // color(0xFF000000)
    },
}

const texts: SymbolLayerSpecification[] = [PCMTEX_BERTHS_TEXT_0]

export default {
    texts,
}
