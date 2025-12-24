import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_SNDWAV_LINE: LineLayerSpecification = {
	id: 'LCMLIN_SNDWAV_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 118],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.CHGRD,
		'line-width': 2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_SNDWAV_LINE]

export default {
	lines,
}
