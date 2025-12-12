import { getEventBus } from '@/utils/eventBus'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'

export abstract class BaseRenderer {
	protected readonly renderType: string
	protected gl: WebGL2RenderingContext
	protected tileRenderInfo: Map<string, any> = new Map() // tileId -> renderInfo

	protected bucketsReadyHandler: (data: { tile: Tile; type: string; renderInfo: any }) => void

	constructor(renderType: string, gl: WebGL2RenderingContext) {
		this.renderType = renderType
		this.gl = gl
		this.bucketsReadyHandler = this._bucketsReadyHandler.bind(this)
		this.initEventWorkflow()
	}

	protected initEventWorkflow() {
		const eventBus = getEventBus()
		eventBus?.on('bucketsReady', this.bucketsReadyHandler)
	}

	protected _bucketsReadyHandler(data: { tile: Tile; type: string; renderInfo: any }) {
		if (data.type === this.renderType) {
			this.handleBucketsReady(data.tile, data.renderInfo)
		}
	}

	abstract handleBucketsReady(tile: Tile, renderInfo: any): void

	abstract renderTile(
		tile: Tile,
		options: {
			sharingVPMatrix: mat4
			viewport: { width: number; height: number }
			tilePosMatrix: mat4
		},
	): void

	// 清理方法
	destroy() {
		const eventBus = getEventBus()
		eventBus?.off('bucketsReady', this.bucketsReadyHandler)
		this.tileRenderInfo.clear()
	}
}
