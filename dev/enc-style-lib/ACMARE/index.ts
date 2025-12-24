import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'
import CAUSWY from './CAUSWY'
import LNDRGN from './LNDRGN'
import MARCUL from './MARCUL'
import SNDWAV from './SNDWAV'
import ICEARE from './ICEARE'
import TUNNEL from './TUNNEL'
import SBDARE from './SBDARE'
import VEGATN from './VEGATN'
import UNSARE from './UNSARE'
import BUAARE from './BUAARE'

// style="color:CHBRN;fill_style:0;"
const CHBRN_FILL_STYLE: FillLayerSpecification = {
	id: 'COMARE_CHBRN_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['match', ['get', 'OBJL'], [12, 13, 35, 38, 49, 57, 59, 61, 65, 74, 84, 87, 95, 98, 117, 125, 128]],
	layout: {},
	paint: {
		'fill-color': ColorTable.CHBRN,
	},
}
// style="color:DEPVS;fill_style:0;"
const DEPVS_FILL_STYLE: FillLayerSpecification = {
	id: 'COMARE_DEPVS_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['match', ['get', 'OBJL'], [23, 45, 69, 79, 114], true, false],
	layout: {},
	paint: {
		'fill-color': ColorTable.DEPVS,
	},
}
// style="color:LANDA;fill_style:0;"
const LANDA_FILL_STYLE: FillLayerSpecification = {
	id: 'COMARE_LANDA_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['match', ['get', 'OBJL'], [47, 116], true, false],
	layout: {},
	paint: {
		'fill-color': ColorTable.LANDA,
	},
}
// style="color:CHMGD;fill_style:4;" !!!!
const CHMGD_FILL_STYLE: FillLayerSpecification = {
	id: 'COMARE_CHMGD_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['match', ['get', 'OBJL'], [96, 147, 149], true, false],
	layout: {},
	paint: {
		// 'fill-color': ColorTable.CHMGD,
		'fill-pattern': 'CHMGD_LINE',
	},
}
// style="color:CHGRD;fill_style:0;"
const CHGRD_FILL_STYLE: FillLayerSpecification = {
	id: 'COMARE_CHGRD_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['any', ['==', 'OBJL', 107], ['all', ['==', 'OBJL', 127], ['==', 'FillType', 1]]],
	layout: {},
	paint: {
		'fill-color': ColorTable.CHGRD,
	},
}
// style="color:TRFCF;fill_style:0" tag="1"
const TRFCF_FILL_STYLE: FillLayerSpecification = {
	id: 'COMARE_TRFCF_FILL_0',
	type: 'fill',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 150],
	layout: {},
	paint: {
		'fill-color': ColorTable.TRFCF,
	},
}

const BUAARE_FILL_STYLE = BUAARE.fills[0]
const CAUSWY_FILL_STYLE = CAUSWY.fills[0]
const LNDRGN_FILL_STYLE = LNDRGN.fills[0]
const LNDRGN_SYMBOL_1 = LNDRGN.symbols[0]
const MARCUL_FILL_STYLE = MARCUL.fills[0]
const SNDWAV_FILL_STYLE = SNDWAV.fills[0]
const ICEARE_FILL_STYLE = ICEARE.fills[0]
const ICEARE_FILL_STYLE_1 = ICEARE.fills[1]
const TUNNEL_FILL_STYLE = TUNNEL.fills[0]
const SBDARE_FILL_STYLE = SBDARE.fills[0]
const SBDARE_SYMBOL_STYLE = SBDARE.symbols[0]
const VEGATN_FILL_STYLE = VEGATN.fills[0]
const UNSARE_FILL_STYLE = UNSARE.fills[0]
const UNSARE_LINE_STYLE = UNSARE.lines[0]

const fills: FillLayerSpecification[] = [
	// CHBRN_FILL_STYLE,
	BUAARE_FILL_STYLE,
	DEPVS_FILL_STYLE,
	LANDA_FILL_STYLE,
	CHMGD_FILL_STYLE,
	CHGRD_FILL_STYLE,
	TRFCF_FILL_STYLE,
	CAUSWY_FILL_STYLE,
	LNDRGN_FILL_STYLE,
	MARCUL_FILL_STYLE,
	SNDWAV_FILL_STYLE,
	ICEARE_FILL_STYLE,
	ICEARE_FILL_STYLE_1,
	TUNNEL_FILL_STYLE,
	SBDARE_FILL_STYLE,
	VEGATN_FILL_STYLE,
	UNSARE_FILL_STYLE,
]
const lines: LineLayerSpecification[] = [UNSARE_LINE_STYLE]
const symbols: SymbolLayerSpecification[] = [LNDRGN_SYMBOL_1, SBDARE_SYMBOL_STYLE]

export default {
	fills,
	lines,
	symbols,
}
