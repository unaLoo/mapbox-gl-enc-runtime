import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'
import ColorTable from '../ColorTable'

//  <style type="latex.point" style="key:7;text:3;hide_dupl:0;type:-1;unicode:false;-1:rank(5),color(0xFF000000),size(30),position(3),rect(-13, -13, 13, 13)"/>

const PCMTEX_BCNLAT_TEXT_0: SymbolLayerSpecification = {
    id: 'PCMTEX_BCNLAT_TEXT_0',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['==', ['get', 'OBJL'], 7],
    minzoom: 11,
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
        'text-size': 14, // 30 太大了，18 足矣
    },
    paint: {
        'text-color': '#000000', // color(0xFF000000)
    },
}

const texts: SymbolLayerSpecification[] = [PCMTEX_BCNLAT_TEXT_0]

export default {
    texts,
}
