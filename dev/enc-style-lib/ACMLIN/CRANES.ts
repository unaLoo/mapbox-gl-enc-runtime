import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_CRANES_LINE: LineLayerSpecification = {
	id: 'ACMLIN_CRANES_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['match', ['get', 'OBJL'], [35, 74, 125], true, false], // LNDMRK, SILTNK
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': [
			'case',
			['==', ['get', 'LineType'], 1],
			ColorTable.CHBLK,
			['==', ['get', 'LineType'], 2],
			ColorTable.LANDF,
			ColorTable.LANDF,
		],
		'line-width': 1.2,
	},
}

const lines = [ACMLIN_CRANES_LINE]

export default {
	lines,
}
