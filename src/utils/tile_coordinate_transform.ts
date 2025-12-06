/**
 * Tile Coordinate Transform
 * Transforms coordinates from tile-local space (0-8192) to screen space
 *
 * Coordinate transformation flow:
 * 1. Tile-local coordinates (0-extent) -> Scale to EXTENT (8192)
 * 2. Apply tilePosMatrix (tile-local to world space)
 * 3. Apply sharingVPMatrix (world space to screen space)
 */

import { mat4, vec3 } from 'gl-matrix'
import type { mat4 as Mat4 } from 'gl-matrix'
import type { Tile } from '../tiles/tile'
import type TileManager from '../tiles/tile_manager'

const EXTENT = 8192 // Hard-coded extent, 8192 is the default extent for mapbox-gl

/**
 * Point in tile-local coordinates (0-extent)
 */
export interface TileLocalPoint {
	x: number
	y: number
}

/**
 * Point in screen coordinates
 */
export interface ScreenPoint {
	x: number
	y: number
	z?: number // Optional depth
}

/**
 * Tile Coordinate Transform
 * Handles transformation from tile-local coordinates to screen coordinates
 */
export class TileCoordinateTransform {
	private tile: Tile
	private tileManager: TileManager
	private extent: number // Original extent of the tile (usually 4096 or 8192)

	/**
	 * Create a coordinate transform instance
	 * @param tile The tile containing the geometry
	 * @param tileManager The tile manager providing the view-projection matrix
	 * @param extent The original extent of the tile (from feature.extent)
	 */
	constructor(tile: Tile, tileManager: TileManager, extent: number = EXTENT) {
		this.tile = tile
		this.tileManager = tileManager
		this.extent = extent
	}

	/**
	 * Get the scale factor to convert from tile extent to EXTENT (8192)
	 */
	private getExtentScale(): number {
		return EXTENT / this.extent
	}

	/**
	 * Get the combined transformation matrix
	 * Combines: extent scale -> tilePosMatrix -> sharingVPMatrix
	 */
	getTransformMatrix(): Mat4 {
		// Get tile position matrix (tile-local to world space)
		const tilePosMatrix = this.tile.tilePosMatrix()

		// Get view-projection matrix (world space to screen space)
		const vpMatrix = this.tileManager.sharingVPMatrix

		// Scale factor to normalize from tile extent to EXTENT (8192)
		const extentScale = this.getExtentScale()

		// Create scale matrix for extent normalization
		const scaleMatrix = mat4.fromScaling(mat4.create(), [extentScale, extentScale, 1])

		// Combine transformations: scale -> tilePos -> viewProj
		// First apply extent scale, then tile position, then view-projection
		const combined = mat4.create()
		mat4.multiply(combined, tilePosMatrix, scaleMatrix)
		mat4.multiply(combined, vpMatrix, combined)

		return combined
	}

	/**
	 * Transform a single point from tile-local coordinates to screen coordinates
	 * @param point Point in tile-local coordinates (0-extent)
	 * @returns Point in screen coordinates
	 */
	transformPoint(point: TileLocalPoint): ScreenPoint {
		const transformMatrix = this.getTransformMatrix()

		// Create a 3D point (z=0 for 2D features)
		const tileLocalVec = vec3.fromValues(point.x, point.y, 0)
		const screenVec = vec3.create()

		// Apply transformation
		vec3.transformMat4(screenVec, tileLocalVec, transformMatrix)

		return {
			x: screenVec[0],
			y: screenVec[1],
			z: screenVec[2],
		}
	}

	/**
	 * Transform multiple points from tile-local coordinates to screen coordinates
	 * @param points Array of points in tile-local coordinates
	 * @returns Array of points in screen coordinates
	 */
	transformPoints(points: TileLocalPoint[]): ScreenPoint[] {
		return points.map((point) => this.transformPoint(point))
	}

	/**
	 * Transform a line (array of points) from tile-local to screen coordinates
	 * @param line Array of points forming a line
	 * @returns Array of points in screen coordinates
	 */
	transformLine(line: TileLocalPoint[]): ScreenPoint[] {
		return this.transformPoints(line)
	}

	/**
	 * Transform a polygon (array of rings, each ring is an array of points)
	 * @param polygon Array of rings, each ring is an array of points
	 * @returns Array of rings in screen coordinates
	 */
	transformPolygon(polygon: TileLocalPoint[][]): ScreenPoint[][] {
		return polygon.map((ring) => this.transformLine(ring))
	}

	/**
	 * Transform geometry from tile-local coordinates to screen coordinates
	 * Handles different geometry types automatically
	 * @param geometry Geometry in tile-local coordinates (TileLocalGeometry format)
	 * @returns Geometry in screen coordinates
	 */
	transformGeometry(geometry: {
		type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon'
		coordinates:
			| { x: number; y: number }
			| Array<{ x: number; y: number }>
			| Array<Array<{ x: number; y: number }>>
			| Array<Array<Array<{ x: number; y: number }>>>
	}): {
		type: string
		coordinates: any
	} {
		switch (geometry.type) {
			case 'Point':
				return {
					type: 'Point',
					coordinates: this.transformPoint(geometry.coordinates as { x: number; y: number }),
				}

			case 'MultiPoint':
				return {
					type: 'MultiPoint',
					coordinates: this.transformPoints(geometry.coordinates as Array<{ x: number; y: number }>),
				}

			case 'LineString':
				return {
					type: 'LineString',
					coordinates: this.transformLine(geometry.coordinates as Array<{ x: number; y: number }>),
				}

			case 'MultiLineString':
				return {
					type: 'MultiLineString',
					coordinates: (geometry.coordinates as Array<Array<{ x: number; y: number }>>).map((ring) =>
						this.transformLine(ring),
					),
				}

			case 'Polygon':
				return {
					type: 'Polygon',
					coordinates: this.transformPolygon(geometry.coordinates as Array<Array<{ x: number; y: number }>>),
				}

			case 'MultiPolygon':
				return {
					type: 'MultiPolygon',
					coordinates: (geometry.coordinates as Array<Array<Array<{ x: number; y: number }>>>).map(
						(polygon) => this.transformPolygon(polygon),
					),
				}

			default:
				throw new Error(`Unsupported geometry type: ${geometry.type}`)
		}
	}

	/**
	 * Get the tile position matrix (for direct use in shaders)
	 */
	getTilePosMatrix(): Mat4 {
		return this.tile.tilePosMatrix()
	}

	/**
	 * Get the view-projection matrix (for direct use in shaders)
	 */
	getVPMatrix(): Mat4 {
		return this.tileManager.sharingVPMatrix
	}

	/**
	 * Get the extent scale factor
	 */
	getExtentScaleFactor(): number {
		return this.getExtentScale()
	}
}
