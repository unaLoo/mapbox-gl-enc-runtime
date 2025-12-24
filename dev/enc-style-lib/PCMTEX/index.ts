import { SymbolLayerSpecification } from 'mapbox-gl'
import BCNLAT from './BCNLAT'
import BERTHS from './BERTHS'
import BOYSPP from './BOYSPP'
import LNDELV from './LNDELV'
import LNDRGN from './LNDRGN'
import OBSTRN from './OBSTRN'
import SBDARE from './SBDARE'
import UWTROC from './UWTROC'
import WRECKS from './WRECKS'
import TS_FEB from './TS_FEB'
import ANNOTA from './ANNOTA'

const texts: SymbolLayerSpecification[] = [
	...BCNLAT.texts,
	...BERTHS.texts,
	...BOYSPP.texts,
	...LNDELV.texts,
	...LNDRGN.texts,
	...OBSTRN.texts,
	...SBDARE.texts,
	...UWTROC.texts,
	...WRECKS.texts,
	...TS_FEB.texts,
	...ANNOTA.texts,
]

export default {
	texts,
}
