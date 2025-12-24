import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_PIPARE_LINE: LineLayerSpecification = {
	id: 'ACMLIN_PIPARE_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 92],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		// 'line-color': [
		//     'case',
		//     ['get', 'LineType'],
		//     1,
		//     ColorTable.CHMGD,
		//     2,
		//     ColorTable.CHGRD
		// ],
		'line-color': [
			'case',
			['==', ['get', 'LineType'], 1],
			ColorTable.CHMGD,
			['==', ['get', 'LineType'], 2],
			ColorTable.CHGRD,
			ColorTable.CHMGD, // fallback（默认值）
		],
		'line-width': 2,
		'line-dasharray': [4, 4],
	},
}

const lines = [ACMLIN_PIPARE_LINE]

export default {
	lines,
}
