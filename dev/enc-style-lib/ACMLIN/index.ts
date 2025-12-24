import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'
import ACHARE from './ACHARE'
import AIRARE from './AIRARE'
import BUISGL from './BUISGL'
import CANALS from './CANALS'
import CAUSWY from './CAUSWY'
import CRANES from './CRANES'
import DAMCON from './DAMCON'
import DOCARE from './DOCARE'
import FAIRWY from './FAIRWY'
import FERYRT from './FERYRT'
import FORSTC from './FORSTC'
import OBSTRN from './OBSTRN'
import PIPARE from './PIPARE'
import PRDARE from './PRDARE'
import TUNNUL from './TUNNUL'
import WRECKS from './WRECKS'

const SOURCE_DESC = {
	source: 'AREA_COMMON_LINE',
	'source-layer': 'area_common_line',
}

// type="linex.dash" style="color:CHGRF;width:2;cap:0;join:0"

const ACMLIN_DASH_CHGRF: LineLayerSpecification = {
	id: 'ACMLIN_DASH_CHGRF',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [1, 31, 32, 50, 54, 60, 135, 112, 120], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRF,
		'line-width': 2,
	},
}

// type="linex.dash" style="color:CHMGD;width:2;cap:0;join:0"
const ACMLIN_DASH_CHMGD: LineLayerSpecification = {
	id: 'ACMLIN_DASH_CHMGD',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [3, 10, 20, 83, 88, 133], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHMGD,
		'line-width': 1.5,
		'line-dasharray': [4, 4]
	},
}

// type="linex.solidx" style="color:CHGRD;width:3;cap:0;join:0"
const ACMLIN_SOLIDX_CHGRD: LineLayerSpecification = {
	id: 'ACMLIN_SOLIDX_CHGRD',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [11, 34, 154], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 3,
	},
}

// type="linex.solidx" style="color:LANDF;width:1.2;cap:0;join:0"
const ACMLIN_SOLIDX_LANDF: LineLayerSpecification = {
	id: 'ACMLIN_SOLIDX_LANDF',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [13, 49, 116, 128, 155], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.LANDF,
		'line-width': 1.2,
	},
}

// type="linex.dash" style="color:CHMGF;width:1.2;cap:0;join:0"
const ACMLIN_DASH_CHMGF: LineLayerSpecification = {
	id: 'ACMLIN_DASH_CHMGF',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [67, 25], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHMGF,
		'line-width': 1.2,
		'line-dasharray': [4, 4]
	},
}

// type="linex.dash" style="color:TRFCD;width:2;cap:0;join:0"
const ACMLIN_DASH_TRFCD: LineLayerSpecification = {
	id: 'ACMLIN_DASH_TRFCD',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [27, 41, 96, 152, 68], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.TRFCD,
		'line-width': 2,
		'line-dasharray': [4, 4]
	},
}

// type="linex.dash" style="color:CHGRF;width:1.2;cap:0;join:0"
const ACMLIN_DASH_CHGRF_2: LineLayerSpecification = {
	id: 'ACMLIN_DASH_CHGRF_2',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [37, 46, 56, 158], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRF,
		'line-width': 1.2,
		'line-dasharray': [4, 4]
	},
}

// type="linex.solidx" style="color:CSTLN;width:1;cap:0;join:0"
const ACMLIN_SOLIDX_CSTLN: LineLayerSpecification = {
	id: 'ACMLIN_SOLIDX_CSTLN',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [57, 61, 65, 87, 95, 98], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CSTLN,
		'line-width': 2,
	},
}

// type="linex.dash" style="color:CHGRD;width:1.2;cap:0;join:0"
const ACMLIN_DASH_CHGRD: LineLayerSpecification = {
	id: 'ACMLIN_DASH_CHGRD',
	type: 'line',
	...SOURCE_DESC,
	filter: [
		'match',
		['get', 'OBJL'],
		[55, 62, 66, 78, 82, 109, 121, 134, 136, 137, 138, 139, 140, 141, 142, 156, 63, 118, 160],
		true,
		false,
	],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 1.2,
		'line-dasharray': [4, 4]
	},
}

// type="linex.solidx" style="color:CHBLK;width:1.2;cap:0;join:0"
const ACMLIN_SOLIDX_CHBLK: LineLayerSpecification = {
	id: 'ACMLIN_SOLIDX_CHBLK',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [69, 84, 114, 117, 127], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 1.2,
	},
}

// type="linex.dash" style="color:CHBLK;width:1.2;cap:0;join:0"
const ACMLIN_DASH_CHBLK: LineLayerSpecification = {
	id: 'ACMLIN_DASH_CHBLK',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [79, 80], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHBLK,
		'line-width': 1.2,
		'line-dasharray': [4, 4]
	},
}

// type="linex.dash" style="color:TRFCF;width:2;cap:0;join:0"
const ACMLIN_DASH_TRFCF: LineLayerSpecification = {
	id: 'ACMLIN_DASH_TRFCF',
	type: 'line',
	...SOURCE_DESC,
	filter: ['match', ['get', 'OBJL'], [91, 100], true, false],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.TRFCF,
		'line-width': 1.5,
		'line-dasharray': [4, 4]
	},
}

const lines = [
	ACMLIN_DASH_CHGRF,
	ACMLIN_DASH_CHMGD,
	ACMLIN_SOLIDX_CHGRD,
	ACMLIN_SOLIDX_LANDF,
	ACMLIN_DASH_CHMGF,
	ACMLIN_DASH_TRFCD,
	ACMLIN_DASH_CHGRF_2,
	ACMLIN_SOLIDX_CSTLN,
	ACMLIN_DASH_CHGRD,
	ACMLIN_SOLIDX_CHBLK,
	ACMLIN_DASH_CHBLK,
	ACMLIN_DASH_TRFCF,
	...ACHARE.lines,
	...AIRARE.lines,
	...BUISGL.lines,
	...CANALS.lines,
	...CAUSWY.lines,
	...CRANES.lines,
	...DAMCON.lines,
	...DOCARE.lines,
	...FAIRWY.lines,
	...FERYRT.lines,
	...FORSTC.lines,
	...OBSTRN.lines,
	...PIPARE.lines,
	...PRDARE.lines,
	...TUNNUL.lines,
	...WRECKS.lines,
]

export default {
	lines,
}
