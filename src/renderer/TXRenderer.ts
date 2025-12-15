/**
 * TXRenderer - Text rendering using Mapbox-compatible pipeline
 *
 * This renderer implements the refactored text rendering pipeline with:
 * - GlyphAtlas for efficient glyph packing using potpack
 * - Text shaping with proper character metrics and alignment
 * - CollisionIndex for Mapbox-compatible collision detection
 * - Matrix transformations for proper positioning at all zoom levels
 *
 * @requirements 1.1, 1.2, 1.3, 1.4 - Glyph atlas management
 * @requirements 4.1, 4.2, 4.3, 4.4 - Matrix transformations
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5 - Per-frame buffer building with collision
 * @requirements 8.1, 8.2, 8.3, 8.4 - Event-driven architecture integration
 */

import { BaseRenderer } from './BaseRenderer'
import { ShaderManager } from './shader_manager'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { getEventBus } from '@/utils/eventBus'
import { GlyphAtlas, StyleGlyph } from '@/sdf/GlyphAtlas'
import { AlphaImage } from '@/sdf/AlphaImage'
import { shapeText, getGlyphQuads, SymbolAnchor, TextJustify } from '@/sdf/shapeText'
import { CollisionIndex, SingleCollisionBox, CollisionTransform } from '@/collision/CollisionIndex'
import { pixelsToTileUnits, getLabelPlaneMatrix, getGlCoordMatrix } from '@/utils/symbol_projection'
import TinySDF from '@mapbox/tiny-sdf'

/**
 * Text instance representing a single text label to be rendered
 */
interface TextInstance {
	id: string
	position: [number, number]
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
interface TXRenderInfo {
	textInstances: TextInstance[]
	instanceCount: number
}


/**
 * Map transform interface for collision detection and projection
 */
interface MapTransform {
	width: number
	height: number
	angle: number
	cameraToCenterDistance: number
	zoom: number
}

/**
 * Default character set for initial glyph atlas
 * Includes ASCII printable characters and common punctuation
 */
const DEFAULT_CHARSET = (() => {
	const chars: string[] = []
	// ASCII printable characters (32-126)
	for (let i = 32; i <= 126; i++) {
		chars.push(String.fromCharCode(i))
	}
	// Common extended characters
	chars.push('°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿')
	return chars
})()

/**
 * Default font stack identifier
 */
const DEFAULT_FONT_STACK = 'default'

/**
 * SDF generation configuration
 */
const SDF_CONFIG = {
	fontSize: 34,
	fontFamily: "sans-serif",
	buffer: 5,
	radius: 8,
	cutoff: 0.25,
}

/**
 * Generate SDF glyph data using TinySDF
 *
 * @param tinySdf - TinySDF instance
 * @param char - Character to generate
 * @returns StyleGlyph with bitmap and metrics
 *
 * @requirements 1.1 - Generate glyph bitmap for atlas packing
 */
export function generateSDF(tinySdf: TinySDF, char: string): StyleGlyph {
	const result = tinySdf.draw(char)

	// Create AlphaImage from TinySDF result
	const bitmap = new AlphaImage(
		{ width: result.width, height: result.height },
		result.data,
	)

	return {
		id: char.charCodeAt(0),
		bitmap,
		metrics: {
			width: result.glyphWidth,
			height: result.glyphHeight,
			left: result.glyphLeft,
			top: result.glyphTop,
			advance: result.glyphAdvance,
		},
	}
}

/**
 * Convert horizontal alignment value to TextJustify
 */
function getTextJustify(horizontalAlign: 1 | 2 | 3): TextJustify {
	switch (horizontalAlign) {
		case 1: return 'left'
		case 2: return 'center'
		case 3: return 'right'
		default: return 'center'
	}
}

/**
 * Convert alignment values to SymbolAnchor
 */
function getSymbolAnchor(horizontalAlign: 1 | 2 | 3, verticalAlign: 1 | 2 | 3): SymbolAnchor {
	const h = horizontalAlign === 1 ? 'left' : horizontalAlign === 3 ? 'right' : ''
	const v = verticalAlign === 1 ? 'top' : verticalAlign === 3 ? 'bottom' : ''

	if (h && v) return `${v}-${h}` as SymbolAnchor
	if (h) return h as SymbolAnchor
	if (v) return v as SymbolAnchor
	return 'center'
}


export class TXRenderer extends BaseRenderer {
	private shaderManager: ShaderManager

	// Glyph atlas management (Requirements 1.1, 1.2, 1.3, 1.4)
	private tinySdf: TinySDF | null = null
	private glyphMap: { [fontStack: string]: { [glyphId: number]: StyleGlyph | null } } = {}
	private glyphAtlas: GlyphAtlas | null = null
	private glyphAtlasTexture: WebGLTexture | null = null
	private fontStack: string = DEFAULT_FONT_STACK

	// Collision detection (Requirements 6.1)
	private collisionIndex: CollisionIndex | null = null

	// WebGL buffers for rendering
	private quadVBO: WebGLBuffer | null = null
	private instanceVBO: WebGLBuffer | null = null
	private vao: WebGLVertexArrayObject | null = null

	// Context loss handling
	private contextLost: boolean = false
	private contextLostHandler: () => void
	private contextRestoredHandler: () => void

	// Viewport change handling
	private viewportChangeHandler: () => void

	constructor(gl: WebGL2RenderingContext) {
		super('TX', gl)
		this.shaderManager = ShaderManager.getInstance()
		this.shaderManager.initialize(this.gl)

		// Initialize glyph atlas (Requirements 1.1, 1.2, 1.3, 1.4)
		this.initGlyphAtlas()

		// Initialize WebGL resources
		this.initializeWebGLResources()

		// Set up context loss handlers
		this.contextLostHandler = this.handleContextLost.bind(this)
		this.contextRestoredHandler = this.handleContextRestored.bind(this)

		const canvas = this.gl.canvas
		canvas.addEventListener('webglcontextlost', this.contextLostHandler)
		canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler)

		// Set up viewport change handler for collision recalculation
		this.viewportChangeHandler = this.handleViewportChange.bind(this)
		const eventBus = getEventBus()
		eventBus?.on('viewportChange', this.viewportChangeHandler)
	}

	/**
	 * Initialize glyph atlas with default character set
	 *
	 * @requirements 1.1 - Pack glyph bitmaps using potpack algorithm
	 * @requirements 1.2 - Store position information for each glyph
	 * @requirements 1.3 - Produce AlphaImage with all glyphs properly positioned
	 * @requirements 1.4 - Return rect and metrics for UV coordinate calculation
	 */
	private initGlyphAtlas(): void {
		// Create TinySDF instance
		this.tinySdf = new TinySDF({
			fontSize: SDF_CONFIG.fontSize,
			fontFamily: SDF_CONFIG.fontFamily,
			buffer: SDF_CONFIG.buffer,
			radius: SDF_CONFIG.radius,
			cutoff: SDF_CONFIG.cutoff,
		})

		// Initialize glyph map with default character set
		this.glyphMap[this.fontStack] = {}
		for (const char of DEFAULT_CHARSET) {
			const glyph = generateSDF(this.tinySdf, char)
			this.glyphMap[this.fontStack][glyph.id] = glyph
		}

		// Create GlyphAtlas from glyphMap using potpack
		this.glyphAtlas = new GlyphAtlas(this.glyphMap)

		// Create WebGL texture from atlas image
		this.createAtlasTexture()
	}

	/**
	 * Create WebGL texture from atlas image
	 */
	private createAtlasTexture(): void {
		if (!this.glyphAtlas) return

		// Delete existing texture if any
		if (this.glyphAtlasTexture) {
			this.gl.deleteTexture(this.glyphAtlasTexture)
		}

		this.glyphAtlasTexture = this.gl.createTexture()
		if (!this.glyphAtlasTexture) {
			console.error('[TXRenderer] Failed to create atlas texture')
			return
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.glyphAtlasTexture)

		// Upload atlas image data
		const image = this.glyphAtlas.image
		// console.log(image.data.byteLength, image.width * image.height) // 65260 65260
		// debugger
		this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.R8,
			image.width,
			image.height,
			0,
			this.gl.RED,
			this.gl.UNSIGNED_BYTE,
			image.data,
		)
		// WebGL: INVALID_OPERATION: texImage2D: ArrayBufferView not big enough for request

		// Set texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
	}

	/**
	 * Ensure a glyph exists in the atlas, generating it if needed
	 */
	private ensureGlyph(char: string): void {
		const charCode = char.charCodeAt(0)
		if (this.glyphMap[this.fontStack]?.[charCode]) return

		if (!this.tinySdf) return

		// Generate new glyph
		const glyph = generateSDF(this.tinySdf, char)
		if (!this.glyphMap[this.fontStack]) {
			this.glyphMap[this.fontStack] = {}
		}
		this.glyphMap[this.fontStack][charCode] = glyph

		// Rebuild atlas with new glyph
		this.glyphAtlas = new GlyphAtlas(this.glyphMap)
		this.createAtlasTexture()
	}


	/**
	 * Initialize WebGL resources for instanced rendering
	 */
	private initializeWebGLResources(): void {
		// Create VAO
		this.vao = this.gl.createVertexArray()

		// Create quad VBO (unit quad vertices)
		this.quadVBO = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadVBO)
		// Quad vertices: (0,0), (1,0), (0,1), (1,1) for triangle strip
		const quadVertices = new Float32Array([
			0, 0, // bottom-left
			1, 0, // bottom-right
			0, 1, // top-left
			1, 1, // top-right
		])
		this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW)

		// Create instance VBO (will be populated per-frame)
		this.instanceVBO = this.gl.createBuffer()
	}

	/**
	 * Update collision index for current frame
	 *
	 * @requirements 6.1 - Reset collision index for current frame
	 */
	private updateCollisionIndex(transform: MapTransform): void {
		const collisionTransform: CollisionTransform = {
			width: transform.width,
			height: transform.height,
			cameraToCenterDistance: transform.cameraToCenterDistance,
		}

		// Create new collision index for this frame
		this.collisionIndex = new CollisionIndex(collisionTransform)
	}

	/**
	 * Handle bucketsReady event from TXBucket
	 * Pre-caches all glyphs and stores render info
	 *
	 * @requirements 8.2 - Receive and store render info
	 */
	handleBucketsReady(tile: Tile, renderInfo: TXRenderInfo): void {
		const tileId = tile.overscaledTileID.toString()

		// Pre-cache all glyphs from text instances
		for (const textInstance of renderInfo.textInstances) {
			for (const char of textInstance.text) {
				this.ensureGlyph(char)
			}
		}

		// Store text instances for this tile
		this.tileRenderInfo.set(tileId, renderInfo)

		// Trigger render frame
		const eventBus = getEventBus()
		eventBus?.trigger('renderFrame')
	}

	/**
	 * Build text buffers with collision detection
	 *
	 * @requirements 6.2 - Shape each text instance and check for collisions
	 * @requirements 6.3 - Generate glyph quads for non-colliding text
	 * @requirements 6.4 - Skip text instances that fail collision
	 */
	private buildTextBuffers(
		textInstances: TextInstance[],
		posMatrix: mat4,
		_overscaledZ: number,
		_viewport: { width: number; height: number },
	): {
		positions: number[]
		sizes: number[]
		uvBounds: number[]
		colors: number[]
		offsets: number[]
		count: number
	} {
		const positions: number[] = []
		const sizes: number[] = []
		const uvBounds: number[] = []
		const colors: number[] = []
		const offsets: number[] = []

		if (!this.glyphAtlas || !this.collisionIndex) {
			return { positions, sizes, uvBounds, colors, offsets, count: 0 }
		}

		const glyphPositions = this.glyphAtlas.positions

		for (const textInstance of textInstances) {
			const { position, text, style } = textInstance

			// Shape text using shapeText function
			const anchor = getSymbolAnchor(style.horizontalAlign, style.verticalAlign)
			const justify = getTextJustify(style.horizontalAlign)

			const shaping = shapeText(
				text,
				this.glyphMap,
				this.fontStack,
				0, // maxWidth (no line breaking)
				style.fontSize * 1.2, // lineHeight
				anchor,
				justify,
				0, // spacing
				[0, 0], // translate
				1, // writingMode (horizontal)
			)

			if (!shaping) continue

			// Calculate collision box from shaping bounds
			// const scale = style.fontSize / SDF_CONFIG.fontSize
			const scale = 0.03
			const collisionBox: SingleCollisionBox = {
				x1: shaping.left * scale,
				y1: shaping.top * scale,
				x2: shaping.right * scale,
				y2: shaping.bottom * scale,
				anchorPointX: position[0],
				anchorPointY: position[1],
			}

			// Check collision
			const result = this.collisionIndex.placeCollisionBox(
				collisionBox,
				false, // allowOverlap
				1, // textPixelRatio
				posMatrix,
			)

			// Skip if collision detected (empty box array)
			if (result.box.length === 0) continue

			// Insert collision box for future checks
			this.collisionIndex.insertCollisionBox(
				result.box,
				0, // bucketInstanceId
				0, // featureIndex
				0, // collisionGroupID
			)

			// Generate glyph quads
			const quads = getGlyphQuads(
				shaping,
				[0, 0], // textOffset
				false, // alongLine
				glyphPositions,
			)

			// Add quads to buffers
			for (const quad of quads) {
				// Position (tile-local anchor)
				positions.push(position[0], position[1])

				// Size (quad dimensions in pixels)
				const quadWidth = (quad.br.x - quad.tl.x) * scale
				const quadHeight = (quad.br.y - quad.tl.y) * scale
				sizes.push(quadWidth, quadHeight)

				// UV bounds from atlas
				const atlasWidth = this.glyphAtlas.image.width
				const atlasHeight = this.glyphAtlas.image.height
				uvBounds.push(
					quad.tex.x / atlasWidth,
					quad.tex.y / atlasHeight,
					(quad.tex.x + quad.tex.w) / atlasWidth,
					(quad.tex.y + quad.tex.h) / atlasHeight,
				)

				// Color
				colors.push(style.color[0], style.color[1], style.color[2])

				// Offset (glyph position relative to anchor)
				offsets.push(quad.tl.x * scale, quad.tl.y * scale)
			}
		}

		return {
			positions,
			sizes,
			uvBounds,
			colors,
			offsets,
			count: positions.length / 2,
		}
	}


	/**
	 * Render text for a tile
	 *
	 * @requirements 4.1 - Calculate label plane matrix
	 * @requirements 4.2 - Calculate GL coordinate matrix
	 * @requirements 4.3 - Use pixelsToTileUnits for proper scale conversion
	 * @requirements 4.4 - Pass matrices to shader for correct positioning
	 * @requirements 6.5 - Draw vertex buffers with instanced rendering
	 */
	renderTile(
		tile: Tile,
		options: {
			sharingVPMatrix: mat4
			viewport: { width: number; height: number }
			tilePosMatrix: mat4
			transform?: MapTransform
		},
	): void {
		// Skip rendering if context is lost
		if (this.contextLost) return

		const tileId = tile.overscaledTileID.toString()
		const renderInfo = this.tileRenderInfo.get(tileId) as TXRenderInfo | undefined
		if (!renderInfo || renderInfo.textInstances.length === 0) return

		// Get or create transform
		const transform: MapTransform = options.transform || {
			width: options.viewport.width,
			height: options.viewport.height,
			angle: 0,
			cameraToCenterDistance: options.viewport.height / 2,
			zoom: tile.overscaledTileID.overscaledZ,
		}

		// Reset collision index for this frame (Requirements 6.1)
		this.updateCollisionIndex(transform)

		// Calculate MVP matrix
		const mvpMatrix = mat4.create()
		mat4.mul(mvpMatrix, options.sharingVPMatrix, options.tilePosMatrix)

		// Calculate pixelsToTileUnits scale (Requirements 4.3)
		const overscaledZ = tile.overscaledTileID.overscaledZ
		const canonicalZ = tile.overscaledTileID.canonical.z
		const pixelsToTileUnitsScale = pixelsToTileUnits(overscaledZ, 1, canonicalZ)

		// Calculate label plane matrix (Requirements 4.1)
		const labelPlaneMatrix = getLabelPlaneMatrix(
			mvpMatrix,
			false, // pitchWithMap
			false, // rotateWithMap
			transform,
			pixelsToTileUnitsScale,
		)

		// Calculate GL coordinate matrix (Requirements 4.2)
		const glCoordMatrix = getGlCoordMatrix(
			mvpMatrix,
			false, // pitchWithMap
			false, // rotateWithMap
			transform,
			pixelsToTileUnitsScale,
		)

		// Build text buffers with collision detection (Requirements 6.2, 6.3, 6.4)
		const buffers = this.buildTextBuffers(
			renderInfo.textInstances,
			mvpMatrix,
			overscaledZ,
			options.viewport,
		)

		if (buffers.count === 0) return

		// Render the glyphs (Requirements 6.5, 7.1, 7.2, 7.3, 7.4, 7.5)
		this.renderGlyphs(
			buffers,
			mvpMatrix,
			options.viewport,
			labelPlaneMatrix,
			glCoordMatrix,
			pixelsToTileUnitsScale,
		)
	}

	/**
	 * Render glyph instances using instanced drawing
	 *
	 * @requirements 6.5 - Draw vertex buffers with instanced rendering
	 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5 - SDF shader with halo support
	 */
	private renderGlyphs(
		buffers: {
			positions: number[]
			sizes: number[]
			uvBounds: number[]
			colors: number[]
			offsets: number[]
			count: number
		},
		mvpMatrix: mat4,
		viewport: { width: number; height: number },
		labelPlaneMatrix: mat4,
		glCoordMatrix: mat4,
		extrudeScale: number,
	): void {
		const program = this.shaderManager.getSdfProgram()
		if (!program || !this.vao || !this.quadVBO || !this.instanceVBO || !this.glyphAtlasTexture) return

		this.gl.useProgram(program)

		// Set up VAO
		this.gl.bindVertexArray(this.vao)

		// Set up quad vertex attribute (a_quadVertex)
		const quadVertexLoc = this.gl.getAttribLocation(program, 'a_quadVertex')
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadVBO)
		this.gl.enableVertexAttribArray(quadVertexLoc)
		this.gl.vertexAttribPointer(quadVertexLoc, 2, this.gl.FLOAT, false, 0, 0)

		// Get instance attribute locations
		const positionLoc = this.gl.getAttribLocation(program, 'a_position')
		const sizeLoc = this.gl.getAttribLocation(program, 'a_size')
		const uvBoundsLoc = this.gl.getAttribLocation(program, 'a_uvBounds')
		const colorLoc = this.gl.getAttribLocation(program, 'a_color')
		const offsetLoc = this.gl.getAttribLocation(program, 'a_offset')

		// Set transformation matrix uniforms
		const matrixLoc = this.gl.getUniformLocation(program, 'u_matrix')
		this.gl.uniformMatrix4fv(matrixLoc, false, mvpMatrix)

		const labelMatrixLoc = this.gl.getUniformLocation(program, 'u_label_matrix')
		this.gl.uniformMatrix4fv(labelMatrixLoc, false, labelPlaneMatrix)

		const glMatrixLoc = this.gl.getUniformLocation(program, 'u_gl_matrix')
		this.gl.uniformMatrix4fv(glMatrixLoc, false, glCoordMatrix)

		// Set viewport and scaling uniforms
		const viewportLoc = this.gl.getUniformLocation(program, 'u_viewport')
		this.gl.uniform2f(viewportLoc, viewport.width, viewport.height)

		const extrudeScaleLoc = this.gl.getUniformLocation(program, 'u_extrude_scale')
		this.gl.uniform1f(extrudeScaleLoc, extrudeScale)

		const gammaScaleLoc = this.gl.getUniformLocation(program, 'u_gamma_scale')
		this.gl.uniform1f(gammaScaleLoc, 1.0) // Default gamma scale (no pitch adjustment)

		// Set atlas texture uniform
		const atlasLoc = this.gl.getUniformLocation(program, 'u_atlas')
		this.gl.uniform1i(atlasLoc, 0)

		// Set font styling uniforms (Requirements 7.3)
		const fontColorLoc = this.gl.getUniformLocation(program, 'u_font_color')
		this.gl.uniform4f(fontColorLoc, 0.0, 0.0, 0.0, 1.0) // Default black

		const fontOpacityLoc = this.gl.getUniformLocation(program, 'u_font_opacity')
		this.gl.uniform1f(fontOpacityLoc, 1.0) // Full opacity

		const fontSizeLoc = this.gl.getUniformLocation(program, 'u_font_size')
		this.gl.uniform1f(fontSizeLoc, SDF_CONFIG.fontSize)

		// Set halo styling uniforms (Requirements 7.4)
		const haloColorLoc = this.gl.getUniformLocation(program, 'u_halo_color')
		this.gl.uniform4f(haloColorLoc, 1.0, 1.0, 1.0, 1.0) // Default white halo

		const haloWidthLoc = this.gl.getUniformLocation(program, 'u_halo_width')
		this.gl.uniform1f(haloWidthLoc, 1.0) // Default 1px halo width

		const haloBlurLoc = this.gl.getUniformLocation(program, 'u_halo_blur')
		this.gl.uniform1f(haloBlurLoc, 0.0) // Default no blur

		// Legacy uniforms for backward compatibility
		const gammaLoc = this.gl.getUniformLocation(program, 'u_gamma')
		this.gl.uniform1f(gammaLoc, 0.15) // Anti-aliasing width

		const boldThresholdLoc = this.gl.getUniformLocation(program, 'u_boldThreshold')
		this.gl.uniform1f(boldThresholdLoc, 0.5) // Normal threshold

		// Debug mode
		const debugLoc = this.gl.getUniformLocation(program, 'u_debug')
		this.gl.uniform1i(debugLoc, 0) // Debug off by default

		// Bind atlas texture
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.glyphAtlasTexture)

		// Build instance data
		// Layout: position(2) + size(2) + uvBounds(4) + color(3) + offset(2) = 13 floats per instance
		const instanceData = new Float32Array(buffers.count * 13)
		let offset = 0

		for (let i = 0; i < buffers.count; i++) {
			instanceData[offset++] = buffers.positions[i * 2]
			instanceData[offset++] = buffers.positions[i * 2 + 1]
			instanceData[offset++] = buffers.sizes[i * 2]
			instanceData[offset++] = buffers.sizes[i * 2 + 1]
			instanceData[offset++] = buffers.uvBounds[i * 4]
			instanceData[offset++] = buffers.uvBounds[i * 4 + 1]
			instanceData[offset++] = buffers.uvBounds[i * 4 + 2]
			instanceData[offset++] = buffers.uvBounds[i * 4 + 3]
			instanceData[offset++] = buffers.colors[i * 3]
			instanceData[offset++] = buffers.colors[i * 3 + 1]
			instanceData[offset++] = buffers.colors[i * 3 + 2]
			instanceData[offset++] = buffers.offsets[i * 2]
			instanceData[offset++] = buffers.offsets[i * 2 + 1]
		}

		// Upload instance data
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceVBO)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, instanceData, this.gl.DYNAMIC_DRAW)

		// Set up instance attributes
		const stride = 13 * 4 // 13 floats * 4 bytes

		// a_position (vec2)
		this.gl.enableVertexAttribArray(positionLoc)
		this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, stride, 0)
		this.gl.vertexAttribDivisor(positionLoc, 1)

		// a_size (vec2)
		this.gl.enableVertexAttribArray(sizeLoc)
		this.gl.vertexAttribPointer(sizeLoc, 2, this.gl.FLOAT, false, stride, 8)
		this.gl.vertexAttribDivisor(sizeLoc, 1)

		// a_uvBounds (vec4)
		this.gl.enableVertexAttribArray(uvBoundsLoc)
		this.gl.vertexAttribPointer(uvBoundsLoc, 4, this.gl.FLOAT, false, stride, 16)
		this.gl.vertexAttribDivisor(uvBoundsLoc, 1)

		// a_color (vec3)
		this.gl.enableVertexAttribArray(colorLoc)
		this.gl.vertexAttribPointer(colorLoc, 3, this.gl.FLOAT, false, stride, 32)
		this.gl.vertexAttribDivisor(colorLoc, 1)

		// a_offset (vec2)
		this.gl.enableVertexAttribArray(offsetLoc)
		this.gl.vertexAttribPointer(offsetLoc, 2, this.gl.FLOAT, false, stride, 44)
		this.gl.vertexAttribDivisor(offsetLoc, 1)

		// Enable alpha blending for SDF rendering
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		// Draw instanced quads
		this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, 4, buffers.count)

		// Reset vertex attribute divisors
		this.gl.vertexAttribDivisor(positionLoc, 0)
		this.gl.vertexAttribDivisor(sizeLoc, 0)
		this.gl.vertexAttribDivisor(uvBoundsLoc, 0)
		this.gl.vertexAttribDivisor(colorLoc, 0)
		this.gl.vertexAttribDivisor(offsetLoc, 0)

		// Unbind VAO
		this.gl.bindVertexArray(null)
	}


	/**
	 * Clean up resources for a tile
	 *
	 * @requirements 8.4 - Remove render info when tile is unloaded
	 */
	removeTile(tileId: string): void {
		this.tileRenderInfo.delete(tileId)
	}

	/**
	 * Handle viewport change (pan/zoom)
	 * Triggers re-render to recalculate collisions with new viewport
	 */
	private handleViewportChange(): void {
		// Trigger re-render to recalculate collisions with new viewport
		const eventBus = getEventBus()
		eventBus?.trigger('renderFrame')
	}

	/**
	 * Handle WebGL context loss
	 * Marks the renderer as unable to render until context is restored
	 *
	 * @requirements 8.4 - Handle WebGL context loss
	 */
	private handleContextLost(): void {
		this.contextLost = true
		// WebGL resources are automatically invalidated on context loss
		this.quadVBO = null
		this.instanceVBO = null
		this.vao = null
		this.glyphAtlasTexture = null
	}

	/**
	 * Handle WebGL context restoration
	 * Rebuilds WebGL resources after context is restored
	 *
	 * @requirements 8.4 - Handle WebGL context restoration
	 */
	private handleContextRestored(): void {
		this.contextLost = false

		// Reinitialize shader manager
		this.shaderManager.initialize(this.gl)

		// Reinitialize glyph atlas and texture
		this.initGlyphAtlas()

		// Reinitialize WebGL resources
		this.initializeWebGLResources()

		// Trigger render frame to redraw
		const eventBus = getEventBus()
		eventBus?.trigger('renderFrame')
	}

	/**
	 * Destroy renderer and clean up all resources
	 */
	override destroy(): void {
		super.destroy()

		// Remove context loss handlers
		const canvas = this.gl.canvas
		canvas.removeEventListener('webglcontextlost', this.contextLostHandler)
		canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler)

		// Remove viewport change handler
		const eventBus = getEventBus()
		eventBus?.off('viewportChange', this.viewportChangeHandler)

		// Clean up WebGL resources
		if (this.quadVBO) {
			this.gl.deleteBuffer(this.quadVBO)
			this.quadVBO = null
		}
		if (this.instanceVBO) {
			this.gl.deleteBuffer(this.instanceVBO)
			this.instanceVBO = null
		}
		if (this.vao) {
			this.gl.deleteVertexArray(this.vao)
			this.vao = null
		}
		if (this.glyphAtlasTexture) {
			this.gl.deleteTexture(this.glyphAtlasTexture)
			this.glyphAtlasTexture = null
		}

		// Clear glyph data
		this.glyphMap = {}
		this.glyphAtlas = null
		this.tinySdf = null
		this.collisionIndex = null
	}
}
