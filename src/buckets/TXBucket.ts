/**
 * TX Bucket
 * Manages text (TX) renderable elements for ENC chart text labels
 */
import type { TileLocalGeometry } from '../types'
import { BaseBucket } from './BaseBucket'
import { TextPlainParsedStyle } from '@/rules/types'
import { LayeredParsedStyledFeature, LayeredGroupKey } from '@/types'
import { getEventBus } from '@/utils/eventBus'
import type { Tile } from '@/tiles/tile'
import { Color } from '@/rules/tables/ColorTable'

/**
 * Text instance representing a single text label to be rendered
 */
export interface TextInstance {
	id: string // Unique identifier for collision detection
	position: [number, number] // Tile-local x, y coordinates
	text: string
	style: {
		fontSize: number
		color: [number, number, number]
		horizontalAlign: 1 | 2 | 3
		verticalAlign: 1 | 2 | 3
		direction: 2 | 3
		bold: 0 | 1
	}
}

/**
 * TX render info structure containing all text instances for a tile
 */
export interface TXRenderInfo {
	textInstances: TextInstance[]
	instanceCount: number
}

// Counter for generating unique IDs across all TXBucket instances
let globalTextInstanceCounter = 0

/**
 * TX Bucket
 * Processes TX styled features and prepares text instances for rendering
 */
export class TXBucket extends BaseBucket {
	constructor(layeredGroupKey: LayeredGroupKey) {
		super(layeredGroupKey)
	}

	override processFeatures(tile: Tile, layeredStyledFeatures: LayeredParsedStyledFeature[]): void {
		const textInstances: TextInstance[] = []

		for (const element of layeredStyledFeatures) {
			const { feature, styleDesc } = element

			// Ensure this is a TX type style
			if (styleDesc.type !== 'TX') continue

			const textStyle = styleDesc.style as TextPlainParsedStyle

			// Extract text value from feature properties using fieldName
			// Handle missing/empty field values gracefully (Requirements 5.1)
			const textStr = this.extractFieldValue(feature.properties, textStyle.fieldName)
			if (textStr === null) continue

			// Get geometry information
			const geometry = feature.tileLocalGeometry
			if (!geometry) continue

			// Calculate anchor position from geometry (Requirements 5.2)
			const position = this.calculateCenter(geometry)

			// Generate unique ID for collision detection
			const id = this.generateUniqueId(tile, feature.properties)

			// Build text instance with position, text, and style (Requirements 5.3)
			textInstances.push({
				id,
				position,
				text: textStr,
				style: {
					fontSize: textStyle.fontSize,
					color: this.parseColor(textStyle.color),
					horizontalAlign: textStyle.horizontalAlign,
					verticalAlign: textStyle.verticalAlign,
					direction: textStyle.direction,
					bold: textStyle.bold,
				},
			})
		}

		// Prepare render info structure with all text instances (Requirements 5.3, 5.4)
		const renderInfo: TXRenderInfo = {
			textInstances,
			instanceCount: textInstances.length,
		}

		// Emit bucketsReady with complete render info (Requirements 5.4)
		this.triggerBucketsReady(tile, renderInfo)
	}

	/**
	 * Extract text value from feature properties
	 * Returns null if field is missing or empty (Requirements 5.1)
	 *
	 * Property 9: Field extraction returns property value or null
	 * For any feature properties object and fieldName, extracting the field
	 * SHALL return the property value if it exists and is non-empty, or null otherwise.
	 */
	extractFieldValue(properties: Record<string, unknown>, fieldName: string): string | null {
		// Handle missing or empty fieldName
		if (!fieldName || typeof fieldName !== 'string') return null

		// Handle missing or invalid properties object
		if (!properties || typeof properties !== 'object') return null

		const value = properties[fieldName]

		// Handle missing field
		if (value === undefined || value === null) return null

		// Convert to string and trim
		const textStr = String(value).trim()

		// Handle empty or whitespace-only values
		if (textStr === '') return null

		return textStr
	}

	/**
	 * Generate unique ID for a text instance
	 * Combines tile info, feature properties, and a global counter
	 */
	private generateUniqueId(tile: Tile, properties: Record<string, unknown>): string {
		const tileKey = tile.id
		const rcid = properties.RCID ?? properties.PK_UID ?? ''
		const counter = globalTextInstanceCounter++
		return `tx-${tileKey}-${rcid}-${counter}`
	}

	private triggerBucketsReady(tile: Tile, renderInfo: TXRenderInfo): void {
		const eventBus = getEventBus()
		eventBus?.trigger('bucketsReady', {
			tile: tile,
			layeredGroupKey: this.layeredGroupKey,
			renderInfo: renderInfo,
		})
	}

	private parseColor(color: Color): [number, number, number] {
		// Color is already [r,g,b] format, normalize to 0-1 range
		return [color[0] / 255, color[1] / 255, color[2] / 255]
	}

	/**
	 * Calculate center position from geometry
	 * Ensures the anchor lies within the geometry's bounding box (Requirements 5.2)
	 *
	 * Property 10: Anchor position lies within geometry bounds
	 * For any geometry (Point, LineString, Polygon), the calculated anchor position
	 * SHALL lie within the geometry's bounding box.
	 */
	calculateCenter(geometry: TileLocalGeometry): [number, number] {
		switch (geometry.type) {
			case 'Point': {
				const coord = geometry.coordinates as { x: number; y: number }
				return [coord.x, coord.y]
			}
			case 'MultiPoint': {
				const coords = geometry.coordinates as Array<{ x: number; y: number }>
				if (coords.length === 0) return [0, 0]
				// Return the centroid of all points (guaranteed within bounding box)
				return this.calculateBoundingBoxCenter(coords)
			}
			case 'LineString': {
				const coords = geometry.coordinates as Array<{ x: number; y: number }>
				return this.calculateLineStringCenter(coords)
			}
			case 'MultiLineString': {
				const lines = geometry.coordinates as Array<Array<{ x: number; y: number }>>
				if (lines.length === 0) return [0, 0]
				// Find the longest line and use its center
				let longestLine = lines[0]
				let maxLength = this.calculateLineLength(lines[0])
				for (let i = 1; i < lines.length; i++) {
					const length = this.calculateLineLength(lines[i])
					if (length > maxLength) {
						maxLength = length
						longestLine = lines[i]
					}
				}
				return this.calculateLineStringCenter(longestLine)
			}
			case 'Polygon': {
				const rings = geometry.coordinates as Array<Array<{ x: number; y: number }>>
				return this.calculatePolygonCenter(rings)
			}
			case 'MultiPolygon': {
				const polygons = geometry.coordinates as Array<Array<Array<{ x: number; y: number }>>>
				if (polygons.length === 0) return [0, 0]
				// Find the largest polygon by area and use its center
				let largestPolygon = polygons[0]
				let maxArea = Math.abs(this.calculatePolygonArea(polygons[0][0] || []))
				for (let i = 1; i < polygons.length; i++) {
					const area = Math.abs(this.calculatePolygonArea(polygons[i][0] || []))
					if (area > maxArea) {
						maxArea = area
						largestPolygon = polygons[i]
					}
				}
				return this.calculatePolygonCenter(largestPolygon)
			}
			default:
				return [0, 0]
		}
	}

	/**
	 * Calculate the total length of a line
	 */
	private calculateLineLength(coords: Array<{ x: number; y: number }>): number {
		if (coords.length < 2) return 0
		let totalLength = 0
		for (let i = 0; i < coords.length - 1; i++) {
			const dx = coords[i + 1].x - coords[i].x
			const dy = coords[i + 1].y - coords[i].y
			totalLength += Math.sqrt(dx * dx + dy * dy)
		}
		return totalLength
	}

	/**
	 * Calculate the signed area of a polygon ring using the shoelace formula
	 */
	private calculatePolygonArea(ring: Array<{ x: number; y: number }>): number {
		if (ring.length < 3) return 0
		let area = 0
		const n = ring.length
		for (let i = 0; i < n; i++) {
			const p1 = ring[i]
			const p2 = ring[(i + 1) % n]
			area += p1.x * p2.y - p2.x * p1.y
		}
		return area / 2
	}

	/**
	 * Calculate center for LineString geometry
	 * Uses the midpoint of the line for better visual placement
	 */
	private calculateLineStringCenter(coords: Array<{ x: number; y: number }>): [number, number] {
		if (coords.length === 0) return [0, 0]
		if (coords.length === 1) return [coords[0].x, coords[0].y]

		// Calculate total length and find midpoint
		let totalLength = 0
		const segmentLengths: number[] = []

		for (let i = 0; i < coords.length - 1; i++) {
			const dx = coords[i + 1].x - coords[i].x
			const dy = coords[i + 1].y - coords[i].y
			const length = Math.sqrt(dx * dx + dy * dy)
			segmentLengths.push(length)
			totalLength += length
		}

		// Find the point at half the total length
		const halfLength = totalLength / 2
		let accumulatedLength = 0

		for (let i = 0; i < segmentLengths.length; i++) {
			if (accumulatedLength + segmentLengths[i] >= halfLength) {
				// Interpolate within this segment
				const remainingLength = halfLength - accumulatedLength
				const t = segmentLengths[i] > 0 ? remainingLength / segmentLengths[i] : 0
				const x = coords[i].x + t * (coords[i + 1].x - coords[i].x)
				const y = coords[i].y + t * (coords[i + 1].y - coords[i].y)
				return [x, y]
			}
			accumulatedLength += segmentLengths[i]
		}

		// Fallback to last point
		const last = coords[coords.length - 1]
		return [last.x, last.y]
	}

	/**
	 * Calculate center for Polygon geometry
	 * Uses centroid calculation with fallback to ensure center is within bounds
	 */
	private calculatePolygonCenter(rings: Array<Array<{ x: number; y: number }>>): [number, number] {
		if (rings.length === 0 || rings[0].length === 0) return [0, 0]

		const ring = rings[0] // Use exterior ring
		if (ring.length < 3) {
			// Degenerate polygon, use average
			return this.calculateBoundingBoxCenter(ring)
		}

		// Calculate centroid using the shoelace formula
		let area = 0
		let cx = 0
		let cy = 0
		const n = ring.length

		for (let i = 0; i < n; i++) {
			const p1 = ring[i]
			const p2 = ring[(i + 1) % n]
			const crossProduct = p1.x * p2.y - p2.x * p1.y
			area += crossProduct
			cx += (p1.x + p2.x) * crossProduct
			cy += (p1.y + p2.y) * crossProduct
		}

		area /= 2

		if (Math.abs(area) < 1e-10) {
			// Degenerate polygon (zero area), use bounding box center
			return this.calculateBoundingBoxCenter(ring)
		}

		cx /= 6 * area
		cy /= 6 * area

		// Ensure the centroid is within the bounding box
		const bbox = this.calculateBoundingBox(ring)
		cx = Math.max(bbox.minX, Math.min(bbox.maxX, cx))
		cy = Math.max(bbox.minY, Math.min(bbox.maxY, cy))

		return [cx, cy]
	}

	/**
	 * Calculate bounding box for a set of coordinates
	 */
	private calculateBoundingBox(coords: Array<{ x: number; y: number }>): {
		minX: number
		minY: number
		maxX: number
		maxY: number
	} {
		if (coords.length === 0) {
			return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
		}

		let minX = coords[0].x // 1
		let minY = coords[0].y
		let maxX = coords[0].x
		let maxY = coords[0].y

		for (const pt of coords) {
			minX = Math.min(minX, pt.x)
			minY = Math.min(minY, pt.y)
			maxX = Math.max(maxX, pt.x)
			maxY = Math.max(maxY, pt.y)
		}

		return { minX, minY, maxX, maxY }
	}

	/**
	 * Calculate center of bounding box
	 */
	private calculateBoundingBoxCenter(coords: Array<{ x: number; y: number }>): [number, number] {
		const bbox = this.calculateBoundingBox(coords)
		return [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2]
	}
}
