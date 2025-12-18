/**
 * Pattern Manager
 * Manages WebGL texture loading, caching, and lifecycle for area pattern fills
 */

/**
 * Result of loading a pattern texture
 */
export interface PatternLoadResult {
	texture: WebGLTexture
	width: number
	height: number
}

/**
 * Pattern Manager
 * Singleton that manages pattern textures for AP (Area Pattern) rendering
 */
export class PatternManager {
	private static instance: PatternManager | null = null

	private gl: WebGL2RenderingContext | null = null

	// Texture cache: URL -> loaded texture result
	private textureCache: Map<string, PatternLoadResult> = new Map()

	// Pending requests: URL -> promise for deduplication
	private pendingRequests: Map<string, Promise<PatternLoadResult>> = new Map()

	// Callbacks waiting for texture to be ready
	private callbacks: Map<string, Set<(result: PatternLoadResult) => void>> = new Map()

	// Fallback texture for error cases
	private fallbackTexture: PatternLoadResult | null = null

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): PatternManager {
		if (!PatternManager.instance) {
			PatternManager.instance = new PatternManager()
		}
		return PatternManager.instance
	}

	/**
	 * Initialize with WebGL context
	 */
	initialize(gl: WebGL2RenderingContext): void {
		this.gl = gl
		this.createFallbackTexture()
	}

	/**
	 * Create 1x1 white fallback texture for error cases
	 */
	private createFallbackTexture(): void {
		if (!this.gl) return

		const texture = this.gl.createTexture()
		if (!texture) {
			console.error('[PatternManager] Failed to create fallback texture')
			return
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)

		// Create 1x1 white pixel
		const pixel = new Uint8Array([255, 255, 255, 255])
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel)

		// Set texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

		this.fallbackTexture = {
			texture,
			width: 1,
			height: 1,
		}
	}

	/**
	 * Get texture from cache, returns null if not loaded yet
	 */
	getTexture(url: string): PatternLoadResult | null {
		return this.textureCache.get(url) || null
	}

	/**
	 * Check if texture is cached
	 */
	hasTexture(url: string): boolean {
		return this.textureCache.has(url)
	}

	/**
	 * Register callback for when texture becomes available
	 */
	onTextureReady(url: string, callback: (result: PatternLoadResult) => void): void {
		// If already cached, call immediately
		const cached = this.textureCache.get(url)
		if (cached) {
			callback(cached)
			return
		}

		// Add to callbacks set
		if (!this.callbacks.has(url)) {
			this.callbacks.set(url, new Set())
		}
		this.callbacks.get(url)!.add(callback)

		// Start loading if not already in progress
		if (!this.pendingRequests.has(url)) {
			this.loadTexture(url)
		}
	}

	/**
	 * Load texture asynchronously
	 * Returns cached texture if available, otherwise loads from URL
	 */
	async loadTexture(url: string): Promise<PatternLoadResult> {
		// Return cached texture if available
		const cached = this.textureCache.get(url)
		if (cached) {
			return cached
		}

		// Return pending request if already loading (deduplication)
		const pending = this.pendingRequests.get(url)
		if (pending) {
			return pending
		}

		// Create new loading promise
		const loadPromise = this.doLoadTexture(url)
		this.pendingRequests.set(url, loadPromise)

		try {
			const result = await loadPromise
			return result
		} finally {
			this.pendingRequests.delete(url)
		}
	}

	/**
	 * Internal texture loading implementation
	 */
	private async doLoadTexture(url: string): Promise<PatternLoadResult> {
		if (!this.gl) {
			console.error('[PatternManager] WebGL context not initialized')
			return this.fallbackTexture!
		}

		try {
			const image = await this.loadImage(url)
			const result = this.createTextureFromImage(image)

			// Cache the result
			this.textureCache.set(url, result)

			// Notify waiting callbacks
			this.notifyCallbacks(url, result)

			return result
		} catch (error) {
			console.error(`[PatternManager] Failed to load pattern texture: ${url}`, error)

			// Return fallback texture on error
			if (this.fallbackTexture) {
				// Cache fallback for this URL to avoid repeated load attempts
				this.textureCache.set(url, this.fallbackTexture)
				this.notifyCallbacks(url, this.fallbackTexture)
				return this.fallbackTexture
			}

			throw error
		}
	}

	/**
	 * Load image from URL
	 */
	private loadImage(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const image = new Image()
			image.crossOrigin = 'anonymous'

			image.onload = () => resolve(image)
			image.onerror = () => reject(new Error(`Failed to load image: ${url}`))

			image.src = url
		})
	}

	/**
	 * Create WebGL texture from loaded image
	 */
	private createTextureFromImage(image: HTMLImageElement): PatternLoadResult {
		if (!this.gl) {
			throw new Error('WebGL context not initialized')
		}

		const texture = this.gl.createTexture()
		if (!texture) {
			throw new Error('Failed to create WebGL texture')
		}

		this.gl.bindTexture(this.gl.TEXTURE_2D, texture)

		// Upload image to texture
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image)

		// Configure texture with REPEAT wrap mode for tiling
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

		return {
			texture,
			width: image.width,
			height: image.height,
		}
	}

	/**
	 * Notify all waiting callbacks for a URL
	 */
	private notifyCallbacks(url: string, result: PatternLoadResult): void {
		const callbackSet = this.callbacks.get(url)
		if (callbackSet) {
			for (const callback of callbackSet) {
				try {
					callback(result)
				} catch (error) {
					console.error('[PatternManager] Callback error:', error)
				}
			}
			this.callbacks.delete(url)
		}
	}

	/**
	 * Dispose all resources
	 */
	dispose(): void {
		if (this.gl) {
			// Delete all cached textures
			for (const result of this.textureCache.values()) {
				this.gl.deleteTexture(result.texture)
			}

			// Delete fallback texture
			if (this.fallbackTexture) {
				this.gl.deleteTexture(this.fallbackTexture.texture)
				this.fallbackTexture = null
			}
		}

		// Clear all maps
		this.textureCache.clear()
		this.pendingRequests.clear()
		this.callbacks.clear()

		this.gl = null
	}
}
