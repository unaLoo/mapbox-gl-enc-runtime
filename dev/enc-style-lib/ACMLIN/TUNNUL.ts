import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_TUNNUL_LINE: LineLayerSpecification = {
	id: 'ACMLIN_TUNNUL_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 151],
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
			ColorTable.CHGRD,
			ColorTable.CHBLK, // fallback（默认值）
		],
		'line-width': 2,
		'line-dasharray': [4, 4],
	},
}

const lines = [ACMLIN_TUNNUL_LINE]

export default {
	lines,
}
