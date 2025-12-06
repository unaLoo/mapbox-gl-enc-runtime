/**
 * Context management types
 */

/**
 * Display mode for S-52 rendering
 */
export type DisplayMode = 'base' | 'standard' | 'all'

/**
 * Environment mode (time of day)
 */
export type EnvironmentMode = 'day' | 'dusk' | 'night'

/**
 * Safety depth configuration
 */
export interface SafetyDepthConfig {
	/**
	 * Safety depth in meters
	 * Features with depth less than this value will be rendered as dangerous
	 */
	depth: number
	/**
	 * Shallow contour depth
	 */
	shallowContour?: number
	/**
	 * Deep contour depth
	 */
	deepContour?: number
}

/**
 * Color scheme configuration
 */
export interface ColorScheme {
	/**
	 * Shallow water color (RGB)
	 */
	shallow: [number, number, number]
	/**
	 * Deep water color (RGB)
	 */
	deep: [number, number, number]
	/**
	 * Danger color (RGB) - for depths less than safety depth
	 */
	danger: [number, number, number]
	/**
	 * Land color (RGB)
	 */
	land: [number, number, number]
}

/**
 * Rendering context
 * Contains all runtime state that affects S-52 rendering
 */
export interface RenderingContext {
	/**
	 * Display mode
	 */
	displayMode: DisplayMode
	/**
	 * Environment mode
	 */
	environment: EnvironmentMode
	/**
	 * Safety depth configuration
	 */
	safetyDepth: SafetyDepthConfig
	/**
	 * Color scheme
	 */
	colors: ColorScheme
	/**
	 * Layer visibility flags
	 */
	layerVisibility: {
		[layerId: string]: boolean
	}
	/**
	 * Additional custom context data
	 */
	[key: string]: any
}

/**
 * Context change event
 */
export interface ContextChangeEvent {
	type: 'displayMode' | 'environment' | 'safetyDepth' | 'colors' | 'layerVisibility' | 'all'
	value: any
}
