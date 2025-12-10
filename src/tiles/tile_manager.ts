import { Map } from 'mapbox-gl'
import { mat4 } from 'gl-matrix'

import TilePicker from './tile_picker'
import TileSource from './tile_source'
import type { TileSourceType } from './tile_source'
import Dispatcher from '../data/message/dispatcher'
import { OverscaledTileID } from './tile_id'
import { getMatrices } from '../utils/map_transform'

export type { TileSourceType }

export default class TileManager {
	private static instance: TileManager | null = null

	// Base
	type: 'custom' = 'custom' as const
	id: string = '$tileManager'
	renderingMode: '2d' | '3d' = '3d'

	debugMode: boolean = false

	// Core-Properties
	private _map: Map
	private _picker: TilePicker
	dispatcher: Dispatcher | null = null

	tileSourceMap = new window.Map<string, TileSource>()
	coveringTileMap = new window.Map<string, OverscaledTileID[]>()

	sharingVPMatrix!: mat4

	onMapMove: any = () => { }

	/**
	 * Get or create TileManager instance
	 */
	static getInstance(map: Map): TileManager {
		if (!TileManager.instance) {
			TileManager.instance = new TileManager(map)
		}
		return TileManager.instance
	}

	/**
	 * Remove TileManager instance
	 */
	static removeInstance(): void {
		const instance = TileManager.instance
		if (instance) {
			instance.remove()
			TileManager.instance = null
		}
	}

	private constructor(map: Map) {
		this._map = map
		this._picker = new TilePicker(map)

		this.onMapMove = this._onMapMove.bind(this)
		// this._map.on('move', this.onMapMove as any)
		this._map.on('moveend', this.onMapMove as any)
		Promise.resolve().then(this.onMapMove) // trigger immediately
	}

	_onMapMove(_: WebGL2RenderingContext, __: Array<number>) {
		this.sharingVPMatrix = getMatrices(this._map.transform).projMatrix

		// this.coveringTiles = this._picker.coveringTile({
		// 	minzoom: 0,
		// 	maxzoom: 22,
		// 	renderWorldCopies: true,
		// 	isDEMTile: false,
		// 	roundZoom: false,
		// })

		// const mapboxTiles = this._map.style._sourceCaches['other:composite']._tiles;
		// const mapboxTilesIds = Object.values(mapboxTiles).map(item => item?.tileID?.toString());
		// console.log(
		// 	'coveringTiles tile',
		// 	this._map.getZoom(),
		// 	this.coveringTiles.map(item => item.canonical.toString()).sort(),
		// 	mapboxTilesIds.sort()
		// );

		// const extendTiles = this._picker.extendTileCover(this.coveringTiles);
		for (const tileSource of this.tileSourceMap.values()) {

			const coveringTiles = this._picker.coveringTile({
				minzoom: 0,
				maxzoom: tileSource.maxzoom || 22,
				renderWorldCopies: true,
				isDEMTile: false,
				roundZoom: false,
			})

			// console.log(coveringTiles.map(item => item.canonical.toString()))

			this.coveringTileMap.set(tileSource.id, coveringTiles)

			for (const overscaledTileID of coveringTiles) {
				tileSource.loadTile(overscaledTileID)
			}
			// for (const extTileID of extendTiles) {
			// 	tileSource.loadTile(extTileID);
			// }
		}
	}

	addSource(sourceDesc: TileSourceType) {
		const tileSource = new TileSource(sourceDesc)
		tileSource._tileManager = this
		this.tileSourceMap.set(tileSource.id, tileSource)
	}

	removeSource(sourceId: string) {
		const tileSource = this.tileSourceMap.get(sourceId)
		if (!tileSource) return

		tileSource.remove()
		this.tileSourceMap.delete(sourceId)
	}

	getSource(sourceId: string): TileSource | undefined {
		return this.tileSourceMap.get(sourceId)
	}

	remove(): void {
		// Clean tile sources
		this.tileSourceMap.forEach(source => source.remove())
		this.tileSourceMap.clear()
		// Clean dispatcher
		this.dispatcher && this.dispatcher.remove()

		// Clean map event handler
		// this._map.off('move', this.onMapMove as any)
		this._map.off('moveend', this.onMapMove as any)
	}

	cleanCache() {
		this.tileSourceMap.forEach(source => source.cleanCache())
	}
}
