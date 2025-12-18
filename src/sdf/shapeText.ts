/**
 * Text Shaping - Functions for converting text strings into positioned glyph quads
 * Based on Mapbox's symbol-layout and SymbolQuad implementations
 *
 * Requirements covered:
 * - 2.1: Calculate glyph positions based on character advance values
 * - 2.2: Apply horizontal alignment (LEFT, CENTER, RIGHT)
 * - 2.3: Apply vertical alignment (TOP, CENTER, BOTTOM)
 * - 2.4: Return shaping bounds (left, right, top, bottom) for collision detection
 * - 2.5: Produce quads with correct UV coordinates from the atlas
 */

import { GlyphPositions, StyleGlyph } from './GlyphAtlas'

/** Padding around glyphs in the atlas (must match GlyphAtlas GLYPH_PADDING) */
const GLYPH_PBF_BORDER = 3
const GLYPH_PADDING = 1

/** Symbol anchor positions */
export type SymbolAnchor =
	| 'center'
	| 'left'
	| 'right'
	| 'top'
	| 'bottom'
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right'

/** Text justification options */
export type TextJustify = 'left' | 'center' | 'right'

/** Writing mode for text layout */
export type WritingMode = 1 | 2 // 1 = horizontal, 2 = vertical

/** A positioned glyph relative to the text's anchor point */
export interface PositionedGlyph {
	glyph: number // Character code
	x: number // X offset from anchor
	y: number // Y offset from anchor
	vertical: boolean // Vertical text flag
	scale: number // Scale factor
	fontStack: string // Font stack identifier
}

/** Result of text shaping with positioned glyphs and bounds */
export interface Shaping {
	positionedGlyphs: PositionedGlyph[]
	top: number
	bottom: number
	left: number
	right: number
	writingMode: WritingMode
	lineCount: number
	text: string
}

/** A quad representing a single glyph with position and UV coordinates */
export interface GlyphQuad {
	tl: { x: number; y: number } // Top-left offset
	tr: { x: number; y: number } // Top-right offset
	bl: { x: number; y: number } // Bottom-left offset
	br: { x: number; y: number } // Bottom-right offset
	tex: { x: number; y: number; w: number; h: number } // UV coordinates
	writingMode: WritingMode
	glyphOffset: [number, number]
}

/** Glyph map type for shaping */
export type GlyphMap = {
	[fontStack: string]: {
		[glyphId: number]: StyleGlyph | null | undefined
	}
}

/**
 * Get horizontal and vertical alignment values from anchor position
 * Returns values from 0 to 1 where:
 * - horizontalAlign: 0 = left, 0.5 = center, 1 = right
 * - verticalAlign: 0 = top, 0.5 = center, 1 = bottom
 */
function getAnchorAlignment(anchor: SymbolAnchor): { horizontalAlign: number; verticalAlign: number } {
	let horizontalAlign = 0.5
	let verticalAlign = 0.5

	switch (anchor) {
		case 'right':
		case 'top-right':
		case 'bottom-right':
			horizontalAlign = 1
			break
		case 'left':
		case 'top-left':
		case 'bottom-left':
			horizontalAlign = 0
			break
	}

	switch (anchor) {
		case 'bottom':
		case 'bottom-right':
		case 'bottom-left':
			verticalAlign = 1
			break
		case 'top':
		case 'top-right':
		case 'top-left':
			verticalAlign = 0
			break
	}

	return { horizontalAlign, verticalAlign }
}

/**
 * Apply horizontal justification to a line of positioned glyphs
 * @param positionedGlyphs - Array of positioned glyphs
 * @param glyphMap - Map of font stacks to glyph data
 * @param start - Start index of the line
 * @param end - End index of the line
 * @param justify - Justification value (0 = left, 0.5 = center, 1 = right)
 */
function justifyLine(
	positionedGlyphs: PositionedGlyph[],
	glyphMap: GlyphMap,
	start: number,
	end: number,
	justify: number,
): void {
	if (!justify) return

	const lastPositionedGlyph = positionedGlyphs[end]
	const positions = glyphMap[lastPositionedGlyph.fontStack]
	const glyph = positions && positions[lastPositionedGlyph.glyph]

	if (glyph) {
		const lastAdvance = glyph.metrics.advance * lastPositionedGlyph.scale
		const lineIndent = (positionedGlyphs[end].x + lastAdvance) * justify

		for (let j = start; j <= end; j++) {
			positionedGlyphs[j].x -= lineIndent
		}
	}
}

/**
 * Apply alignment offset to all positioned glyphs
 * @param positionedGlyphs - Array of positioned glyphs
 * @param justify - Justification value (0 = left, 0.5 = center, 1 = right)
 * @param horizontalAlign - Horizontal alignment (0 = left, 0.5 = center, 1 = right)
 * @param verticalAlign - Vertical alignment (0 = top, 0.5 = center, 1 = bottom)
 * @param maxLineLength - Maximum line length in pixels
 * @param lineHeight - Line height in pixels
 * @param lineCount - Number of lines
 */
function align(
	positionedGlyphs: PositionedGlyph[],
	justify: number,
	horizontalAlign: number,
	verticalAlign: number,
	maxLineLength: number,
	lineHeight: number,
	lineCount: number,
): void {
	const shiftX = (justify - horizontalAlign) * maxLineLength
	const shiftY = (-verticalAlign * lineCount + 0.5) * lineHeight

	for (let j = 0; j < positionedGlyphs.length; j++) {
		positionedGlyphs[j].x += shiftX
		positionedGlyphs[j].y += shiftY
	}
}

/**
 * Shape lines of text into positioned glyphs
 * @param shaping - Shaping result object to populate
 * @param glyphMap - Map of font stacks to glyph data
 * @param lines - Array of text lines
 * @param lineHeight - Line height in pixels
 * @param textAnchor - Anchor position for text
 * @param textJustify - Text justification
 * @param writingMode - Writing mode (horizontal/vertical)
 * @param spacing - Letter spacing in pixels
 * @param fontStack - Font stack identifier
 */
function shapeLines(
	shaping: Shaping,
	glyphMap: GlyphMap,
	lines: string[],
	lineHeight: number,
	textAnchor: SymbolAnchor,
	textJustify: TextJustify,
	_writingMode: WritingMode,
	spacing: number,
	fontStack: string,
): void {
	// Y offset for baseline alignment (standard value for most fonts)
	const yOffset = -17

	let x = 0
	let y = yOffset

	let maxLineLength = 0
	const positionedGlyphs = shaping.positionedGlyphs

	// Convert justify string to numeric value
	const justify = textJustify === 'right' ? 1 : textJustify === 'left' ? 0 : 0.5

	for (const line of lines) {
		const lineStartIndex = positionedGlyphs.length

		for (const char of line) {
			const positions = glyphMap[fontStack]
			const charCode = char.charCodeAt(0)
			const glyph = positions && positions[charCode]

			if (glyph) {
				positionedGlyphs.push({
					glyph: charCode,
					x,
					y,
					vertical: false,
					scale: 1,
					fontStack,
				})
				x += glyph.metrics.advance + spacing
			}
		}

		// Apply horizontal justification to the line
		if (positionedGlyphs.length !== lineStartIndex) {
			const lineLength = x - spacing
			maxLineLength = Math.max(lineLength, maxLineLength)
			justifyLine(positionedGlyphs, glyphMap, lineStartIndex, positionedGlyphs.length - 1, justify)
		}

		x = 0
		y += lineHeight
	}

	// Apply alignment based on anchor position
	const { horizontalAlign, verticalAlign } = getAnchorAlignment(textAnchor)
	align(positionedGlyphs, justify, horizontalAlign, verticalAlign, maxLineLength, lineHeight, lines.length)

	// Calculate bounding box
	const height = y - yOffset

	shaping.top += -verticalAlign * height
	shaping.bottom = shaping.top + height
	shaping.left += -horizontalAlign * maxLineLength
	shaping.right = shaping.left + maxLineLength
}

/**
 * Shape text into positioned glyphs with proper layout and alignment
 *
 * Requirements covered:
 * - 2.1: Calculate glyph positions based on character advance values
 * - 2.2: Apply horizontal alignment (LEFT, CENTER, RIGHT)
 * - 2.3: Apply vertical alignment (TOP, CENTER, BOTTOM)
 * - 2.4: Return shaping bounds (left, right, top, bottom) for collision detection
 *
 * @param text - Text string to shape
 * @param glyphMap - Map of font stacks to glyph data
 * @param fontStack - Font stack identifier
 * @param maxWidth - Maximum line width (for line breaking, not yet implemented)
 * @param lineHeight - Line height in pixels
 * @param textAnchor - Anchor position for text placement
 * @param textJustify - Text justification (left, center, right)
 * @param spacing - Letter spacing in pixels
 * @param translate - Offset from anchor point [x, y]
 * @param writingMode - Writing mode (1 = horizontal, 2 = vertical)
 * @returns Shaping result with positioned glyphs and bounds, or null if no glyphs
 */
export function shapeText(
	text: string,
	glyphMap: GlyphMap,
	fontStack: string,
	_maxWidth: number,
	lineHeight: number,
	textAnchor: SymbolAnchor,
	textJustify: TextJustify,
	spacing: number,
	translate: [number, number],
	writingMode: WritingMode = 1,
): Shaping | null {
	// Handle empty text
	if (!text || text.length === 0) {
		return null
	}

	// Split text into lines
	const lines = text.split('\n')

	const positionedGlyphs: PositionedGlyph[] = []
	const shaping: Shaping = {
		positionedGlyphs,
		text,
		top: translate[1],
		bottom: translate[1],
		left: translate[0],
		right: translate[0],
		writingMode,
		lineCount: lines.length,
	}

	shapeLines(shaping, glyphMap, lines, lineHeight, textAnchor, textJustify, writingMode, spacing, fontStack)

	// Return null if no glyphs were positioned
	if (positionedGlyphs.length === 0) {
		return null
	}

	return shaping
}

/**
 * Generate glyph quads from a shaping result for rendering
 *
 * Requirements covered:
 * - 2.5: Produce quads with correct UV coordinates from the atlas
 *
 * @param shaping - Shaping result from shapeText
 * @param textOffset - Additional offset for text placement [x, y]
 * @param alongLine - Whether text is placed along a line (affects offset calculation)
 * @param positions - Glyph positions from GlyphAtlas
 * @returns Array of glyph quads for rendering
 */
export function getGlyphQuads(
	shaping: Shaping,
	textOffset: [number, number],
	alongLine: boolean,
	positions: GlyphPositions,
): GlyphQuad[] {
	const positionedGlyphs = shaping.positionedGlyphs
	const quads: GlyphQuad[] = []

	for (const positionedGlyph of positionedGlyphs) {
		const glyphPositions = positions[positionedGlyph.fontStack]
		const glyph = glyphPositions && glyphPositions[positionedGlyph.glyph]

		if (!glyph) continue

		const rect = glyph.rect
		if (!rect) continue

		// Buffer around glyphs in the atlas
		const rectBuffer = GLYPH_PBF_BORDER + GLYPH_PADDING

		// Half advance for centering
		const halfAdvance = (glyph.metrics.advance * positionedGlyph.scale) / 2

		// Glyph offset for line placement
		const glyphOffset: [number, number] = alongLine ? [positionedGlyph.x + halfAdvance, positionedGlyph.y] : [0, 0]

		// Built-in offset for point placement
		const builtInOffset = alongLine
			? [0, 0]
			: [positionedGlyph.x + halfAdvance + textOffset[0], positionedGlyph.y + textOffset[1]]

		// Calculate quad corners
		const x1 = (glyph.metrics.left - rectBuffer) * positionedGlyph.scale - halfAdvance + builtInOffset[0]
		const y1 = (-glyph.metrics.top - rectBuffer) * positionedGlyph.scale + builtInOffset[1]
		const x2 = x1 + rect.w * positionedGlyph.scale
		const y2 = y1 + rect.h * positionedGlyph.scale

		quads.push({
			tl: { x: x1, y: y1 },
			tr: { x: x2, y: y1 },
			bl: { x: x1, y: y2 },
			br: { x: x2, y: y2 },
			tex: rect,
			writingMode: shaping.writingMode,
			glyphOffset,
		})
	}

	return quads
}
