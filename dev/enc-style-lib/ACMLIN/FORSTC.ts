import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_FORSTC_LINE: LineLayerSpecification = {
	id: 'ACMLIN_FORSTC_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 59],
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
			ColorTable.LANDF, // fallback（默认值）
		],
		'line-width': 1.2,
	},
}

const lines = [ACMLIN_FORSTC_LINE]

export default {
	lines,
}
