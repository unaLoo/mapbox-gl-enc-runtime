import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_BUISGL_LINE: LineLayerSpecification = {
	id: 'ACMLIN_BUISGL_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 12],
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
	},
}

const lines = [ACMLIN_BUISGL_LINE]

export default {
	lines,
}
