import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_DAMCON_LINE: LineLayerSpecification = {
	id: 'ACMLIN_DAMCON_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 38],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': [
			'case',
			['==', ['get', 'LineType'], 1],
			ColorTable.CSTLN,
			['==', ['get', 'LineType'], 2],
			ColorTable.LANDF,
			ColorTable.LANDF,
		],
		'line-width': [
			'case',
			['==', ['get', 'LineType'], 1],
			2,
			['==', ['get', 'LineType'], 2],
			2,
			1.2, // fallback（默认值）
		],
	},
}

const lines = [ACMLIN_DAMCON_LINE]

export default {
	lines,
}
