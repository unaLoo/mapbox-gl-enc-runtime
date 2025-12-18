/**
 * Area Pattern Bucket
 * Manages area (polygon) renderable elements with texture pattern fills
 */
import earcut from 'earcut'
import { BaseBucket } from './BaseBucket'
import { LayeredParsedStyledFeature, LayeredGroupKey, TileLocalGeometry } from '@/types'
import { AreaPatternParsedStyle } from '@/rules/types'
import { getEventBus } from '@/utils/eventBus'
import type { Tile } from '@/tiles/tile'
import classifyRings from './classifyRing'

// Tile extent constant (standard MVT extent)
const TILE_EXTENT = 4096

/**
 * AP Render Data structure for pattern-filled polygons
 */
export interface APRenderData {
	vertices: number[] // [x, y, u, v, ...] interleaved
	indices: number[]
	vertexCount: number
	indexCount: number
	patternUrl: string
	opacity: number
	scale: [number, number]
}

/**
 * AP Bucket
 * Collects and manages area renderable elements with pattern fills
 * Uses ear clipping triangulation for polygons and generates UV coordinates
 */
export class APBucket extends BaseBucket {
	constructor(layeredGroupKey: LayeredGroupKey) {
		super(layeredGroupKey)
	}

	override processFeatures(tile: Tile, layeredStyledFeatures: LayeredParsedStyledFeature[]): void {
		const vertices: number[] = []
		const indices: number[] = []

		// Get pattern style from first feature (all features in this bucket share the same style)
		const firstFeature = layeredStyledFeatures[0]
		const patternStyle = firstFeature.styleDesc.style as AreaPatternParsedStyle
		const scale = patternStyle.scale
		const patternUrl = patternStyle.pattern
		const opacity = patternStyle.opacity

		for (const element of layeredStyledFeatures) {
			const { feature } = element
			const rawPolygons = this.extractPolygons(feature.tileLocalGeometry!)

			// Track current vertex offset
			let vertexOffset = vertices.length / 4 // 4 floats per vertex: x, y, u, v

			for (const rawPolygon of rawPolygons) {
				if (rawPolygon.length === 0) continue

				// Use classifyRings to properly classify exterior and interior rings (holes)
				const classifiedPolygons = classifyRings(rawPolygon, 500)

				for (const polygon of classifiedPolygons) {
					if (polygon.length === 0) continue

					// Exterior ring (first ring)
					const exteriorRing = polygon[0]
					if (exteriorRing.length < 3) continue // Need at least 3 points for a triangle

					// Prepare earcut input
					const flatCoords: number[] = []
					for (const point of exteriorRing) {
						flatCoords.push(point.x, point.y)
					}

					// Hole indices array
					const holes: number[] = []
					let holeIndex = exteriorRing.length
					for (let i = 1; i < polygon.length; i++) {
						const hole = polygon[i]
						if (hole.length >= 3) {
							holes.push(holeIndex)
							for (const point of hole) {
								flatCoords.push(point.x, point.y)
							}
							holeIndex += hole.length
						}
					}

					// Triangulate using earcut
					const triangulation = earcut(flatCoords, holes.length > 0 ? holes : undefined, 2)

					// Generate vertex data with position (x, y) and UV coordinates (u, v)
					for (let i = 0; i < flatCoords.length; i += 2) {
						const x = flatCoords[i]
						const y = flatCoords[i + 1]

						// Calculate UV coordinates: u = (x / EXTENT) * scale[0], v = (y / EXTENT) * scale[1]
						const u = (x / TILE_EXTENT) * scale[0]
						const v = (y / TILE_EXTENT) * scale[1]

						vertices.push(x, y, u, v)
					}

					// Generate index data (add vertex offset)
					for (const index of triangulation) {
						indices.push(vertexOffset + index)
					}

					// Update vertex offset
					vertexOffset += flatCoords.length / 2
				}
			}
		}

		const renderInfo: APRenderData = {
			vertices: vertices,
			vertexCount: vertices.length / 4,
			indices: indices,
			indexCount: indices.length,
			patternUrl: patternUrl,
			opacity: opacity,
			scale: scale,
		}

		// Trigger bucketsReady event
		this.triggerBucketsReady(tile, renderInfo)
	}

	private triggerBucketsReady(tile: Tile, renderInfo: APRenderData): void {
		const eventBus = getEventBus()
		eventBus?.trigger('bucketsReady', {
			tile: tile,
			layeredGroupKey: this.layeredGroupKey,
			renderInfo: renderInfo,
		})
	}

	/**
	 * Extract polygons from geometry
	 */
	private extractPolygons(geometry: TileLocalGeometry): Array<Array<Array<{ x: number; y: number }>>> {
		const polygons: Array<Array<Array<{ x: number; y: number }>>> = []
		const coords = geometry.coordinates as Array<Array<{ x: number; y: number }>>
		polygons.push(coords)
		return polygons
	}
}
