import { StyleDescription } from '../types'
import { OBJLAcronym } from './OBJLTable'

/**
 * Table for Basic S52 Style
 */
const StyleDescTable = {
	LNDARE: [
		{
			type: 'AC',
			style: {
				color: 'LANDA',
			},
		} as StyleDescription,
		// {
		// 	type: 'TX', // Not Implemen
		// 	style: {
		// 		fieldName: 'OBJNAM',
		// 		formatString: '%s',
		// 		horizontalAlign: 1, //'LEFT'
		// 		verticalAlign: 2,// 'TOP' | 'CENTER' | 'BOTTOM'
		// 		direction: 3, // 'HORIZONTAL' | 'VERTICAL'
		// 		bold: 1,
		// 		color: 'CHBLK',
		// 		fontSize: 12,
		// 	}
		// } as StyleDescription
	] as StyleDescription[],
	DEPARE: [
		{
			type: 'CS',
			style: {
				condition: 'DEPARE01'
			},
		} as StyleDescription,
		// {
		// 	type: 'AP',
		// 	style: {
		// 		pattern: 'http://127.0.0.1:8080/VEGATN03.png',
		// 		scale: [2.5, 2.5],
		// 		opacity: 1.0,
		// 	}
		// } as StyleDescription
	],
	SOUNDG: [
		// {
		// 	type: 'CS',
		// 	style: {
		// 		condition: 'SOUNDG02'
		// 	},
		// } as StyleDescription,
		{
			type: 'TX',
			style: {
				fieldName: 'VAL',
				formatString: '%.1f',
				horizontalAlign: 2, //'LEFT' | 'CENTER'
				verticalAlign: 2,// 'TOP' | 'CENTER' | 'BOTTOM'
				direction: 3, // 'HORIZONTAL' | 'VERTICAL'
				bold: 1,
				color: 'CHBLK',
				fontSize: 14,
			}
		} as StyleDescription
	]
}

function getStyleDescList(acronym: OBJLAcronym) {
	const baseStyleDescList = StyleDescTable[acronym as keyof typeof StyleDescTable] as StyleDescription[]
	return baseStyleDescList
}


export { getStyleDescList }
