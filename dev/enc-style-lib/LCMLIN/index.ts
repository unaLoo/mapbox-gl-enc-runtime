import { LineLayerSpecification, SymbolLayerSpecification } from 'mapbox-gl'
import ColorTable from '../ColorTable'
import BRIDGE from './BRIDGE'
import CBLOHD from './CBLOHD'
import CBLSUB from './CBLSUB'
import CANALS from './CANALS'
import CAUSWY from './CAUSWY'
import COALNE from './COALNE'
import CONVYR from './CONVYR'
import DAMCON from './DAMCON'
import DYKCON from './DYKCON'
import FNCLNE from './FNCLNE'
import FERYRT from './FERYRT'
import FSHFAC from './FSHFAC'
import FLODOC from './FLODOC'
import FORSTC from './FORSTC'
import GATCON from './GATCON'
import LAKSHR from './LAKSHR'
import LNDARE from './LNDARE'
import LNDELV from './LNDELV'
import LNDMRK from './LNDMRK'
import LOCMAG from './LOCMAG'
import MARCUL from './MARCUL'
import MORFAC from './MORFAC'
import NAVLNE from './NAVLNE'
import OBSTRN from './OBSTRN'
import OILBAR from './OILBAR'
import PIPOHD from './PIPOHD'
import PONTON from './PONTON'
import RADLNE from './RADLNE'
import RDOCAL from './RDOCAL'
import RAILWY from './RAILWY'
import RAPIDS from './RAPIDS'
import RCRTCL from './RCRTCL'
import RECTRC from './RECTRC'
import RIVERS from './RIVERS'
import ROADWY from './ROADWY'
import RUNWAY from './RUNWAY'
import SNDWAV from './SNDWAV'
import SBDARE from './SBDARE'
import SLCONS from './SLCONS'
import SLOTOP from './SLOTOP'
import STSLNE from './STSLNE'
import TIDEWY from './TIDEWY'
import TSELNE from './TSELNE'
import TSSBND from './TSSBND'
import TUNNEL from './TUNNEL'
import VEGATN from './VEGATN'
import WATFAL from './WATFAL'

const SOURCE_DESC = {
	source: 'LINE_COMMON_LINE',
	'source-layer': 'line_common',
}

const lines: LineLayerSpecification[] = [
	...BRIDGE.lines,
	...CBLOHD.lines,
	...CBLSUB.lines,
	...CANALS.lines,
	...CAUSWY.lines,
	...COALNE.lines,
	...CONVYR.lines,
	...DAMCON.lines,
	...DYKCON.lines,
	...FNCLNE.lines,
	...FERYRT.lines,
	...FSHFAC.lines,
	...FLODOC.lines,
	...FORSTC.lines,
	...GATCON.lines,
	...LAKSHR.lines,
	...LNDARE.lines,
	...LNDELV.lines,
	...LNDMRK.lines,
	...LOCMAG.lines,
	...MARCUL.lines,
	...MORFAC.lines,
	...NAVLNE.lines,
	...OBSTRN.lines,
	...OILBAR.lines,
	...PIPOHD.lines,
	...PONTON.lines,
	...RADLNE.lines,
	...RDOCAL.lines,
	...RAILWY.lines,
	...RAPIDS.lines,
	...RCRTCL.lines,
	...RECTRC.lines,
	...RIVERS.lines,
	...ROADWY.lines,
	...RUNWAY.lines,
	...SNDWAV.lines,
	...SBDARE.lines,
	...SLCONS.lines,
	...SLOTOP.lines,
	...STSLNE.lines,
	...TIDEWY.lines,
	...TSELNE.lines,
	...TSSBND.lines,
	...TUNNEL.lines,
	...VEGATN.lines,
	...WATFAL.lines,
]

const symbols: SymbolLayerSpecification[] = [...(NAVLNE.symbols || []), ...(PIPOHD.symbols || [])]

export default {
	lines,
	symbols,
}
