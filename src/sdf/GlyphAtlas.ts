/**
 * GlyphAtlas - Texture atlas for SDF glyphs using potpack for efficient packing
 * Based on Mapbox's GlyphAtlas implementation
 */

import { AlphaImage } from './AlphaImage'
import potpack from 'potpack'

/** Padding around each glyph in the atlas to prevent bleeding */
const GLYPH_PADDING = 1

/**
 * Rectangle representing a glyph's position in the atlas
 */
export interface Rect {
	x: number
	y: number
	w: number
	h: number
}

/**
 * Metrics for a single glyph
 */
export interface GlyphMetrics {
	width: number
	height: number
	left: number
	top: number
	advance: number
}

/**
 * Glyph data structure from TinySDF generation
 */
export interface StyleGlyph {
	id: number
	bitmap: AlphaImage
	metrics: GlyphMetrics
}

/**
 * Position information for a glyph in the atlas
 */
export interface GlyphPosition {
	rect: Rect
	metrics: GlyphMetrics
}

/**
 * Map of font stacks to glyph positions
 * Structure: { fontStack: { glyphId: GlyphPosition } }
 */
export type GlyphPositions = {
	[fontStack: string]: {
		[glyphId: number]: GlyphPosition
	}
}

/**
 * Input type for GlyphAtlas constructor
 * Structure: { fontStack: { glyphId: StyleGlyph } }
 */
export type GlyphStacks = {
	[fontStack: string]: {
		[glyphId: number]: StyleGlyph | null | undefined
	}
}

/**
 * GlyphAtlas packs multiple glyph bitmaps into a single texture atlas
 * using the potpack bin-packing algorithm for efficient space utilization.
 *
 * Requirements covered:
 * - 1.1: Pack glyph bitmaps using potpack algorithm
 * - 1.2: Store position information for each glyph in positions map
 * - 1.3: Produce AlphaImage with all glyphs properly positioned
 * - 1.4: Return rect and metrics for UV coordinate calculation
 */
export class GlyphAtlas {
	/** The packed atlas image containing all glyph SDF data */
	image: AlphaImage

	/** Map of glyph positions for UV coordinate lookup */
	positions: GlyphPositions

	/**
	 * Create a new GlyphAtlas from a set of glyph stacks
	 * @param stacks - Map of font stacks to glyph maps
	 */
	constructor(stacks: GlyphStacks) {
		const positions: GlyphPositions = {}
		const bins: Rect[] = []

		// First pass: collect all glyphs and create bins for potpack
		for (const stack in stacks) {
			const glyphs = stacks[stack]
			const stackPositions: { [glyphId: number]: GlyphPosition } = {}
			positions[stack] = stackPositions

			for (const id in glyphs) {
				const src = glyphs[+id]

				// Skip null/undefined glyphs or glyphs with empty bitmaps
				if (!src || src.bitmap.width === 0 || src.bitmap.height === 0) {
					continue
				}

				// Create bin with padding for potpack
				const bin: Rect = {
					x: 0,
					y: 0,
					w: src.bitmap.width + 2 * GLYPH_PADDING,
					h: src.bitmap.height + 2 * GLYPH_PADDING,
				}
				bins.push(bin)

				// Store position reference (will be updated by potpack)
				stackPositions[+id] = {
					rect: bin,
					metrics: src.metrics,
				}
			}
		}

		// Pack all bins using potpack algorithm
		const { w, h } = potpack(bins)

		// Create atlas image with packed dimensions (minimum 1x1)
		const image = new AlphaImage({ width: w || 1, height: h || 1 })

		// Second pass: copy glyph bitmaps to their packed positions
		for (const stack in stacks) {
			const glyphs = stacks[stack]

			for (const id in glyphs) {
				const src = glyphs[+id]

				// Skip null/undefined glyphs or glyphs with empty bitmaps
				if (!src || src.bitmap.width === 0 || src.bitmap.height === 0) {
					continue
				}

				// Get the packed position for this glyph
				const bin = positions[stack][+id].rect

				// Copy glyph bitmap to atlas with padding offset
				AlphaImage.copy(
					src.bitmap,
					image,
					{ x: 0, y: 0 },
					{ x: bin.x + GLYPH_PADDING, y: bin.y + GLYPH_PADDING },
					{ width: src.bitmap.width, height: src.bitmap.height },
				)
			}
		}

		this.image = image
		this.positions = positions
	}
}
