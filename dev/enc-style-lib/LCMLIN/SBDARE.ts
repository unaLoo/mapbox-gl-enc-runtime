import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_SBDARE_LINE: LineLayerSpecification = {
	id: 'LCMLIN_SBDARE_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 121],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 1.2,
	},
}

const lines = [LCMLIN_SBDARE_LINE]

export default {
	lines,
}
