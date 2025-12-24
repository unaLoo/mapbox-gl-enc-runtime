import sources from './sources'
import COMARE from './ACMARE'
import DEPARE from './DEPARE'
import LNDARE from './LNDARE'
import DRGARE from './DRGARE'
import OBSTRN from './OBSTRN'
import ACMLIN from './ACMLIN'
import LCMLIN from './LCMLIN'
import ACMMRK from './ACMMRK'
import PCMMRK from './PCMMRK'
import PCMTEX from './PCMTEX'
import SOUNDG from './SOUNDG'

import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification, StyleSpecification } from 'mapbox-gl'

const staticServer = 'http://localhost:8081'
const style: StyleSpecification = {
    version: 8,
    sources,
    glyphs: staticServer + '/fonts/{fontstack}/{range}.pbf',
    sprite: staticServer + '/sprite/rastersymbols-day',
    layers: [
        ...LNDARE.fills,
        ...DEPARE.fills,
        ...COMARE.fills,
        ...DRGARE.fills,
        ...OBSTRN.fills,
        ...COMARE.lines,
        ...ACMLIN.lines,
        ...LCMLIN.lines,
        ...COMARE.symbols,
        ...LCMLIN.symbols,
        ...ACMMRK.symbols,
        ...PCMMRK.symbols,
        ...PCMTEX.texts,
        ...SOUNDG.texts
    ],
}

export default style
