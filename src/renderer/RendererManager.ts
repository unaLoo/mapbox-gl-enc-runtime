import { BaseRenderer } from './BaseRenderer'
import { ACRenderer } from './ACRenderer'
import { TXRenderer } from './TXRenderer'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { LayeredGroupKey } from '@/types'

export class RendererManager {
	// 修改：按 "layerId-type" 创建独立的 Renderer 实例
	private renderers: Map<LayeredGroupKey, BaseRenderer> = new Map()
	private gl: WebGL2RenderingContext

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		// 不再预创建，改为按需创建
	}

	// 处理 bucketsReady 事件时创建对应的 Renderer
	handleBucketsReady(data: { tile: Tile; layeredGroupKey: LayeredGroupKey; renderInfo: any }) {
		const { tile, layeredGroupKey, renderInfo } = data

		const renderer = this.getOrCreateRenderer(layeredGroupKey)
		renderer.handleBucketsReady(tile, renderInfo)
	}

	// 为每个 "图层-类型" 组合创建独立的 Renderer
	private getOrCreateRenderer(layeredGroupKey: LayeredGroupKey): BaseRenderer {
		if (!this.renderers.has(layeredGroupKey)) {
			const [, type] = layeredGroupKey.split('-')

			switch (type) {
				case 'AC':
					this.renderers.set(layeredGroupKey, new ACRenderer(this.gl))
					break
				case 'TX':
					this.renderers.set(layeredGroupKey, new TXRenderer(this.gl))
					break
				// ... 其他类型
				default:
					throw new Error(`Unsupported renderer type: ${type}`)
			}
		}
		return this.renderers.get(layeredGroupKey)!
	}

	// 渲染时按图层层级顺序渲染
	renderTiles(
		tiles: Tile[],
		options: {
			sharingVPMatrix: mat4
			viewport: { width: number; height: number }
		},
	) {
		tiles.forEach((tile: Tile) => {
			const tilePosMatrix = tile.tilePosMatrix()

			// 为每个瓦片渲染所有图层类型的渲染器
			this.renderers.forEach((renderer) => {
				renderer.renderTile(tile, {
					...options,
					tilePosMatrix,
				})
			})
		})
	}

	getRenderer(layeredGroupKey: LayeredGroupKey): BaseRenderer | undefined {
		return this.renderers.get(layeredGroupKey)
	}

	destroy() {
		this.renderers.forEach((renderer) => {
			renderer.destroy()
		})
		this.renderers.clear()
	}
}
