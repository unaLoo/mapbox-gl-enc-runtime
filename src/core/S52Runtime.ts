/**
 * S-52 Runtime Engine
 * Core engine that orchestrates rule evaluation, context management, and rendering
 */

import { ContextManager } from '../context/ContextManager'
import { RuleEvaluator } from '../rules/RuleEvaluator'
import { FeatureInterpreter } from '../interpreter/FeatureInterpreter'
import { ShaderManager } from '../renderer/shader_manager'
import type { InterpretationContext } from '../interpreter/types'
import type TileManager from '../tiles/tile_manager'
import type { RenderingContext } from '../context/types'
import type { Rule, RuleResult } from '../rules/types'
import type { RenderOptions } from '../renderer/types'
import type { ENCFeature, MapboxMap } from '../types'
import { mat4, vec4 } from 'gl-matrix'
import { OverscaledTileID } from '@/tiles/tile_id'
import EventBus from '@/utils/Evented'
import ezStore from '@/utils/store'

export interface S52RuntimeOptions {
	/**
	 * Initial rendering context
	 */
	context?: Partial<RenderingContext>
	/**
	 * Initial rules to register
	 */
	rules?: Rule[]
	/**
	 * Enable debug logging
	 */
	debug?: boolean
}

/**
 * S-52 Runtime Engine (Singleton)
 * Manages rule evaluation, context, and rendering for S-52 ENC charts
 */
export class S52Runtime {
	private static instance: S52Runtime | null = null

	private contextManager: ContextManager
	private ruleEvaluator: RuleEvaluator
	private featureInterpreter: FeatureInterpreter
	private features: ENCFeature[] = []
	private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
	private map: MapboxMap | null = null
	private tileManager: TileManager | null = null

	private boxLayerInfo: any = {}

	/**
	 * Get singleton instance
	 */
	static getInstance(options: S52RuntimeOptions = {}): S52Runtime {
		if (!S52Runtime.instance) {
			S52Runtime.instance = new S52Runtime(options)
		}
		return S52Runtime.instance
	}

	/**
	 * Reset singleton instance (for testing)
	 */
	static resetInstance(): void {
		S52Runtime.instance = null
	}

	private constructor(options: S52RuntimeOptions = {}) {
		this.contextManager = new ContextManager(options.context)
		this.ruleEvaluator = new RuleEvaluator()
		this.featureInterpreter = new FeatureInterpreter()

		// Register initial rules
		if (options.rules) {
			this.ruleEvaluator.addRules(options.rules)
		}

		// Subscribe to context changes to trigger re-render
		this.contextManager.subscribe(() => {
			if (this.map) {
				this.map.triggerRepaint()
			}
		})
	}

	/**
	 * Initialize runtime with WebGL context and map
	 */
	initialize(gl: WebGLRenderingContext | WebGL2RenderingContext, map: MapboxMap): void {
		this.gl = gl
		this.map = map

		// Initialize shader manager if WebGL2
		if (gl instanceof WebGL2RenderingContext) {
			const shaderManager = ShaderManager.getInstance()
			shaderManager.initialize(gl)
		}

		const eventBus = ezStore.get<EventBus>('eventBus')

		eventBus?.on('tileLoad', () => {
			this.processFeatures()
			this.map?.triggerRepaint()
		})

		// //Tile Debug
		// this._prepareBoxLayer()
	}

	/**
	 * Remove a feature
	 */
	removeFeature(featureId: string): void {
		this.features = this.features.filter((f) => f.properties.id !== featureId)
		if (this.map) {
			this.map.triggerRepaint()
		}
	}

	/**
	 * Clear all features
	 */
	clearFeatures(): void {
		this.features = []
		if (this.map) {
			this.map.triggerRepaint()
		}
	}

	/**
	 * Register a rule
	 */
	addRule(rule: Rule): void {
		this.ruleEvaluator.addRule(rule)
	}

	/**
	 * Register multiple rules
	 */
	addRules(rules: Rule[]): void {
		this.ruleEvaluator.addRules(rules)
	}

	/**
	 * Get context manager
	 */
	getContextManager(): ContextManager {
		return this.contextManager
	}

	/**
	 * Set tile manager instance
	 * TileManager is responsible for loading and managing tiles
	 */
	setTileManager(tileManager: TileManager | null): void {
		this.tileManager = tileManager
	}

	/**
	 * Get tile manager instance
	 */
	getTileManager(): TileManager | null {
		return this.tileManager
	}

	/**
	 * Process features and populate buckets
	 * This is the main processing pipeline: Feature → Rule Evaluation → Interpretation → Buckets
	 */
	processFeatures(): void {
		if (!this.tileManager) {
			// For manual features, buckets are not used yet
			return
		}

		const context = this.contextManager.getContext()

		// Process features from all tile sources
		for (const tileSource of this.tileManager.tileSouces.values()) {
			// Only process vector tile sources
			if (tileSource.type !== 'vector') {
				continue
			}

			// Get all covering tiles for this source
			// const cvTiles = tileSource.coveringTiles()
			const tiles = tileSource.readyTiles()
			console.log('ready tiles', tiles.map(t => t.overscaledTileID.canonical.toString()), tiles)

			// const during = tiles.length !== cvTiles.length
			// console.log('过渡期...', during)

			// Process each tile
			for (const tile of tiles) {
				if (tile.status !== 'loaded' || !tile.features) {
					continue
				}

				// Get or create bucket manager for this tile
				const bucketManager = tileSource.getOrCreateBucketManager(tile)

				// Clear previous elements (or we could do incremental updates)
				bucketManager.clear()
				// Process each feature in this tile
				for (const feature of tile.features) {
					// 1. Evaluate rules for this feature
					// const ruleResult = this.ruleEvaluator.evaluate(feature, context);
					// if (!ruleResult || ruleResult.visible === false) {
					// 	continue;
					// }
					// As default rule result
					const ruleResult = {
						color: [201 / 255, 185 / 255, 122 / 255],
						opacity: 0.8,
						visible: true,
					} as RuleResult

					// 2. Interpret feature into renderable elements
					const interpretationContext: InterpretationContext = {
						feature,
						ruleResult,
						renderingContext: context,
						tile,
						tileZ: feature.properties._tileZ || 0,
						tileX: feature.properties._tileX || 0,
						tileY: feature.properties._tileY || 0,
					}

					const elements = this.featureInterpreter.interpret(interpretationContext)

					// 3. Add elements to buckets
					for (const element of elements) {
						bucketManager.addElement(element)
					}
				}
			}
		}
	}

	/**
	 * Render all features
	 * If tileManager is set, uses features from tiles and buckets; otherwise uses manually loaded features
	 */
	render(options: RenderOptions): void {
		if (!this.gl || !this.map) {
			return
		}

		// Render from buckets
		this.renderFromBuckets(options)

		// // // Render Tile Bound
		// this.renderTileBound(options)
	}

	/**
	 * Render from buckets
	 * Renders all buckets from all tile sources
	 */
	private renderFromBuckets(options: RenderOptions): void {
		if (!this.tileManager || !(this.gl instanceof WebGL2RenderingContext)) {
			return
		}

		const gl = this.gl // Use the instance's WebGL2 context
		const { viewport } = options

		// Render buckets from all tile sources
		for (const tileSource of this.tileManager.tileSouces.values()) {
			// Only process vector tile sources
			if (tileSource.type !== 'vector') {
				continue
			}

			// Get all covering tiles for this source
			const tiles = tileSource.readyTiles()
			console.log('readyTiles', tiles.map((item) => item.overscaledTileID.canonical.toString()))

			// Render each tile's buckets
			for (const tile of tiles) {
				if (tile.status !== 'loaded') {
					continue
				}

				const bucketManager = tileSource.getBucketManager(tile)
				if (!bucketManager) {
					continue
				}

				// Get transformation matrix for this tile
				const posMatrix = tile.tilePosMatrix()
				const matrix = mat4.create()
				mat4.multiply(matrix, this.tileManager.sharingVPMatrix, posMatrix)

				// Render all buckets in this tile
				const buckets = bucketManager.getAllBuckets()
				for (const bucket of buckets.values()) {
					// Build buffers if needed
					bucket.buildBuffers(gl)

					// Render bucket
					bucket.render({
						gl,
						matrix,
						viewport,
					})
				}
			}
		}
	}

	private renderTileBound(options: RenderOptions) {
		if (!this.tileManager || !(this.gl instanceof WebGL2RenderingContext)) {
			return
		}

		const gl = this.gl // Use the instance's WebGL2 context
		const { viewport } = options

		// Render buckets from all tile sources
		for (const tileSource of this.tileManager.tileSouces.values()) {
			// Get all covering tiles for this source
			const tiles = tileSource.readyTiles()

			// Render each tile's buckets
			for (const tile of tiles) {
				// hash + 伪随机映射
				const randColorFromTileId = (id: OverscaledTileID) => {
					// 用 FNV-1a 哈希算法
					const str = id.toString()
					let hash = 2166136261
					for (let i = 0; i < str.length; i++) {
						hash ^= str.charCodeAt(i)
						hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
					}
					hash >>>= 0

					// 伪随机生成三通道，用素数扰动，可以使相邻 hash 差异大
					const r = ((hash * 16807) % 256) / 255
					const g = ((hash * 48271) % 256) / 255
					const b = ((hash * 69621) % 256) / 255
					return [r, g, b, 0.4]
				}

				// Get transformation matrix for this tile
				const posMatrix = tile.tilePosMatrix()
				const tMVP = mat4.create()
				mat4.multiply(tMVP, this.tileManager.sharingVPMatrix, posMatrix)

				this._renderBoxLayer(tMVP, randColorFromTileId(tile.overscaledTileID))
			}
		}
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.features = []
		this.gl = null
		this.map = null
		this.tileManager = null
		// TODO: Clean up WebGL resources
	}

	_prepareBoxLayer(): void {
		const gl = this.gl as WebGL2RenderingContext
		// 创建 program
		const program = gl.createProgram()!
		const vs = gl.createShader(gl.VERTEX_SHADER)!
		const fs = gl.createShader(gl.FRAGMENT_SHADER)!

		gl.shaderSource(vs, dataForBoxLayer.vertexShader)
		gl.shaderSource(fs, dataForBoxLayer.fragmentShader)
		gl.compileShader(vs)
		gl.compileShader(fs)

		// check
		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(vs))
		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(fs))

		gl.attachShader(program, vs)
		gl.attachShader(program, fs)
		gl.linkProgram(program)

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(program))

		// 准备 VBO
		const vbo = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dataForBoxLayer.vertex), gl.STATIC_DRAW)

		// index buffer
		const ibo = gl.createBuffer()
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(dataForBoxLayer.index), gl.STATIC_DRAW)

		this.boxLayerInfo.program = program
		this.boxLayerInfo.vertexBuffer = vbo
		this.boxLayerInfo.indexBuffer = ibo
	}

	_renderBoxLayer(combinedMatrix: mat4, u_randomColor: vec4): void {
		if (!this.boxLayerInfo.program || !this.boxLayerInfo.vertexBuffer || !this.boxLayerInfo.indexBuffer) {
			return
		}

		const gl = this.gl as WebGL2RenderingContext
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

		gl.useProgram(this.boxLayerInfo.program)
		gl.uniformMatrix4fv(gl.getUniformLocation(this.boxLayerInfo.program, 'u_matrix'), false, combinedMatrix)
		gl.uniform4fv(gl.getUniformLocation(this.boxLayerInfo.program, 'u_randomColor'), u_randomColor)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.boxLayerInfo.vertexBuffer)
		gl.enableVertexAttribArray(gl.getAttribLocation(this.boxLayerInfo.program, 'a_position'))
		gl.vertexAttribPointer(gl.getAttribLocation(this.boxLayerInfo.program, 'a_position'), 2, gl.FLOAT, false, 0, 0)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.boxLayerInfo.indexBuffer)
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
	}
}

const dataForBoxLayer = {
	vertex: [0, 0, 8192, 0, 8192, 8192, 0, 8192],
	index: [0, 1, 2, 0, 2, 3],
	vertexShader: `#version 300 es
		precision highp float;
		uniform mat4 u_matrix;
		in vec2 a_position;

		void main() {
			gl_Position = u_matrix * vec4(a_position, 0, 1);
		}
	`,
	fragmentShader: `#version 300 es
		precision highp float;
		uniform vec4 u_randomColor;
		out vec4 fragColor;
		void main() {
			fragColor = u_randomColor;
		}
	`,
}
