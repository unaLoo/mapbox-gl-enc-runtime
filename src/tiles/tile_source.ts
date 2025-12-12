import { Tile } from './tile'
import type TileManager from './tile_manager'
import Dispatcher from '../data/message/dispatcher'
import { OverscaledTileID } from './tile_id'
import { getEventBus } from '@/utils/eventBus'

export type TileSourceType = {
	id: string
	type: 'raster' | 'vector'
	url: string
	maxzoom: number
	layers?: string[] // For vector tiles: layer names to extract
}

class LRUCache {
	cache: { [key: string]: any }
	keys: string[] // 维护了从少取用到频繁取用排序的key值， 所以遍历的时候建议逆序遍历
	capacity: number

	constructor(capacity: number) {
		this.capacity = capacity
		this.cache = {}
		this.keys = []
	}

	get<T>(key: string): T | null {
		if (key in this.cache) {
			this.keys.splice(this.keys.indexOf(key), 1)
			this.keys.push(key)
			return this.cache[key] as T
		}
		return null
	}

	put(key: string, value: any, cb?: (shiftKey: string) => void) {
		if (key in this.cache) {
			this.keys.splice(this.keys.indexOf(key), 1)
		} else if (Object.keys(this.cache).length >= this.capacity) {
			const oldestKey = this.keys.shift()
			if (oldestKey) {
				delete this.cache[oldestKey]
			}
		}
		this.cache[key] = value
		this.keys.push(key)
	}

	abort(key: string) {
		if (key in this.cache) {
			delete this.cache[key]
			this.keys = this.keys.filter((k) => k !== key)
		}
	}

	has(key: string) {
		return key in this.cache
	}

	release() {
		this.cache = {}
		this.keys = []
	}
}

export default class TileSource {
	id: string
	type: 'raster' | 'vector'
	url: string
	maxzoom: number
	layers?: string[] // For vector tiles

	dispatcher: Dispatcher
	lruCache: LRUCache = new LRUCache(50)

	_tileManager!: TileManager

	constructor(desc: TileSourceType) {
		this.id = desc.id
		this.type = desc.type
		this.url = desc.url
		this.layers = desc.layers
		this.maxzoom = desc.maxzoom
		// Object.assign(this, desc)
		this.dispatcher = new Dispatcher(this)
	}

	loadTile(tile: OverscaledTileID) {
		// cache hit
		if (this.lruCache!.has(tile.key.toString())) {
			// console.log('cache hit', tile.canonical.toString())
			return
		}
		// // over maxzoom
		// if (tile.canonical.z > this.maxzoom) {
		// 	const data_tile = new Tile(tile)
		// 	const { tile: parentTile } = this.findClosestAvailableTile(tile)
		// 	if (parentTile) {
		// 		data_tile.injectParent(parentTile)
		// 	} else {
		// 		console.log('parent not fount for', tile.canonical.toString())
		// 	}
		// 	this.lruCache.put(data_tile.id, data_tile)
		// 	this.bucketManagers.set(data_tile.id, new RenderBucketManager(ezStore.get<WebGLRenderingContext | WebGL2RenderingContext>('gl')))
		// 	return
		// }

		// load tile
		const data_tile = new Tile(tile)
		data_tile.actor = this.dispatcher.actor

		const closestTileInfo = this.findClosestAvailableTile(tile)
		if (closestTileInfo.tile && closestTileInfo.tile.gpuTexture) {
			// 注入父级瓦片
			data_tile.injectParentTile(closestTileInfo.tile, closestTileInfo.tl, closestTileInfo.scale)
		}

		this.lruCache.put(data_tile.id, data_tile)

		data_tile.load(this.url, this.type, this.layers, () => {
			// 触发 tileload 事件
			const eventBus = getEventBus()
			eventBus &&
				eventBus.trigger('tileLoad', {
					tile: data_tile,
					tileSourceId: this.id,
					decodedFeatures: data_tile.features,
				})

			console.log('tileLoadedd')
			// 规则引擎工作
			// 给到 bucket ， bucket 专门负责聚合和几何处理，生成 GPU 友好的顶点、索引资源
			// bucket 处理完再给到 renderer
		})
	}

	abortTile(tile: Tile) {
		tile.unload()
		this.lruCache.abort(tile.id)
	}

	/**
	 * 获取可渲染的瓦片列表（实现瓦片回退机制）
	 * 对应 Mapbox 的 getRenderableIds 逻辑
	 */
	readyTiles(): Tile[] {
		const _coveringTiles = this.coveringTiles()

		const fallbackTiles: Set<Tile> = new Set()
		for (const tile of _coveringTiles) {
			const { tile: closestTile } = this.findClosestAvailableTile(tile.overscaledTileID)
			if (!closestTile) {
				continue
			}
			fallbackTiles.add(closestTile)
		}

		// overlay fallback
		const resultTiles: Tile[] = [...fallbackTiles]
		return resultTiles
	}

	readyCoords(): OverscaledTileID[] {
		const _coveringTiles = this.coveringTiles()

		const fallbackCoords: Set<OverscaledTileID> = new Set()
		for (const tile of _coveringTiles) {
			const { tile: closestTile } = this.findClosestAvailableTile(tile.overscaledTileID)
			if (!closestTile) {
				continue
			}
			fallbackCoords.add(closestTile.overscaledTileID)
		}

		// overlay fallback
		const resultTiles: OverscaledTileID[] = [...fallbackCoords]
		return resultTiles
	}

	coveringTiles(): Tile[] {
		const coveringOZIDs = this._tileManager.coveringTileMap.get(this.id)
		if (!coveringOZIDs) return []

		// coveringOZIDs[0] : the nearest tile for camera
		// const nearestOZID = coveringOZIDs[0] // 最近的焦点瓦片

		// this.lruCache.keys.forEach((key) => {
		//     const tile = this.lruCache.get<Tile>(key)!
		//     if (!tile) return

		//     const inView = coveringOZIDs.find((ozID) => ozID.key === tile.overscaledTileID.key)

		//     if (!inView && shouldAbort(tile, nearestOZID)) {
		//         this.abortTile(tile)
		//     }
		// })

		const tiles: Tile[] = []
		for (const ozID of coveringOZIDs) {
			const tile = this.lruCache.get<Tile>(ozID.key.toString())
			if (tile) tiles.push(tile)
		}
		return tiles
	}

	/**
	 * 查找最近的可用瓦片（已加载且有数据）
	 */
	private findClosestAvailableTile(ozID: OverscaledTileID): {
		tile: Tile | null
		tl: [number, number]
		scale: number
	} {
		const cacheLength = this.lruCache.keys.length
		let closestTile: Tile | null = null
		const tl = [0, 0] as [number, number]
		let scale = 1.0

		// 逆序遍历缓存（从最近使用的开始），找到最近的已加载且有数据的父级瓦片
		for (let i = cacheLength - 1; i >= 0; i--) {
			const key = this.lruCache.keys[i]
			const cachedTile = this.lruCache.cache[key] as Tile

			// 检查是否是父级瓦片，并且有数据（对应 Mapbox 的 hasData() 检查）
			if (
				(cachedTile.id === ozID.key.toString() || ozID.isChildOf(cachedTile.overscaledTileID)) &&
				cachedTile.hasData()
			) {
				closestTile = cachedTile
				const closestFatherCanonical = closestTile.overscaledTileID.canonical
				const sonCanonical = ozID.canonical

				// 计算缩放比例和纹理坐标偏移
				scale = Math.pow(2, closestFatherCanonical.z - sonCanonical.z)
				tl[0] = (sonCanonical.x * scale) % 1
				tl[1] = (sonCanonical.y * scale) % 1

				break
			}
		}

		return {
			tile: closestTile,
			tl,
			scale,
		}
	}

	remove() {
		this.lruCache.release()
		this.dispatcher.remove()
	}

	cleanCache() {
		console.log('cache clean')
		this.lruCache.release()
	}
}

function shouldAbort(tile: Tile | null, nearestOZID: OverscaledTileID): boolean {
	// 当前最近瓦片是 (z=10, x=512, y=512)。
	// 某个瓦片是 (z=8, x=128, y=128)，其缩放到 z=10 后是 (x=512, y=512)，说明和 nearest 完全重合，不应抛弃。
	// 某个瓦片是 (z=8, x=140, y=160)，缩放到 z=10 后是 (x=560, y=640)，和 nearest 差距大于阈值，应抛弃。

	if (!tile) return false

	// 0，1，2级的，没有abort的必要
	if (tile.overscaledTileID.overscaledZ < 3) return false

	const tileID = tile.overscaledTileID
	const zDiff = nearestOZID.overscaledZ - tileID.overscaledZ

	// tile 比 nearest 深太多了，子子子子瓦片，abort
	if (zDiff < -2) return true

	// tile 比 nearest 浅太多了，是老祖宗瓦片，abort
	if (zDiff > 10) return true

	// 缩放 tile 的坐标到 nearestZ 层级
	const scale = Math.pow(2, zDiff)
	const scaledTileX = tileID.canonical.x * scale
	const scaledTileY = tileID.canonical.y * scale

	const dx = scaledTileX - nearestOZID.canonical.x
	const dy = scaledTileY - nearestOZID.canonical.y
	const manhattanDist = Math.abs(dx) + Math.abs(dy)
	const dist = Math.sqrt(dx * dx + dy * dy)

	// 距离nearestOZID的瓦片曼哈顿距离为 100 以上，abort
	// const tolerance = Math.max(200, Math.pow(2, Math.abs(zDiff)) / 2)
	const tolerance = 10

	return dist > tolerance
}
