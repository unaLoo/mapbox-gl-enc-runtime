import { SymbolLayerSpecification } from 'mapbox-gl'
import ColorTable, { ColorTableType } from './ColorTable'

export function createSOUNDGLayers(colors: ColorTableType) {
	const SOUNDG_TEXT: SymbolLayerSpecification = {
		id: 'SOUNDG_TEXT',
		type: 'symbol',
		source: 'SOUNDG',
		'source-layer': 'soundg3d',
		layout: {
			'text-field': [
				'format',
				// 整数部分
				['slice', ['to-string', ['get', 'VAL']], 0, ['index-of', '.', ['to-string', ['get', 'VAL']]]], // 返回 str
				{ 'font-scale': 1.0 }, // 返回 desc
				' ',
				{ 'font-scale': 0.1 },
				// 小数部分
				[
					'case',
					[
						'all',
						// 1. 有小数部分
						['!=', ['index-of', '.', ['to-string', ['get', 'VAL']]], -1],
						// 2. 小数部分有意义 avoid .0
						[
							'>',
							[
								'length',
								[
									'slice',
									['to-string', ['get', 'VAL']],
									['+', ['index-of', '.', ['to-string', ['get', 'VAL']]], 1],
								],
							],
							0,
						],
					], // condition
					[
						'slice',
						['to-string', ['get', 'VAL']],
						['+', ['index-of', '.', ['to-string', ['get', 'VAL']]], 1], // 从小数点开始截取（包含小数点）
					], // true, 返回 decimal str
					'', // false, 返回 empty str
				],
				{
					'font-scale': 0.8,
				},
			],
			'text-font': ['Roboto Regular'],
			'text-size': 16,
			'text-rotate': 5,
			'text-pitch-alignment': 'map',
			// 'text-allow-overlap': true
		},
		paint: {
			'text-color': colors.CHGRD,
			'text-opacity': 0.8,
			'text-halo-color': 'rgba(0, 0, 0, 1)',
		},
	}

	return {
		texts: [SOUNDG_TEXT] as SymbolLayerSpecification[],
	}
}

// 保持向后兼容
export default createSOUNDGLayers(ColorTable)
