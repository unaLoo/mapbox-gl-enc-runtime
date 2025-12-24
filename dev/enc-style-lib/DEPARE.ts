import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import ColorTable, { ColorTableType } from './ColorTable'

export function createDEPARELayers(colors: ColorTableType) {
	const DEPARE_FILL_0: FillLayerSpecification = {
		id: 'DEPARE_FILL_0',
		type: 'fill',
		source: 'DEPARE',
		'source-layer': 'DEPARE',
		paint: {
			'fill-color': [
				'case',
				['all', ['<', ['get', 'DRVAL1'], 0], ['<=', ['get', 'DRVAL2'], 0]],
				colors.DEPIT,
				['<=', ['get', 'DRVAL1'], 2],
				colors.DEPVS,
				['<=', ['get', 'DRVAL1'], 5],
				colors.DEPMS,
				['<=', ['get', 'DRVAL1'], 10],
				colors.DEPMD,
				colors.DEPMD,
			],
		},
	}

	return {
		fills: [DEPARE_FILL_0] as FillLayerSpecification[],
		lines: [] as LineLayerSpecification[],
		symbols: [] as SymbolLayerSpecification[],
	}
}

// 保持向后兼容
export default createDEPARELayers(ColorTable)
