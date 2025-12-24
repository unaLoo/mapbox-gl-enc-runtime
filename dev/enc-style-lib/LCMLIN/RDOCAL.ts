import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'

const LCMLIN_RDOCAL_LINE: LineLayerSpecification = {
	id: 'LCMLIN_RDOCAL_LINE',
	type: 'line',
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
	filter: ['==', ['get', 'OBJL'], 104],
	layout: {
		'line-cap': 'round',
		'line-join': 'round',
	},
	paint: {
		'line-color': ColorTable.TRFCD,
		'line-width': 1.2,
		'line-dasharray': [4, 4],
	},
}

const lines = [LCMLIN_RDOCAL_LINE]

export default {
	lines,
}
