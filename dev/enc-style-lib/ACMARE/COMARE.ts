import { FillLayerSpecification, SymbolLayerSpecification, LineLayerSpecification } from 'mapbox-gl'
import BUISGL from './BUISGL'

const fills: FillLayerSpecification[] = [...BUISGL.fills]
const lines: LineLayerSpecification[] = [...BUISGL.lines]
const symbols: SymbolLayerSpecification[] = [...BUISGL.symbols]

const COMARE = {
	fills,
	lines,
	symbols,
}

export default COMARE
