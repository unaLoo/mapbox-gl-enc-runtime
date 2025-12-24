import { SymbolLayerSpecification } from 'mapbox-gl'
import ColorTable, { ColorTableType } from '../ColorTable'
import { createBCNLATTexts } from './BCNLAT'
import { createBERTHSTexts } from './BERTHS'
import { createBOYSPPTexts } from './BOYSPP'
import { createLNDELVTexts } from './LNDELV'
import { createLNDRGNTexts } from './LNDRGN'
import { createOBSTRNTexts } from './OBSTRN'
import { createSBDARETexts } from './SBDARE'
import { createUWTROCTexts } from './UWTROC'
import { createWRECKSTexts } from './WRECKS'
import { createTS_FEBTexts } from './TS_FEB'
import { createANNOTATexts } from './ANNOTA'
import { createBOYLATTexts } from './BOYLAT'

export function createPCMTEXLayers(colors: ColorTableType) {
	const texts: SymbolLayerSpecification[] = [
		...createBCNLATTexts(colors).texts,
		...createBERTHSTexts(colors).texts,
		...createBOYLATTexts(colors).texts,
		...createBOYSPPTexts(colors).texts,
		...createLNDELVTexts(colors).texts,
		...createLNDRGNTexts(colors).texts,
		...createOBSTRNTexts(colors).texts,
		...createSBDARETexts(colors).texts,
		...createUWTROCTexts(colors).texts,
		...createWRECKSTexts(colors).texts,
		...createTS_FEBTexts(colors).texts,
		...createANNOTATexts(colors).texts,
	]

	return { texts }
}

export default createPCMTEXLayers(ColorTable)
