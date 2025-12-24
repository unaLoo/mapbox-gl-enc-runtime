import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable from '../ColorTable'

//  <style type="latex.point" style="key:19;text:3;hide_dupl:0;type:-1;unicode:false;-1:rank(5),color(0xFF000000),size(30),position(3),rect(-13, -13, 13, 13)"/>

const PCMTEX_BOYSPP_TEXT_0: SymbolLayerSpecification = {
    id: 'PCMTEX_BOYSPP_TEXT_0',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['==', ['get', 'OBJL'], 19],
    minzoom: 12,
    layout: {
        'text-field': [
            'get',
            'OBJNAM',
        ],
        // 左上方，不换行
        'text-anchor': 'right',
        'text-offset': [-1, 0],
        'text-max-width': 20, // no wrap
        'text-allow-overlap': true,
        'text-font': ['Roboto Medium'],
        'text-size': 14,
    },
    paint: {
        'text-color': ColorTable.CHBLK, // color(0xFF000000)
        // 'text-occlusion-opacity': 0.5,
    },
}

const texts: SymbolLayerSpecification[] = [PCMTEX_BOYSPP_TEXT_0]

export default {
    texts,
}
