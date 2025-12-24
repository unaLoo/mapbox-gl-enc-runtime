import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const ACMLIN_FAIRWY_LINE_0: LineLayerSpecification = {
	id: 'ACMLIN_FAIRWY_LINE_0',
	type: 'line',
	source: 'AREA_COMMON_AREA',
	'source-layer': 'area_common_polygon',
	filter: ['==', ['get', 'OBJL'], 51],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-pattern': 'NAVARE51',
		'line-width': 16,
	},
}

const lines = [ACMLIN_FAIRWY_LINE_0]

export default {
	lines,
}
