/**
 * Renderer types
 */

/**
 * Render options
 */
export interface RenderOptions {
	/**
	 * WebGL context
	 */
	gl: WebGLRenderingContext | WebGL2RenderingContext
	/**
	 * Mapbox map instance
	 */
	map: any
	/**
	 * Transformation matrix
	 */
	transform: any
	/**
	 * Viewport dimensions
	 */
	viewport: {
		width: number
		height: number
	}
}

/**
 * Symbol definition
 */
export interface SymbolDefinition {
	/**
	 * Symbol identifier
	 */
	id: string
	/**
	 * Symbol type
	 */
	type: 'icon' | 'pattern' | 'line' | 'fill'
	/**
	 * Image data (for icon/pattern)
	 */
	image?: HTMLImageElement | ImageData
	/**
	 * SVG path (for vector symbols)
	 */
	path?: string
	/**
	 * Dimensions
	 */
	width?: number
	height?: number
}

/**
 * Pattern definition
 */
export interface PatternDefinition {
	/**
	 * Pattern identifier
	 */
	id: string
	/**
	 * Pattern image
	 */
	image: HTMLImageElement | ImageData
	/**
	 * Pattern dimensions
	 */
	width: number
	height: number
	/**
	 * Repeat mode
	 */
	repeat?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
}
