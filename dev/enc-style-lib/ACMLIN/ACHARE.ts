import { LineLayerSpecification } from 'mapbox-gl'
import ColorTable, { ColorTableType } from '../ColorTable'

export function createACHARELines(colors: ColorTableType) {
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

	return { lines: [ACMLIN_ACHARE_LINE_0] as LineLayerSpecification[] }
}

export default createACHARELines(ColorTable)
