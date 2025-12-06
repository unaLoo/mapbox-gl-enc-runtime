import type { CustomLayerInterface } from 'mapbox-gl'
import type { MapboxMap } from '../types'
import { S52Runtime } from './S52Runtime'
import type { S52RuntimeOptions } from './S52Runtime'
import TileManager, { type TileSourceType } from '../tiles/tile_manager'
import EventBus from '@/utils/Evented'
import ezstore from '../utils/store'

export interface ENCLayerOptions extends S52RuntimeOptions {
	/**
	 * Layer ID
	 */
	id: string
	/**
	 * Vector tile source configuration
	 */
	tileSources?: TileSourceType[]
}

/**
 * ENC Custom Layer
 * Integrates S-52 Runtime、TileManager
 */
export class ENCLayer implements CustomLayerInterface {
	public readonly id: string
	public readonly type: 'custom' = 'custom' as const
	public readonly renderingMode?: '2d' | '3d'

	private runtime: S52Runtime
	private tileManager: TileManager | null = null
	private map: MapboxMap | null = null
	private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
	private tileSources: TileSourceType[]

	private eventBus: EventBus = new EventBus()

	constructor(options: ENCLayerOptions) {
		this.id = options.id
		this.renderingMode = '2d'
		this.tileSources = options.tileSources || []

		// Get or create S52Runtime singleton instance
		this.runtime = S52Runtime.getInstance(options)
	}

	/**
	 * Called when the layer is added to the map
	 */
	onAdd(map: MapboxMap, gl: WebGL2RenderingContext): void {
		this.map = map
		this.gl = gl
		ezstore.set('eventBus', this.eventBus)

		// Initialize TileManager
		this.tileManager = TileManager.getInstance(map)

		for (const sourceDesc of this.tileSources) {
			this.tileManager.addSource(sourceDesc)
		}

		// Initialize runtime
		this.runtime.initialize(gl, map)

		this.runtime.setTileManager(this.tileManager)
	}

	/**
	 * Called on every frame to render the layer
	 */
	render(gl: WebGL2RenderingContext, matrix: number[]): void {
		if (!this.map) return

		this.runtime.render({
			gl,
			map: this.map,
			transform: matrix,
			viewport: {
				width: this.map.getCanvas().width,
				height: this.map.getCanvas().height,
			},
		})
	}

	onRemove(map: MapboxMap, gl: WebGL2RenderingContext): void {
		if (this.tileManager && this.tileSources.length > 0) {
			for (const sourceDesc of this.tileSources) {
				this.tileManager.removeSource(sourceDesc.id)
			}

			this.runtime.setTileManager(null)
		}

		this.runtime.dispose()
		this.map = null
		this.gl = null
		this.tileManager = null
	}

	getRuntime(): S52Runtime {
		return this.runtime
	}

	getTileManager(): TileManager | null {
		return this.tileManager
	}
}
