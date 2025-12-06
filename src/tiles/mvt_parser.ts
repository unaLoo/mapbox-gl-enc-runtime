/**
 * MVT (Mapbox Vector Tile) Parser
 * Converts MVT data to ENCFeature[]
 * Preserves tile-local coordinates for efficient rendering
 */

import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import type { ENCFeature, TileLocalGeometry } from '../types'

const EXTENT = 8192 // Standard extent for mapbox-gl

export interface MVTParseOptions {
	/**
	 * Layer names to extract from MVT
	 * If empty, extracts all layers
	 */
	layers?: string[]
}

/**
 * Parse MVT buffer to ENCFeature[]
 */
export function parseMVT(
	buffer: ArrayBuffer,
	tileZ: number,
	tileX: number,
	tileY: number,
	options: MVTParseOptions = {},
): ENCFeature[] {
	const features: ENCFeature[] = []
	const { layers = [] } = options

	try {
		// Create Pbf instance from buffer and parse vector tile
		// Note: Pbf constructor accepts ArrayBuffer | Uint8Array
		const pbf = new Pbf(buffer)
		const tile = new VectorTile(pbf)

		// Get layer names
		const layerNames = layers.length > 0 ? layers : Object.keys(tile.layers)

		for (const layerName of layerNames) {
			const layer = tile.layers[layerName]
			if (!layer) {
				console.warn(`MVT layer "${layerName}" not found in tile ${tileZ}/${tileX}/${tileY}`)
				continue
			}
			for (let i = 0; i < layer.length; i++) {
				const feature: VectorTileFeature = layer.feature(i)
				try {
					// Also get GeoJSON for compatibility (WGS84 coordinates)
					// Use toGeoJSON method (available in @mapbox/vector-tile 2.0.4+)
					const geoJSONFeature = feature.toGeoJSON(tileX, tileY, tileZ)

					// Get tile-local geometry (coordinates in 0-extent space)
					// This is the raw geometry from the vector tile, in tile-local coordinates
					const tileLocalGeometry = feature.loadGeometry()
					const featureExtent = feature.extent

					// Normalize coordinates to EXTENT (8192) during parsing
					// This ensures all coordinates are in the same space for rendering
					const extentScale = EXTENT / featureExtent
					const normalizedGeometry = normalizeGeometryCoordinates(tileLocalGeometry, extentScale)

					// Convert normalized geometry to our format
					const tileLocalGeo: TileLocalGeometry = {
						type: geoJSONFeature.geometry.type,
						coordinates: convertTileLocalCoordinates(normalizedGeometry, geoJSONFeature.geometry.type),
						extent: EXTENT, // Always 8192 after normalization
					}

					// Convert to ENCFeature format
					features.push({
						type: 'Feature',
						geometry: geoJSONFeature.geometry as ENCFeature['geometry'],
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

/**
 * Normalize geometry coordinates from original extent to EXTENT (8192)
 */
function normalizeGeometryCoordinates(
	geometry: Array<Array<{ x: number; y: number }>>,
	scale: number,
): Array<Array<{ x: number; y: number }>> {
	return geometry.map((ring) =>
		ring.map((point) => ({
			x: point.x * scale,
			y: point.y * scale,
		})),
	)
}

function convertTileLocalCoordinates(
	geometry: Array<Array<{ x: number; y: number }>>,
	mvtType: "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon" | "GeometryCollection",
): TileLocalGeometry['coordinates'] {
	switch (mvtType) {
		case 'Point': // Point
			// Point: geometry is [[{x, y}]] -> {x, y}
			if (geometry.length > 0 && geometry[0].length > 0) {
				return geometry[0][0]
			}
			throw new Error('Invalid Point geometry')

		case 'LineString': // LineString
			// LineString: geometry is [[{x, y}, {x, y}, ...]] -> [{x, y}, {x, y}, ...]
			if (geometry.length > 0) {
				return geometry[0]
			}
			throw new Error('Invalid LineString geometry')

		case 'MultiLineString': // MultiLineString
		case 'Polygon': // Polygon
		case 'MultiPoint': // MultiPoint
		case 'MultiPolygon': // MultiPolygon
			return geometry
		default:
			throw new Error(`Unsupported MVT geometry type: ${mvtType}`)
	}
}
