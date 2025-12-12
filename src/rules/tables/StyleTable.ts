import { StyleDescription } from '../types'
import { OBJLAcronym } from './OBJLTable'

// import { getColor } from './ColorTable'

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
		// 		horizontalAlign: 1, //'LEFT'
		// 		verticalAlign: 2,// 'TOP' | 'CENTER' | 'BOTTOM'
		// 		direction: 3, // 'HORIZONTAL' | 'VERTICAL'
		// 		bold: 1,
		// 		color: 'CHBLK',
		// 		fontSize: 29, 
		// 	}
		// } as StyleDescription
	] as StyleDescription[],
	DEPARE: [
		// {
		// 	type: 'AC',
		// 	style: {
		// 		color: 'LITYW',
		// 	},
		// } as StyleDescription,
		{
			type: 'CS',
			style: {
				condition: 'DEPARE01'
			},
		} as StyleDescription,
	],
}

function getStyleDescList(acronym: OBJLAcronym) {
	const baseStyleDescList = StyleDescTable[acronym as keyof typeof StyleDescTable] as StyleDescription[]
	return baseStyleDescList
}


export { getStyleDescList }
