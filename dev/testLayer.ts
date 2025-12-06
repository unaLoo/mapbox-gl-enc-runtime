import mapboxgl, { Map } from 'mapbox-gl'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'

const EXTENT = 8192 // Standard extent for mapbox-gl

export default class TestLayer implements mapboxgl.CustomLayerInterface {
	id: string = 'test'
	type: 'custom' = 'custom' as const
	renderingMode?: '2d' | '3d' | undefined

	constructor() {}

	onAdd(map: Map, gl: WebGL2RenderingContext): void {
		console.log('onAdd', map, gl)
	}

	render(gl: WebGL2RenderingContext): void {
		console.log('render', gl)
	}
}

async function fetchMVT() {
	const url = 'https://localhost:3000/mbtiles/LNDARE.mbtiles/8/40/89.pbf'
	return fetch(url).then((res) => res.arrayBuffer())
}

function featuresFromMVT(buffer, tileZ, tileX, tileY, options) {
	const features: any = []
	const { layers = [] } = options
	try {
		const pbf = new Pbf(buffer)
		const tile = new VectorTile(pbf)

		for (const layerName of layers) {
			const layer = tile.layers[layerName]
			if (!layer) {
				console.warn(`MVT layer "${layerName}" not found in tile ${tileZ}/${tileX}/${tileY}`)
				continue
			}
			for (let i = 0; i < layer.length; i++) {
				const feature = layer.feature(i)
				try {
					// Get tile-local geometry (coordinates in 0-extent space)
					// This is the raw geometry from the vector tile, in tile-local coordinates
					const tileLocalGeometry = feature.loadGeometry()
					const featureExtent = feature.extent

					// Normalize coordinates to EXTENT (8192) during parsing
					// This ensures all coordinates are in the same space for rendering
					const extentScale = EXTENT / featureExtent
					const normalizedGeometry = normalizeGeometryCoordinates(tileLocalGeometry, extentScale)

					// Convert normalized geometry to our format
					const tileLocalGeo = {
						type: getGeometryType(feature.type),
						coordinates: convertTileLocalCoordinates(normalizedGeometry, feature.type),
						extent: EXTENT, // Always 8192 after normalization
					}

					// Also get GeoJSON for compatibility (WGS84 coordinates)
					// Use toGeoJSON method (available in @mapbox/vector-tile 2.0.4+)
					const geoJSONFeature = feature.toGeoJSON(tileX, tileY, tileZ)

					// Convert to ENCFeature format
					features.push({
						type: 'Feature',
						geometry: geoJSONFeature.geometry,
						properties: {
							...geoJSONFeature.properties,
							// Add tile metadata
							_tileZ: tileZ,
							_tileX: tileX,
							_tileY: tileY,
							_layer: layerName,
						},
						// Store tile-local geometry for efficient rendering
						tileLocalGeometry: tileLocalGeo,
					})
				} catch (featureError) {
					console.warn(
						`Error parsing feature ${i} in layer "${layerName}" of tile ${tileZ}/${tileX}/${tileY}:`,
						featureError,
					)
					// Continue parsing other features
				}
			}
		}
	} catch (error) {
		console.error('Error parsing MVT:', error)
		throw error
	}

	return features
}

function buildBuffersFromFeatures(features: any) {}

//#region Helper functions
function getGeometryType(mvtType) {
	switch (mvtType) {
		case 1: // Point
			return 'Point'
		case 2: // LineString
			return 'LineString'
		case 3: // Polygon
			return 'Polygon'
		default:
			throw new Error(`Unsupported MVT geometry type: ${mvtType}`)
	}
}

function normalizeGeometryCoordinates(geometry, scale) {
	return geometry.map((ring) =>
		ring.map((point) => ({
			x: point.x * scale,
			y: point.y * scale,
		})),
	)
}

function convertTileLocalCoordinates(geometry, mvtType) {
	switch (mvtType) {
		case 1: // Point
			// Point: geometry is [[{x, y}]] -> {x, y}
			if (geometry.length > 0 && geometry[0].length > 0) {
				return geometry[0][0]
			}
			throw new Error('Invalid Point geometry')

		case 2: // LineString
			// LineString: geometry is [[{x, y}, {x, y}, ...]] -> [{x, y}, {x, y}, ...]
			if (geometry.length > 0) {
				return geometry[0]
			}
			throw new Error('Invalid LineString geometry')

		case 3: // Polygon
			// Polygon: geometry is [[{x, y}, ...], [{x, y}, ...], ...] -> [[{x, y}, ...], ...]
			// First ring is exterior, rest are holes
			return geometry

		default:
			throw new Error(`Unsupported MVT geometry type: ${mvtType}`)
	}
}

//#endregion
