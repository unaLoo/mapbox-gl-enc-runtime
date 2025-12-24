import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_PRDARE_LINE: LineLayerSpecification = {
	id: 'ACMLIN_PRDARE_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 97],
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
		'line-dasharray': [4, 4],
	},
}

const lines = [ACMLIN_PRDARE_LINE]

export default {
	lines,
}
