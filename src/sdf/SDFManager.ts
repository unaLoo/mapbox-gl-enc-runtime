/**
 * SDF Manager
 * Singleton managing TinySDF instance, glyph cache, and texture atlas for text rendering
 */
import TinySDF from '@mapbox/tiny-sdf'

/**
 * Configuration for SDF generation
 */
export interface SDFConfig {
	fontSize: number // Base font size for SDF generation (default: 48)
	fontFamily: string // Font family (default: 'Microsoft YaHei', 'PingFang SC', sans-serif)
	buffer: number // SDF buffer size (default: 4)
	radius: number // SDF radius (default: 12)
	cutoff: number // SDF cutoff (default: 0.25)
	atlasSize: number // Atlas texture size (default: 1024)
}

/**
 * Glyph metrics returned by TinySDF
 */
export interface GlyphMetrics {
	width: number // Glyph bitmap width (including buffer)
	height: number // Glyph bitmap height (including buffer)
	glyphWidth: number // Actual glyph width (excluding buffer)
	glyphHeight: number // Actual glyph height (excluding buffer)
	glyphTop: number // Distance from baseline to top
	glyphLeft: number // Left bearing
	glyphAdvance: number // Horizontal advance
}

/**
 * Cached glyph with atlas position
 */
export interface CachedGlyph {
	char: string
	metrics: GlyphMetrics
	atlasIndex: number // Which atlas texture
	uvBounds: {
		// UV coordinates in atlas
		u0: number
		v0: number
		u1: number
		v1: number
	}
}

/**
 * Texture atlas for storing glyph SDF data
 */
export interface TextureAtlas {
	texture: WebGLTexture
	width: number
	height: number
	nextX: number // Next available X position
	nextY: number // Current row Y position
	rowHeight: number // Current row max height
}

/**
 * Default SDF configuration
 */
const DEFAULT_CONFIG: SDFConfig = {
	fontSize: 48,
	fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
	buffer: 4,
	radius: 12,
	cutoff: 0.25,
	atlasSize: 1024,
}

/**
 * SDF Manager
 * Singleton that manages SDF glyph generation, caching, and texture atlas for TX rendering
 */
export class SDFManager {
	private static instance: SDFManager | null = null

	private gl: WebGL2RenderingContext | null = null
	private tinySdf: TinySDF | null = null
	private glyphCache: Map<string, CachedGlyph> = new Map()
	private atlases: TextureAtlas[] = []
	private config: SDFConfig = { ...DEFAULT_CONFIG }

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): SDFManager {
		if (!SDFManager.instance) {
			SDFManager.instance = new SDFManager()
		}
		return SDFManager.instance
	}

	/**
	 * Initialize with WebGL context and optional configuration
	 * Creates TinySDF instance with configured font settings
	 * @param gl WebGL2 rendering context
	 * @param config Optional partial configuration to override defaults
	 */
	initialize(gl: WebGL2RenderingContext, config?: Partial<SDFConfig>): void {
		this.gl = gl

		// Merge provided config with defaults
		if (config) {
			this.config = { ...DEFAULT_CONFIG, ...config }
		}

		// Create TinySDF instance with configured settings
		this.tinySdf = new TinySDF({
			fontSize: this.config.fontSize,
			fontFamily: this.config.fontFamily,
			buffer: this.config.buffer,
			radius: this.config.radius,
			cutoff: this.config.cutoff,
		})

		// Create initial texture atlas
		this.createNewAtlas()
	}

	/**
	 * Check if the manager has been initialized
	 */
	isInitialized(): boolean {
		return this.gl !== null && this.tinySdf !== null
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): SDFConfig {
		return { ...this.config }
	}

	/**
	 * Get glyph from cache or generate new one
	 * @param char Single character to get glyph for
	 * @returns CachedGlyph with metrics and atlas UV coordinates
	 */
	getGlyph(char: string): CachedGlyph {
		if (!this.gl || !this.tinySdf) {
			throw new Error('[SDFManager] Not initialized. Call initialize() first.')
		}

		// Return cached glyph if available
		const cached = this.glyphCache.get(char)
		if (cached) {
			return cached
		}

		// Generate new glyph
		return this.generateGlyph(char)
	}

	/**
	 * Get atlas texture by index
	 * @param index Atlas index
	 * @returns WebGL texture
	 */
	getAtlasTexture(index: number): WebGLTexture {
		if (index < 0 || index >= this.atlases.length) {
			throw new Error(`[SDFManager] Invalid atlas index: ${index}`)
		}
		return this.atlases[index].texture
	}

	/**
	 * Measure text dimensions at a given font size
	 * @param text Text string to measure
	 * @param fontSize Target font size
	 * @returns Width and height of the text
	 */
	measureText(text: string, fontSize: number): { width: number; height: number } {
		if (!this.tinySdf) {
			throw new Error('[SDFManager] Not initialized. Call initialize() first.')
		}

		const scale = fontSize / this.config.fontSize
		let width = 0
		let maxHeight = 0

		for (const char of text) {
			const glyph = this.getGlyph(char)
			width += glyph.metrics.glyphAdvance * scale
			const charHeight = glyph.metrics.glyphHeight * scale
			if (charHeight > maxHeight) {
				maxHeight = charHeight
			}
		}

		return { width, height: maxHeight }
	}

	/**
	 * Dispose all resources
	 */
	dispose(): void {
		if (this.gl) {
			// Delete all atlas textures
			for (const atlas of this.atlases) {
				this.gl.deleteTexture(atlas.texture)
			}
		}

		// Clear all caches
		this.glyphCache.clear()
		this.atlases = []
		this.tinySdf = null
		this.gl = null
	}

	/**
	 * Generate SDF glyph and add to atlas
	 */
	private generateGlyph(char: string): CachedGlyph {
		if (!this.gl || !this.tinySdf) {
			throw new Error('[SDFManager] Not initialized')
		}

		// Handle control characters - return zero-width glyph
		if (char.charCodeAt(0) < 32) {
			const emptyGlyph: CachedGlyph = {
				char,
				metrics: {
					width: 0,
					height: 0,
					glyphWidth: 0,
					glyphHeight: 0,
					glyphTop: 0,
					glyphLeft: 0,
					glyphAdvance: 0,
				},
				atlasIndex: 0,
				uvBounds: { u0: 0, v0: 0, u1: 0, v1: 0 },
			}
			this.glyphCache.set(char, emptyGlyph)
			return emptyGlyph
		}

		// Generate SDF data using TinySDF
		const result = this.tinySdf.draw(char)

		const metrics: GlyphMetrics = {
			width: result.width,
			height: result.height,
			glyphWidth: result.glyphWidth,
			glyphHeight: result.glyphHeight,
			glyphTop: result.glyphTop,
			glyphLeft: result.glyphLeft,
			glyphAdvance: result.glyphAdvance,
		}

		// Find space in atlas or create new one
		const { atlasIndex, x, y } = this.findAtlasSpace(metrics.width, metrics.height)

		// Upload glyph data to atlas texture
		this.uploadGlyphToAtlas(atlasIndex, x, y, result.data, metrics.width, metrics.height)

		// Calculate UV coordinates
		const atlas = this.atlases[atlasIndex]
		const uvBounds = {
			u0: x / atlas.width,
			v0: y / atlas.height,
			u1: (x + metrics.width) / atlas.width,
			v1: (y + metrics.height) / atlas.height,
		}

		// Create and cache glyph
		const cachedGlyph: CachedGlyph = {
			char,
			metrics,
			atlasIndex,
			uvBounds,
		}

		this.glyphCache.set(char, cachedGlyph)
		return cachedGlyph
	}

	/**
	 * Find space in existing atlas or create new one
	 */
	private findAtlasSpace(width: number, height: number): { atlasIndex: number; x: number; y: number } {
		// Try to fit in existing atlases
		for (let i = 0; i < this.atlases.length; i++) {
			const atlas = this.atlases[i]

			// Check if glyph fits in current row
			if (atlas.nextX + width <= atlas.width) {
				const x = atlas.nextX
				const y = atlas.nextY

				// Update atlas position
				atlas.nextX += width
				atlas.rowHeight = Math.max(atlas.rowHeight, height)

				return { atlasIndex: i, x, y }
			}

			// Try next row
			if (atlas.nextY + atlas.rowHeight + height <= atlas.height) {
				atlas.nextY += atlas.rowHeight
				atlas.nextX = width
				atlas.rowHeight = height

				return { atlasIndex: i, x: 0, y: atlas.nextY }
			}
		}

		// Create new atlas
		const newAtlasIndex = this.createNewAtlas()
		const atlas = this.atlases[newAtlasIndex]
		atlas.nextX = width
		atlas.rowHeight = height

		return { atlasIndex: newAtlasIndex, x: 0, y: 0 }
	}

	/**
	 * Create a new texture atlas
	 */
	private createNewAtlas(): number {
		if (!this.gl) {
			throw new Error('[SDFManager] WebGL context not available')
		}

		const texture = this.gl.createTexture()
		if (!texture) {
			throw new Error('[SDFManager] Failed to create atlas texture')
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)

		// Initialize empty texture with R8 format for SDF data
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.R8,
			this.config.atlasSize,
			this.config.atlasSize,
			0,
			this.gl.RED,
			this.gl.UNSIGNED_BYTE,
			null,
		)

		// Set texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

		const atlas: TextureAtlas = {
			texture,
			width: this.config.atlasSize,
			height: this.config.atlasSize,
			nextX: 0,
			nextY: 0,
			rowHeight: 0,
		}

		this.atlases.push(atlas)
		return this.atlases.length - 1
	}

	/**
	 * Upload glyph SDF data to atlas texture
	 */
	private uploadGlyphToAtlas(
		atlasIndex: number,
		x: number,
		y: number,
		data: Uint8ClampedArray,
		width: number,
		height: number,
	): void {
		if (!this.gl) return

		const atlas = this.atlases[atlasIndex]
		this.gl.bindTexture(this.gl.TEXTURE_2D, atlas.texture)

		// Upload glyph data as sub-image
		this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, x, y, width, height, this.gl.RED, this.gl.UNSIGNED_BYTE, data)
	}
}
