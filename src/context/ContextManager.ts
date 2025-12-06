/**
 * Context Manager
 * Manages rendering context state and notifies listeners of changes
 */

import type { RenderingContext, DisplayMode, EnvironmentMode, SafetyDepthConfig } from './types'

export class ContextManager {
	private context: RenderingContext
	private listeners: Set<(context: RenderingContext) => void> = new Set()

	constructor(initialContext?: Partial<RenderingContext>) {
		this.context = {
			displayMode: initialContext?.displayMode || 'standard',
			environment: initialContext?.environment || 'day',
			safetyDepth: initialContext?.safetyDepth || {
				depth: 30,
				shallowContour: 10,
				deepContour: 30,
			},
			colors: initialContext?.colors || this.getDefaultColors('day'),
			layerVisibility: initialContext?.layerVisibility || {},
			...initialContext,
		}
	}

	/**
	 * Get current rendering context
	 */
	getContext(): RenderingContext {
		return { ...this.context }
	}

	/**
	 * Update display mode
	 */
	setDisplayMode(mode: DisplayMode): void {
		this.context.displayMode = mode
		this.notifyListeners()
	}

	/**
	 * Update environment mode
	 */
	setEnvironment(mode: EnvironmentMode): void {
		this.context.environment = mode
		this.context.colors = this.getDefaultColors(mode)
		this.notifyListeners()
	}

	/**
	 * Update safety depth configuration
	 */
	setSafetyDepth(config: Partial<SafetyDepthConfig>): void {
		this.context.safetyDepth = { ...this.context.safetyDepth, ...config }
		this.notifyListeners()
	}

	/**
	 * Update layer visibility
	 */
	setLayerVisibility(layerId: string, visible: boolean): void {
		this.context.layerVisibility[layerId] = visible
		this.notifyListeners()
	}

	/**
	 * Subscribe to context changes
	 */
	subscribe(listener: (context: RenderingContext) => void): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	/**
	 * Notify all listeners of context changes
	 */
	private notifyListeners(): void {
		const context = this.getContext()
		this.listeners.forEach((listener) => {
			try {
				listener(context)
			} catch (error) {
				console.error('Error in context listener:', error)
			}
		})
	}

	/**
	 * Get default color scheme for environment
	 */
	private getDefaultColors(environment: EnvironmentMode) {
		const schemes = {
			day: {
				shallow: [173, 216, 230] as [number, number, number], // Light blue
				deep: [0, 119, 190] as [number, number, number], // Blue
				danger: [255, 0, 0] as [number, number, number], // Red
				land: [240, 230, 140] as [number, number, number], // Khaki
			},
			dusk: {
				shallow: [100, 149, 237] as [number, number, number], // Cornflower blue
				deep: [25, 25, 112] as [number, number, number], // Midnight blue
				danger: [220, 20, 60] as [number, number, number], // Crimson
				land: [139, 126, 102] as [number, number, number], // Dark khaki
			},
			night: {
				shallow: [25, 25, 112] as [number, number, number], // Midnight blue
				deep: [0, 0, 0] as [number, number, number], // Black
				danger: [139, 0, 0] as [number, number, number], // Dark red
				land: [64, 64, 64] as [number, number, number], // Dark gray
			},
		}
		return schemes[environment]
	}
}
