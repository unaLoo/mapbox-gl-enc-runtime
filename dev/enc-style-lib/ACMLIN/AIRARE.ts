import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_AIRARE_LINE: LineLayerSpecification = {
	id: 'ACMLIN_AIRARE_LINE',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 2],
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

console.log(ColorTable.LANDF === '#8b661f') // true

const lines = [ACMLIN_AIRARE_LINE]

export default {
	lines,
}
