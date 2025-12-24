import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_ACHARE_LINE_0: LineLayerSpecification = {
	id: 'ACMLIN_ACHARE_LINE_0',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 4],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-pattern': 'ACHARE51',
		'line-width': 16,
	},
}

const lines = [ACMLIN_ACHARE_LINE_0]

export default {
	lines,
}
