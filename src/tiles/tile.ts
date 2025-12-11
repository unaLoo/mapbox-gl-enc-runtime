import { OverscaledTileID } from './tile_id'
import Actor from '../data/message/actor'
import { Cancelable } from '../data/types'
import { mat4 } from 'gl-matrix'
import ezStore from '@/utils/store'
import type { ENCFeature } from '../types'

type TileStatus = 'ready' | 'loading' | 'loaded' | 'error' | 'aborted'
const EXTENT = 8192

export class Tile {
	status: TileStatus

	width: number
	height: number
	overscaledTileID: OverscaledTileID
	gpuTexture: WebGLTexture | null
	u_topLeft: [number, number]
	u_scale: number

	parentTile: Tile | null = null

	type: 'raster' | 'vector' = 'vector'
	// Vector tile features (for type === 'vector')
	features: ENCFeature[] | null = null

	_cancel: Cancelable | null = null
	_actor: Actor | null = null
	gl: WebGL2RenderingContext | null = null

	constructor(overscaledTileID: OverscaledTileID) {
		this.overscaledTileID = overscaledTileID
		this.width = 1
		this.height = 1
		this.u_topLeft = [0, 0]
		this.u_scale = 1
		this.gpuTexture = null
		this.status = 'ready'
		this.gl = ezStore.get<WebGL2RenderingContext>('gl')
	}

	/**
	 * 只适用于栅格瓦片，注入纹理
	 */
	injectParentTile(parentTile: Tile, tl: [number, number], scale: number) {
		this.gpuTexture = parentTile.gpuTexture
		this.u_topLeft = tl
		this.u_scale = scale
		this.parentTile = parentTile
	}

	/**
	 * 检查瓦片是否有可渲染的数据
	 * 对应 Mapbox 的 hasData() 方法
	 */
	hasData(): boolean {
		if (this.status !== 'loaded') {
			return false
		}
		// 对于矢量瓦片，检查是否有 features
		if (this.type === 'vector' && this.features !== null) {
			return this.features.length > 0
		}
		// 对于栅格瓦片，检查是否有纹理（包括注入的父级纹理）
		if (this.type === 'raster' && this.gpuTexture !== null) {
			return true
		}
		return false
	}

	get id() {
		return this.overscaledTileID.key.toString()
	}

	get actor(): Actor {
		if (!this._actor) throw new Error('Actor is null')
		return this._actor
	}

	set actor(actor: Actor) {
		this._actor = actor
	}

	get cancel() {
		if (!this._cancel) throw new Error('cancle is not found')
		return this._cancel
	}

	set cancel(cancel: Cancelable) {
		this._cancel = cancel
	}

	load(tileUrl: string, type: 'raster' | 'vector' = 'raster', layers?: string[], cb?: (...args: any[]) => void) {
		this.type = type
		if (this.status === 'loaded') return
		if (this.status === 'loading') return
		if (this.status === 'aborted') return

		this.status = 'loading'
		const url = this.overscaledTileID.canonical.url(tileUrl)
		const canonical = this.overscaledTileID.canonical

		if (type === 'vector') {
			// Load vector tile (MVT)
			this.cancel = this.actor.send(
				'loadTile',
				{
					uid: this.overscaledTileID.key,
					url: url,
					type: 'vector',
					tileZ: canonical.z,
					tileX: canonical.x,
					tileY: canonical.y,
					layers: layers,
				},
				(err, features: ENCFeature[]) => {
					if (err) {
						console.error('Error loading vector tile:', err)
						this.status = 'error'
						return
					}
					// console.log("111", features)
					this.features = features || []
					this.status = 'loaded'

					cb && cb()
				},
			)
		} else {
			// Load raster tile (image)
			if (!this.gl) console.warn('tile gl is null')
			const gl = this.gl!

			this.cancel = this.actor.send(
				'loadTile',
				{
					uid: this.overscaledTileID.key,
					url: url,
					type: 'raster',
					zoom: this.overscaledTileID.overscaledZ,
				},
				(err, bitmap: ImageBitmap) => {
					if (err) {
						console.error('Error loading raster tile:', err)
						// this.gpuTexture = createTexture2D(
						//     gl,
						//     this.width,
						//     this.height,
						//     gl.RGBA8,
						//     gl.RGBA,
						//     gl.UNSIGNED_BYTE,
						//     undefined,
						// )
						// this.status = 'error'
						return
					}

					this.width = bitmap.width
					this.height = bitmap.height
					this.gpuTexture = createTexture2D(
						gl,
						this.width,
						this.height,
						gl.RGBA8,
						gl.RGBA,
						gl.UNSIGNED_BYTE,
						bitmap,
						gl.LINEAR,
					)
					this.u_topLeft = [0.0, 0.0]
					this.u_scale = 1.0
					this.status = 'loaded'

					cb && cb()
				},
			)
		}
	}

	unload() {
		if (this.status === 'loading') {
			this.cancel.cancel()
		} else if (this.status === 'loaded') {
			if (this.gpuTexture && this.gl) {
				this.gl.deleteTexture(this.gpuTexture)
			}
			// Clear vector features
			this.features = null
		}

		this.status = 'aborted'

		// this.gpuTexture = null
		this.parentTile = null
		// this._actor = null
		// this._cancel = null
	}

	abort() {
		if (this.status === 'loading') {
			this.cancel.cancel()
		}
	}

	tilePosMatrix(): mat4 {
		const canonical = this.overscaledTileID.canonical
		const posMatrix = mat4.identity(new Float64Array(16) as unknown as mat4)
		const worldSize = ezStore.get<mapboxgl.Map>('map')!.transform.worldSize

		const scale = worldSize / Math.pow(2, canonical.z)
		const unwrappedX = canonical.x + Math.pow(2, canonical.z) * this.overscaledTileID.wrap
		const scaledX = unwrappedX * scale
		const scaledY = canonical.y * scale

		mat4.translate(posMatrix, posMatrix, [scaledX, scaledY, 0])
		mat4.scale(posMatrix, posMatrix, [scale / EXTENT, scale / EXTENT, 1])

		return posMatrix
	}
}

function createTexture2D(
	gl: WebGL2RenderingContext,
	width: number,
	height: number,
	internalFormat: number,
	format: number,
	type: number,
	resource?: TexImageSource,
	filter: number = gl.NEAREST,
	generateMips: boolean = false,
	repeat: boolean = false,
): WebGLTexture | null {
	const texture = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D, texture)
	if (repeat) {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
	} else {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	}
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, generateMips ? gl.LINEAR_MIPMAP_LINEAR : filter)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
	resource && gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, resource)
	gl.bindTexture(gl.TEXTURE_2D, null)
	return texture
}
