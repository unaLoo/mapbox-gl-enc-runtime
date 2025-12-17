import ezstore from '@/utils/store'
import type { CustomLayerInterface } from 'mapbox-gl'
import type { MapboxMap } from '../types'
import TileManager, { type TileSourceType } from '@/tiles/tile_manager'
import { getEventBus, initEventBus } from '@/utils/eventBus'
import { Interpreter } from '@/rules/Interpreter'
import { BucketManager } from '@/buckets/BucketManager'

import { ENCRenderer } from '@/renderer/EncRenderer'
import { getMatrices } from '../utils/map_transform'

export interface ENCLayerOptions {
	tileSources?: TileSourceType[]
	[key: string]: unknown // other options maybe
}

export default class EncRuntime implements CustomLayerInterface {
	public readonly id: string = '$enc-runtime'
	public readonly type: 'custom' = 'custom' as const
	public readonly renderingMode?: '2d' | '3d' = '3d'

	public tileSources: TileSourceType[] = []

	// Core Properties
	public tileManager: TileManager | null = null
	private map: MapboxMap | null = null
	private gl: WebGL2RenderingContext | null = null
	private renderer: ENCRenderer | null = null
	// @ts-expect-error 'interpreter' is declared but its value is never read.ts(6133)
	private interpreter: Interpreter | null = null
	private bucketManager: BucketManager | null = null

	constructor(options: ENCLayerOptions) {
		this.tileSources = options.tileSources || []
		initEventBus()
	}

	onAdd(map: MapboxMap, gl: WebGL2RenderingContext): void {
		this.map = map
		this.gl = gl
		ezstore.set('map', this.map)
		ezstore.set('gl', this.gl)

		this.tileManager = TileManager.getInstance(map)
		if (this.tileManager === null) {
			console.warn('TileManager is not initialized')
			return
		}

		// TS 类型缩小不会延申至新的作用域
		const tileManager = this.tileManager
		this.tileSources.forEach((item) => tileManager.addSource(item))

		this.initFeatureWorkflow()
	}

	initFeatureWorkflow() {
		this.interpreter = new Interpreter()
		this.bucketManager = new BucketManager()

		this.renderer = new ENCRenderer()
		const eventBus = getEventBus()

		// 连接数据流：Interpreter -> BucketManager -> RendererManager
		eventBus?.on('featuresStyled', (data) => {
			this.bucketManager?.processFeatures(data)
		})

		eventBus?.on('bucketsReady', (data) => {
			this.renderer?.handleBucketsReady(data)
		})

		eventBus?.on('renderFrame', () => this.map?.triggerRepaint())

		// Wire viewport changes to trigger collision recalculation
		// Requirements 7.4: Recalculate collisions on viewport changes (pan/zoom)
		this.map?.on('move', () => {
			const canvas = this.map?.getCanvas()
			if (canvas) {
				eventBus?.trigger('viewportChange', {
					viewport: { width: canvas.width, height: canvas.height }
				})
			}
		})
	}

	render(_: WebGL2RenderingContext, __: number[]): void {
		if (!this.tileManager || !this.renderer || !this.map) return
		const sharingVPMatrix = getMatrices(this.map.transform).projMatrix
		const viewport = { width: this.map.getCanvas().width, height: this.map.getCanvas().height }

		for (const tileSource of this.tileManager.tileSourceMap.values()) {
			const readyTiles = tileSource.readyTiles()
			this.renderer.renderENC(readyTiles, { sharingVPMatrix, viewport })
		}

		// this.renderer.renderENC(renderENC, { sharingVPMatrix, viewport })
	}

	onRemove(_: MapboxMap, __: WebGL2RenderingContext): void {
		this.tileManager?.remove()
		this.tileManager = null
		this.map = null
		this.gl = null
		ezstore.destroy()
	}
}
