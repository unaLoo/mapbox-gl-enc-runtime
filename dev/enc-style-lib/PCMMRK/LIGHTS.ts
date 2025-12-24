import { SymbolLayerSpecification } from 'mapbox-gl'
import { SOURCE_DESC } from './_source'

/*
<style type="case.int" field="2" style="key:75;">  
    <style type="pointx.icon" style="key:1;check_coll:0;img:(./fill_images/rastersymbols-day.png);rect:LITDEF11;offset_x:20;offset_y:20;trans:0.5;rotate:135" />
    <style type="pointx.icon" style="key:2;check_coll:0;img:(./fill_images/rastersymbols-day.png);rect:LIGHTS11;offset_x:20;offset_y:20;trans:0.5" />
    <style type="pointx.icon" style="key:3;check_coll:0;img:(./fill_images/rastersymbols-day.png);rect:LIGHTS12;offset_x:20;offset_y:20;trans:0.5" />
    <style type="pointx.icon" style="key:4;check_coll:0;img:(./fill_images/rastersymbols-day.png);rect:LIGHTS13;offset_x:20;offset_y:20;trans:0.5" />
    <style type="pointx.icon" style="key:5;check_coll:0;img:(./fill_images/rastersymbols-day.png);rect:LIGHTS81;offset_x:20;offset_y:20;trans:0.5" />
    <style type="pointx.icon" style="key:6;check_coll:0;img:(./fill_images/rastersymbols-day.png);rect:LIGHTS82;offset_x:20;offset_y:20;trans:0.5" />
    <style type="pointx.shape" style="key:101;check_coll:0;color:LITRD;size:[5]" />
    <style type="pointx.shape" style="key:102;check_coll:0;color:LITGN;size:[5]" />
    <style type="pointx.shape" style="key:103;check_coll:0;color:LITYW;size:[5]" />
    <style type="pointx.shape" style="key:104;check_coll:0;color:CHMGD;size:[5]" />
    <style type="pointx.shape" style="key:201;check_coll:0;color:LITRD;sect1:[5];sect2:[6]" />
    <style type="pointx.shape" style="key:202;check_coll:0;color:LITGN;sect1:[5];sect2:[6]" />
    <style type="pointx.shape" style="key:203;check_coll:0;color:LITYW;sect1:[5];sect2:[6]" />
    <style type="pointx.shape" style="key:204;check_coll:0;color:CHMGD;sect1:[5];sect2:[6]" />
</style>
*/

// note: pointx.shape styles are not implemented yet !!!!!!!!!!

const PCMMRK_LIGHTS_SYMBOL: SymbolLayerSpecification = {
    id: 'PCMMRK_LIGHTS_SYMBOL',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['all', ['==', ['get', 'OBJL'], 75], ['match', ['get', 'CATEGORY'], [1, 2, 3, 4, 5, 6], true, false]],
    layout: {
        'icon-allow-overlap': true,
        'icon-image': [
            'case',
            ['==', ['get', 'CATEGORY'], 1],
            'LITDEF11',
            ['==', ['get', 'CATEGORY'], 2],
            'LIGHTS11',
            ['==', ['get', 'CATEGORY'], 3],
            'LIGHTS12',
            ['==', ['get', 'CATEGORY'], 4],
            'LIGHTS13',
            ['==', ['get', 'CATEGORY'], 5],
            'LIGHTS81',
            ['==', ['get', 'CATEGORY'], 6],
            'LIGHTS82',
            'LITDEF11',
        ],
        'icon-offset': [10, 13],
        'icon-rotate': ['case', ['==', ['get', 'CATEGORY'], 1], 135, 0],
    },
    paint: {
        'icon-opacity': 0.5,
    },
}


const PCMMRK_LIGHTS_SYMBOL_2: SymbolLayerSpecification = {
    // as a placeholder for customlayer
    id: 'PCMMRK_LIGHTS_SYMBOL_2',
    type: 'symbol',
    ...SOURCE_DESC,
    filter: ['all',
        ['==', ['get', 'OBJL'], 75],
        ['match', ['get', 'CATEGORY'],
            [101, 102, 103, 104, 201, 202, 203, 204], true, false]],
    layout: {
        'text-field': ['get', 'CATEGORY'],
        'text-size': 50,
        'text-allow-overlap': false,
        'text-font': ['Roboto Medium'],
    },
    paint: {
        'text-opacity': 0.0,
    }
}

const symbols: SymbolLayerSpecification[] = [PCMMRK_LIGHTS_SYMBOL, PCMMRK_LIGHTS_SYMBOL_2]

export default {
    symbols,
}
