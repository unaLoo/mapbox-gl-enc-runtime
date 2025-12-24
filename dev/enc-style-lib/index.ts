import sources from './sources'
import COMARE, { createACMARELayers } from './ACMARE'
import { createDEPARELayers } from './DEPARE'
import { createLNDARELayers } from './LNDARE'
import { createDRGARELayers } from './DRGARE'
import { createOBSTRNLayers } from './OBSTRN'
import ACMLIN, { createACMLINLayers } from './ACMLIN'
import LCMLIN, { createLCMLINLayers } from './LCMLIN'
import ACMMRK from './ACMMRK'
import PCMMRK from './PCMMRK'
import PCMTEX, { createPCMTEXLayers } from './PCMTEX'
import { createSOUNDGLayers } from './SOUNDG'

// Custom
import LIGHTSLAYER from './LIGHTS'

import { StyleSpecification } from 'mapbox-gl'
import { StyleConfig, defaultStyleConfig, getColorTable } from './StyleConfig'

const staticServer = 'http://localhost:8081'


function getSpriteUrl(config: StyleConfig) {
    const dict = {
        'DAY_BRIGHT': '/sprite/rastersymbols-day',
        'DAY_BLACKBACK': '/sprite/rastersymbols-dusk',
        'DUSK': '/sprite/rastersymbols-dusk',
        'DAY_WHITEBACK': '/sprite/rastersymbols-dark',
        'NIGHT': '/sprite/rastersymbols-dark',
    }
    return dict[config.theme]
}


// 生成样式的函数
export function generateStyle(config: StyleConfig = defaultStyleConfig): StyleSpecification {
    const colors = getColorTable(config)
    const spriteUrl = staticServer + getSpriteUrl(config)

    // 已改造的图层使用函数生成
    const lndare = createLNDARELayers(colors)
    const depare = createDEPARELayers(colors)
    const drgare = createDRGARELayers(colors)
    const obstrn = createOBSTRNLayers(colors)
    const soundg = createSOUNDGLayers(colors)
    const comare = createACMARELayers(colors)
    const acmlin = createACMLINLayers(colors)
    const pcmtex = createPCMTEXLayers(colors)
    const lcmlin = createLCMLINLayers(colors)

    return {
        version: 8,
        sources,
        glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
        sprite: spriteUrl,
        layers: [
            // ...lndare.fills,
            ...depare.fills,
            // ...comare.fills,
            ...drgare.fills,
            ...obstrn.fills,
            ...comare.lines,
            ...acmlin.lines,
            ...lcmlin.lines,
            ...comare.symbols,
            ...lcmlin.symbols,
            ...ACMMRK.symbols,
            ...PCMMRK.symbols,
            ...pcmtex.texts,
            ...soundg.texts
        ],
    }
}


export function updateMapWithStyle(map: mapboxgl.Map, style: mapboxgl.StyleSpecification, config: StyleConfig) {

    const colors = getColorTable(config)

    // Calc Patterns
    // const sources = style.sources
    const layers = style.layers
    // prepare fill-patterns
    let patterns: Array<{
        url: string
        name: string
    }> = []

    const patternSet = new Set()

    layers.forEach((l) => {
        let pattern: any = null
        if (l.paint!['fill-pattern']) pattern = l.paint!['fill-pattern']
        else if (l.paint!['line-pattern']) pattern = l.paint!['line-pattern']

        if (pattern == null) return
        if (typeof pattern !== 'string') return
        if (patternSet.has(pattern)) return

        patterns.push({
            name: pattern,
            url: staticServer + `/${pattern}.png`,
        })
        patternSet.add(pattern)
    })
    const filteded = ['FOULAR01', 'ACHARE51', 'CTYARE51']
    patterns = patterns.filter((p) => !filteded.includes(p.name))

    map.setStyle({
        ...style,
        "imports": [
            {
                "id": "basemap",
                // "url": "mapbox://styles/mapbox/standard",
                "url": 'mapbox://styles/mapbox/satellite-v9',
                // 'url': 'mapbox://styles/mapbox/streets-v12',
            }
        ]
    })

    map.once('style.load', () => {
        map.getLayer('lights-layer') && map.removeLayer('lights-layer')
        const lightLayer = new LIGHTSLAYER(colors)
        map.addLayer(lightLayer, 'PCMMRK_LNDMRK_SYMBOL')
    })

    return addImgs(map, patterns).then((_) => {
        console.log('all img loaded')


    })
}

// Helper
function addImgs(
    map: mapboxgl.Map,
    patterns: Array<{
        url: string
        name: string
    }>,
) {
    removeRelative(map, patterns)

    return new Promise((resolve) => {
        let finishCount = 0
        patterns.forEach((pat) => {
            map.loadImage(pat.url, (err, image) => {
                if (err) throw err

                map.addImage(pat.name, image!)
                finishCount++

                if (finishCount === patterns.length) {
                    resolve('ok')
                }
            })
        })
    })
}


function removeRelative(
    map: mapboxgl.Map,
    patterns: Array<{
        url: string
        name: string
    }>,
) {
    patterns.forEach(p => {
        map.hasImage(p.name) && map.removeImage(p.name)
    })
}


// 保持向后兼容，默认导出当前样式
const style = generateStyle()
export default style