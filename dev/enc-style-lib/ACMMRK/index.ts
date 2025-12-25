import { SymbolLayerSpecification } from 'mapbox-gl'

import ACHARE from './ACHARE'
import BERTHS from './BERTHS'
import BRIDGE from './BRIDGE'
import CBLARE from './CBLARE'
import CHKPNT from './CHKPNT'
import CONVYR from './CONVYR'
import CTSARE from './CTSARE'
import CTNARE from './CTNARE'
import DMPGRD from './DMPGRD'
import DWRTPT from './DWRTPT'
import FAIRWY from './FAIRWY'
import FERYRT from './FERYRT'
import FSHFAC from './FSHFAC'
import FSHGRD from './FSHGRD'
import GATCON from './GATCON'
import HRBFAC from './HRBFAC'
import ICNARE from './ICNARE'
import ISTZNE from './ISTZNE'
import LOCMAG from './LOCMAG'
import MARCUL from './MARCUL'
import MIPARE from './MIPARE'
import OBSTRN from './OBSTRN'
import OSPARE from './OSPARE'
import PILBOP from './PILBOP'
import PIPARE from './PIPARE'
import PRCARE from './PRCARE'
import PRDARE from './PRDARE'
import RCTLPT from './RCTLPT'
import RECTRC from './RECTRC'
import RESARE from './RESARE'
import SMCFAC from './SMCFAC'
import SPLARE from './SPLARE'
import SUBTLN from './SUBTLN'
import SWPARE from './SWPARE'
import TESARE from './TESARE'
import TIDESTR from './TIDESTR'
import TIDEWY from './TIDEWY'
import TSSCRS from './TSSCRS'
import TSSLPT from './TSSLPT'
import TSSRON from './TSSRON'
import TS_FEB from './TS_FEB'
import TWRTPT from './TWRTPT'
import WATTUR from './WATTUR'
import WEDKLP from './WEDKLP'

const symbols: SymbolLayerSpecification[] = [
	...ACHARE.symbols,
	...BERTHS.symbols,
	...BRIDGE.symbols,
	...CBLARE.symbols,
	...CHKPNT.symbols,
	...CONVYR.symbols,
	...CTSARE.symbols,
	...CTNARE.symbols,
	...DMPGRD.symbols,
	...DWRTPT.symbols,
	...FAIRWY.symbols,
	...FERYRT.symbols,
	...FSHFAC.symbols,
	...FSHGRD.symbols,
	...GATCON.symbols,
	...HRBFAC.symbols,
	...ICNARE.symbols,
	...ISTZNE.symbols,
	...LOCMAG.symbols,
	...MARCUL.symbols,
	...MIPARE.symbols,
	...OBSTRN.symbols,
	...OSPARE.symbols,
	...PILBOP.symbols,
	...PIPARE.symbols,
	...PRCARE.symbols,
	...PRDARE.symbols,
	...RCTLPT.symbols,
	...RECTRC.symbols,
	...RESARE.symbols,
	...SMCFAC.symbols,
	...SPLARE.symbols,
	...SUBTLN.symbols,
	...SWPARE.symbols,
	...TESARE.symbols,
	...TIDESTR.symbols,
	...TIDEWY.symbols,
	...TSSCRS.symbols,
	...TSSLPT.symbols,
	...TSSRON.symbols,
	...TS_FEB.symbols,
	...TWRTPT.symbols,
	...WATTUR.symbols,
	...WEDKLP.symbols,
]

export default {
	symbols,
	texts: [
		...BRIDGE.texts,
		...TIDEWY.texts
	]
}
