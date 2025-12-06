/**
 * Geometry utility functions
 */

import type { ENCFeatureGeometry } from '../types'

/**
 * Check if geometry is a point type
 */
export function isPointGeometry(geometry: ENCFeatureGeometry): boolean {
	return geometry.type === 'Point' || geometry.type === 'MultiPoint'
}

/**
 * Check if geometry is a line type
 */
export function isLineGeometry(geometry: ENCFeatureGeometry): boolean {
	return geometry.type === 'LineString' || geometry.type === 'MultiLineString'
}

/**
 * Check if geometry is an area type
 */
export function isAreaGeometry(geometry: ENCFeatureGeometry): boolean {
	return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
}

/**
 * Get all coordinates from a geometry (flattened)
 */
export function getCoordinates(geometry: ENCFeatureGeometry): number[][] {
	switch (geometry.type) {
		case 'Point':
			return [geometry.coordinates as number[]]
		case 'MultiPoint':
		case 'LineString':
			return geometry.coordinates as number[][]
		case 'MultiLineString':
		case 'Polygon':
			// Polygon coordinates: number[][][] (rings of coordinates)
			// Need to flatten one level to get number[][]
			return (geometry.coordinates as unknown as number[][][]).flat(1) as number[][]
		case 'MultiPolygon':
			// MultiPolygon coordinates: number[][][][] (polygons of rings)
			// Need to flatten two levels to get number[][]
			return (geometry.coordinates as unknown as number[][][][]).flat(2) as number[][]
		default:
			return []
	}
}

/**
 * Calculate bounding box of a geometry
 */
export function getBoundingBox(geometry: ENCFeatureGeometry): [number, number, number, number] | null {
	const coords = getCoordinates(geometry)
	if (coords.length === 0) {
		return null
	}

	let minLon = Infinity
	let minLat = Infinity
	let maxLon = -Infinity
	let maxLat = -Infinity

	for (const [lon, lat] of coords) {
		minLon = Math.min(minLon, lon)
		minLat = Math.min(minLat, lat)
		maxLon = Math.max(maxLon, lon)
		maxLat = Math.max(maxLat, lat)
	}

	return [minLon, minLat, maxLon, maxLat]
}
