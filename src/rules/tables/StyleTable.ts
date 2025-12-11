import { StyleDescription } from '../types'
import { Theme } from './ColorTable'
import { OBJLAcronym } from './OBJLTable'
import { ColorNames } from './ColorTable'

// import { getColor } from './ColorTable'

/**
 * Table for Basic S52 Style
 */
const StyleDescTable = {
	LNDARE: [
		{
			type: 'AC',
			style: {
				color: 'LANDA'
			},
		}
	],
}

function getStyleDescList(acronym: OBJLAcronym) {
	const baseStyleDescList = StyleDescTable[acronym as keyof typeof StyleDescTable] as StyleDescription[]
	return baseStyleDescList
}

// function updateStyleTable(theme: Theme) {
// 	// 保留原始 themeColor 作为索引，在颜色更新时更新 color 字段

// 	for (const acronym in StyleTable) {
// 		const styleList = StyleTable[acronym as keyof typeof StyleTable] as StyleDescription[]
// 		styleList.forEach((styleItem) => {
// 			switch (styleItem.type) {
// 				case 'AC':
// 					styleItem.style.color = styleItem.style.color as ColorNames
// 					break
// 				default:
// 					break
// 			}
// 		})
// 	}
// }

// updateStyleTable('DAY_BRIGHT')
// console.log('init color theme as Day_Bright')

export { getStyleDescList }
