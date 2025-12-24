import { SourcesSpecification } from 'mapbox-gl'
const sources: SourcesSpecification = {
	DEPARE: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/DEPARE.mbtiles/tilejson.json',
	},
	LNDARE: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/LNDARE.mbtiles/tilejson.json',
	},
	AREA_COMMON_AREA: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/area_common_polygon.mbtiles/tilejson.json',
		minzoom: 0,
		maxzoom: 14,
	},
	AREA_COMMON_LINE: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/area_common_line.mbtiles/tilejson.json',
	},
	LINE_COMMON_LINE: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/line_common.mbtiles/tilejson.json',
	},
	AREA_COMMON_POINT: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/area_common_point.mbtiles/tilejson.json',
	},
	POINT_COMMON_POINT: {
		// point_common
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/point_common.mbtiles/tilejson.json',
	},
	SOUNDG: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/r15.mbtiles/tilejson.json',
	},
	DRGARE: {
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/area_drgare.mbtiles/tilejson.json',
		minzoom: 0,
		maxzoom: 14,
	},
	OBSTRN: {
		// layer: area_obstrn
		type: 'vector',
		url: 'https://localhost:3000/mbtiles/area_obstrn.mbtiles/tilejson.json',
		minzoom: 0,
		maxzoom: 14,
	},
}

export default sources
