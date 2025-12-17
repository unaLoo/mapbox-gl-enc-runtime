import { BaseRenderer } from './BaseRenderer'
import { ACRenderer } from './ACRenderer'
import { APRenderer } from './APRenderer'
import { TXRenderer, MapTransform } from './TXRenderer'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { LayeredGroupKey } from '@/types'
import { CollisionIndex, CollisionTransform } from '@/collision/CollisionIndex'

export class RendererManager {
	// 修改：按 "layerId-type" 创建独立的 Renderer 实例
	private renderers: Map<LayeredGroupKey, BaseRenderer> = new Map()
	private gl: WebGL2RenderingContext

	// 碰撞检测缓存状态
	private lastPlacementZoom: number = -1
	private lastPlacementTileKeys: string = ''
	private placementDirty: boolean = true

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		// 不再预创建，改为按需创建
	}

	/**
	 * 标记碰撞检测需要重新计算
	 * 在新瓦片加载时调用
	 */
	markPlacementDirty(): void {
		this.placementDirty = true
	}

	// 处理 bucketsReady 事件时创建对应的 Renderer
	handleBucketsReady(data: { tile: Tile; layeredGroupKey: LayeredGroupKey; renderInfo: unknown }) {
		const { tile, layeredGroupKey, renderInfo } = data

		const renderer = this.getOrCreateRenderer(layeredGroupKey)

		// 检查是否是新数据（避免重复处理同一瓦片导致闪烁）
		if (layeredGroupKey.endsWith('-TX') && renderer instanceof TXRenderer) {
			const tileId = tile.overscaledTileID.toString()
			const isNewData = !renderer.hasRenderInfo(tileId)
			renderer.handleBucketsReady(tile, renderInfo as Parameters<TXRenderer['handleBucketsReady']>[1])
			// 只有新数据才标记需要重新计算碰撞
			if (isNewData) {
				this.placementDirty = true
			}
		} else {
			renderer.handleBucketsReady(tile, renderInfo)
		}
	}

	// 为每个 "图层-类型" 组合创建独立的 Renderer
	private getOrCreateRenderer(layeredGroupKey: LayeredGroupKey): BaseRenderer {
		if (!this.renderers.has(layeredGroupKey)) {
			const [, type] = layeredGroupKey.split('-')

			switch (type) {
				case 'AC':
					this.renderers.set(layeredGroupKey, new ACRenderer(this.gl))
					break
				case 'AP':
					this.renderers.set(layeredGroupKey, new APRenderer(this.gl))
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
		// 获取 transform 信息
		const currentZoom = tiles.length > 0 ? tiles[0].overscaledTileID.overscaledZ : 0
		const transform: MapTransform = {
			width: options.viewport.width,
			height: options.viewport.height,
			angle: 0,
			cameraToCenterDistance: options.viewport.height / 2,
			zoom: currentZoom,

		}

		// 检查是否需要重新计算碰撞
		// 条件：1) 标记为脏 2) zoom 级别变化超过阈值 3) 瓦片集合变化
		const currentTileKeys = tiles.map((t) => t.id).sort().join(',')
		// 使用更大的 zoom 阈值（0.5）来减少重新计算频率
		const zoomDelta = Math.abs(currentZoom - this.lastPlacementZoom)
		const zoomChanged = zoomDelta > 0.5
		const tilesChanged = currentTileKeys !== this.lastPlacementTileKeys
		const needsPlacement = this.placementDirty || zoomChanged || tilesChanged

		// ========== Phase 1: Placement (碰撞检测) - 仅在需要时执行 ==========
		if (needsPlacement) {
			// 创建帧级别的碰撞索引（所有瓦片共享）
			const collisionTransform: CollisionTransform = {
				width: transform.width,
				height: transform.height,
				cameraToCenterDistance: transform.cameraToCenterDistance,
			}
			const collisionIndex = new CollisionIndex(collisionTransform)

			// 收集所有 TX 渲染器并清除上一帧的可见实例缓存
			const txRenderers: TXRenderer[] = []
			this.renderers.forEach((renderer, key) => {
				if (key.endsWith('-TX') && renderer instanceof TXRenderer) {
					renderer.clearVisibleInstances()
					txRenderers.push(renderer)
				}
			})

			// 对所有瓦片进行碰撞检测（使用共享的 collisionIndex）
			// 按瓦片 ID 排序以确保稳定的碰撞检测顺序
			const sortedTiles = [...tiles].sort((a, b) => a.id.localeCompare(b.id))
			sortedTiles.forEach((tile: Tile) => {
				const tilePosMatrix = tile.tilePosMatrix()
				const mvpMatrix = mat4.create()
				mat4.mul(mvpMatrix, options.sharingVPMatrix, tilePosMatrix)

				// 所有 TX 渲染器使用同一个 collisionIndex 进行碰撞检测
				txRenderers.forEach((txRenderer) => {
					const tileId = tile.overscaledTileID.toString()
					if (txRenderer.hasRenderInfo(tileId)) {
						txRenderer.placeLabels(tile, collisionIndex, mvpMatrix)
					}
				})
			})

			// 更新缓存状态
			this.lastPlacementZoom = currentZoom
			this.lastPlacementTileKeys = currentTileKeys
			this.placementDirty = false
		}

		// ========== Phase 2: Rendering ==========
		// 按类型分组渲染器，确保正确的渲染顺序：
		// 1. 先渲染面（AC、AP）- 底层
		// 2. 再渲染线（LS、LC）- 中层
		// 3. 最后渲染文字和符号（TX、SY）- 顶层
		const areaRenderers: BaseRenderer[] = []
		const lineRenderers: BaseRenderer[] = []
		const symbolRenderers: BaseRenderer[] = []

		this.renderers.forEach((renderer, key) => {
			if (key.endsWith('-AC') || key.endsWith('-AP')) {
				areaRenderers.push(renderer)
			} else if (key.endsWith('-LS') || key.endsWith('-LC')) {
				lineRenderers.push(renderer)
			} else if (key.endsWith('-TX') || key.endsWith('-SY')) {
				symbolRenderers.push(renderer)
			}
		})

		// 渲染所有瓦片的面
		tiles.forEach((tile: Tile) => {
			const tilePosMatrix = tile.tilePosMatrix()
			const renderOptions = { ...options, tilePosMatrix, transform }

			areaRenderers.forEach((renderer) => {
				renderer.renderTile(tile, renderOptions)
			})
		})

		// 渲染所有瓦片的线
		tiles.forEach((tile: Tile) => {
			const tilePosMatrix = tile.tilePosMatrix()
			const renderOptions = { ...options, tilePosMatrix, transform }

			lineRenderers.forEach((renderer) => {
				renderer.renderTile(tile, renderOptions)
			})
		})

		// 最后渲染所有瓦片的文字和符号（在最上层）
		tiles.forEach((tile: Tile) => {
			const tilePosMatrix = tile.tilePosMatrix()
			const renderOptions = { ...options, tilePosMatrix, transform }

			symbolRenderers.forEach((renderer) => {
				renderer.renderTile(tile, renderOptions)
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
