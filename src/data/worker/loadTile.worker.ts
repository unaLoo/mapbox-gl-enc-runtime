import { Callback, WorkerSelf } from '../types'
import { http } from '../request/http'
import { parseMVT } from '../../tiles/mvt_parser'
import type { ENCFeature } from '../../types'

type TileRequestParams = {
	uid: number
	url: string
	type?: 'raster' | 'vector'
	tileZ?: number
	tileX?: number
	tileY?: number
	layers?: string[] // For vector tiles: layer names to extract
}

type TileLoadResult = ImageBitmap | ENCFeature[]

/**
 * Load tile data (raster or vector)
 * For raster tiles: returns ImageBitmap
 * For vector tiles: returns ENCFeature[]
 */
export function loadTile(this: WorkerSelf, params: TileRequestParams, callback: Callback<TileLoadResult>) {
	const { url, type = 'raster', tileZ, tileX, tileY, layers } = params

	try {
		if (type === 'vector') {
			// Load vector tile (MVT)
			if (tileZ === undefined || tileX === undefined || tileY === undefined) {
				callback(new Error('tileZ, tileX, tileY are required for vector tiles'), null)
				return
			}

			// temp
			// new Promise((resolve) => {
			// 	setTimeout(() => {
			// 		resolve(null)
			// 	}, 1000);
			// }).then(() => {

			http.get<ArrayBuffer>(url, { timeout: 5000, responseType: 'arrayBuffer' })
				.then((res) => {
					if (res.status !== 200) {
						callback(new Error(`${url} load failed with status ${res.status}`), null)
						return
					}

					try {
						// Parse MVT to ENCFeature[]
						const features = parseMVT(res.data, tileZ, tileX, tileY, { layers })
						callback(null, features)
					} catch (parseError) {
						callback(parseError as Error, null)
					}
				})
				.catch((err) => {
					callback(err, null)
				})

			// })
		} else {
			// Load raster tile (image)
			http.get<Blob>(url, { timeout: 5000, responseType: 'blob' })
				.then((res) => {
					if (res.status !== 200) {
						callback(new Error(`${url} load failed with status ${res.status}`), null)
						return
					}

					createImageBitmap(res.data, {
						// 'imageOrientation': 'flipY'
					})
						.then((bitmap: ImageBitmap) => {
							callback(null, bitmap)
						})
						.catch((err) => {
							callback(err, null)
						})
				})
				.catch((err) => {
					callback(err, null)
				})
		}
	} catch (e: unknown) {
		callback(e instanceof Error ? e : new Error(String(e)), null)
	}
}
