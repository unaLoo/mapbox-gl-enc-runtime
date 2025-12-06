/**
 * Feature Interpreter
 * Interprets S-57 features into renderable elements
 * Follows single responsibility principle: only handles feature interpretation
 * Uses a registry pattern for extensibility
 */

import type { RenderableElement, InterpretationContext, FeatureInterpreterFunction } from './types'

/**
 * Feature Interpreter
 * Converts S-57 features into renderable elements
 * One feature may be interpreted as multiple renderable elements
 * Uses a registry pattern: interpreters are registered by object class name
 */
export class FeatureInterpreter {
	// Registry of interpreters by object class name
	private interpreters: Map<string, FeatureInterpreterFunction> = new Map()

	// Default interpreter for features without object class or unknown object classes
	private defaultInterpreter: FeatureInterpreterFunction

	constructor() {
		// Set default interpreter
		this.defaultInterpreter = this.interpretByGeometry.bind(this)

		// Register built-in interpreters
		this.registerBuiltInInterpreters()
	}

	/**
	 * Register an interpreter for a specific object class
	 * @param objectClass S-57 object class name (e.g., 'LIGHTS', 'DEPARE')
	 * @param interpreter Interpreter function
	 */
	register(objectClass: string, interpreter: FeatureInterpreterFunction): void {
		this.interpreters.set(objectClass, interpreter)
	}

	/**
	 * Unregister an interpreter for a specific object class
	 * @param objectClass S-57 object class name
	 */
	unregister(objectClass: string): void {
		this.interpreters.delete(objectClass)
	}

	/**
	 * Get interpreter for a specific object class
	 * @param objectClass S-57 object class name
	 * @returns Interpreter function or undefined if not registered
	 */
	getInterpreter(objectClass: string): FeatureInterpreterFunction | undefined {
		return this.interpreters.get(objectClass)
	}

	/**
	 * Set default interpreter for features without object class or unknown object classes
	 * @param interpreter Default interpreter function
	 */
	setDefaultInterpreter(interpreter: FeatureInterpreterFunction): void {
		this.defaultInterpreter = interpreter
	}

	/**
	 * Register built-in interpreters
	 */
	private registerBuiltInInterpreters(): void {
		this.register('LIGHTS', this.interpretLights.bind(this))
		this.register('DEPARE', this.interpretDepare.bind(this))
		this.register('DEPCNT', this.interpretDepcnt.bind(this))
	}

	/**
	 * Interpret a feature into renderable elements
	 * @param context Interpretation context containing feature, rule result, rendering context, and tile info
	 * @returns Array of renderable elements
	 */
	interpret(context: InterpretationContext): RenderableElement[] {
		const { feature, ruleResult } = context

		// If feature is not visible, return empty array
		if (ruleResult.visible === false) {
			return []
		}

		// Get object class
		const objl = feature.properties.OBJL
		if (!objl) {
			// Fallback: use default interpreter
			return this.defaultInterpreter(context)
		}

		// Get registered interpreter for this object class
		const interpreter = this.interpreters.get(objl)
		if (interpreter) {
			return interpreter(context)
		}

		// Fallback: use default interpreter for unknown object classes
		return this.defaultInterpreter(context)
	}

	/**
	 * Interpret LIGHTS (lighthouse) feature
	 * A lighthouse may consist of:
	 * - Point symbol (lighthouse icon)
	 * - Area element (light sector)
	 * - Text label (lighthouse name)
	 */
	private interpretLights(context: InterpretationContext): RenderableElement[] {
		const { feature, ruleResult } = context
		const elements: RenderableElement[] = []

		// 1. Point symbol: lighthouse icon
		if (feature.tileLocalGeometry && feature.tileLocalGeometry.type === 'Point') {
			elements.push({
				type: 'point',
				geometry: feature.tileLocalGeometry,
				style: {
					symbol: 'LIGHTS',
					symbolSize: ruleResult.symbolSize || 24,
					color: this.normalizeColor(ruleResult.color) || [255, 255, 0, 1],
					opacity: ruleResult.opacity ?? 1.0,
					uniforms: ruleResult.uniforms,
				},
				sourceFeature: feature,
				zIndex: 10,
			})
		}

		// 2. Area element: light sector (if sector information exists)
		if (feature.properties.SECTR1 !== undefined) {
			// TODO: Calculate light sector geometry
			// For now, skip if not implemented
			// const sectorGeometry = this.calculateLightSector(feature, ...);
		}

		// 3. Text label: lighthouse name
		if (feature.properties.OBJNAM) {
			if (feature.tileLocalGeometry && feature.tileLocalGeometry.type === 'Point') {
				elements.push({
					type: 'text',
					geometry: feature.tileLocalGeometry,
					style: {
						text: feature.properties.OBJNAM,
						fontSize: 12,
						textColor: [0, 0, 0, 1],
						textOffset: [0, -20], // Above the symbol
					},
					sourceFeature: feature,
					zIndex: 20,
				})
			}
		}

		return elements
	}

	/**
	 * Interpret DEPARE (depth area) feature
	 */
	private interpretDepare(context: InterpretationContext): RenderableElement[] {
		const { feature, ruleResult } = context

		if (!feature.tileLocalGeometry || feature.tileLocalGeometry.type !== 'Polygon') {
			return []
		}

		return [
			{
				type: 'area',
				geometry: feature.tileLocalGeometry,
				style: {
					color: this.normalizeColor(ruleResult.color) || [173, 216, 230, 0.6],
					opacity: ruleResult.opacity ?? 0.6,
					borderWidth: ruleResult.borderWidth || 0,
					borderColor: this.normalizeColor(ruleResult.borderColor),
					uniforms: ruleResult.uniforms,
				},
				sourceFeature: feature,
				zIndex: 1,
			},
		]
	}

	/**
	 * Interpret DEPCNT (depth contour) feature
	 */
	private interpretDepcnt(context: InterpretationContext): RenderableElement[] {
		const { feature, ruleResult } = context

		if (!feature.tileLocalGeometry) {
			return []
		}

		const geometryType = feature.tileLocalGeometry.type
		if (geometryType !== 'LineString' && geometryType !== 'MultiLineString') {
			return []
		}

		return [
			{
				type: 'line',
				geometry: feature.tileLocalGeometry,
				style: {
					color: this.normalizeColor(ruleResult.color) || [0, 0, 255, 1],
					lineWidth: ruleResult.lineWidth || 1,
					lineStyle: ruleResult.lineStyle || 'solid',
					opacity: ruleResult.opacity ?? 1.0,
					uniforms: ruleResult.uniforms,
				},
				sourceFeature: feature,
				zIndex: 5,
			},
		]
	}

	/**
	 * Normalize color to RGBA format
	 */
	private normalizeColor(
		color?: string | [number, number, number] | [number, number, number, number],
	): [number, number, number, number] | undefined {
		if (!color) return undefined
		if (typeof color === 'string') {
			// TODO: Parse hex color string
			return undefined
		}
		if (color.length === 3) {
			return [color[0], color[1], color[2], 1.0]
		}
		if (color.length === 4) {
			return color
		}
		return undefined
	}

	/**
	 * Interpret feature by geometry type (fallback)
	 */
	private interpretByGeometry(context: InterpretationContext): RenderableElement[] {
		const { feature, ruleResult } = context
		if (!feature.tileLocalGeometry) {
			return []
		}

		const geometryType = feature.tileLocalGeometry.type

		switch (geometryType) {
			case 'Point':
			case 'MultiPoint':
				return [
					{
						type: 'point',
						geometry: feature.tileLocalGeometry,
						style: {
							color: this.normalizeColor(ruleResult.color) || [255, 0, 0, 1],
							symbolSize: ruleResult.symbolSize || 30,
							opacity: ruleResult.opacity ?? 1.0,
						},
						sourceFeature: feature,
						zIndex: 10,
					},
				]

			case 'LineString':
			case 'MultiLineString':
				return [
					{
						type: 'line',
						geometry: feature.tileLocalGeometry,
						style: {
							color: this.normalizeColor(ruleResult.color) || [0, 0, 255, 1],
							lineWidth: ruleResult.lineWidth || 1,
							lineStyle: (ruleResult.lineStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
							opacity: ruleResult.opacity ?? 1.0,
						},
						sourceFeature: feature,
						zIndex: 5,
					},
				]

			case 'Polygon':
			case 'MultiPolygon':
				return [
					{
						type: 'area',
						geometry: feature.tileLocalGeometry,
						style: {
							color: this.normalizeColor(ruleResult.color) || [173, 216, 230, 0.6],
							opacity: ruleResult.opacity ?? 0.6,
							borderWidth: ruleResult.borderWidth || 0,
							borderColor: this.normalizeColor(ruleResult.borderColor),
						},
						sourceFeature: feature,
						zIndex: 1,
					},
				]

			default:
				return []
		}
	}
}
