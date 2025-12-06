import { Map } from 'mapbox-gl'
import { mat4 } from 'gl-matrix'

import TilePicker from './tile_picker'
import TileSource from './tile_source'
import type { TileSourceType } from './tile_source'
import Dispatcher from '../data/message/dispatcher'
import { OverscaledTileID } from './tile_id'
import ezstore from '../utils/store'
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

	tileSouces = new window.Map<string, TileSource>()
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
		ezstore.set('map', this._map)
		ezstore.set('gl', this._map.painter.context.gl)

		this.onMapMove = this._onMapMove.bind(this)
		this._map.on('move', this.onMapMove as any)
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
		for (const tileSource of this.tileSouces.values()) {

			const coveringTiles = this._picker.coveringTile({
				minzoom: 0,
				maxzoom: tileSource.maxzoom || 22,
				renderWorldCopies: true,
				isDEMTile: false,
				roundZoom: false,
			})

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
		this.tileSouces.set(tileSource.id, tileSource)
	}

	removeSource(sourceId: string) {
		const tileSource = this.tileSouces.get(sourceId)
		if (!tileSource) return

		tileSource.remove()
		this.tileSouces.delete(sourceId)
	}

	getSource(sourceId: string): TileSource | undefined {
		return this.tileSouces.get(sourceId)
	}

	remove(): void {
		for (const source of this.tileSouces.values()) {
			source.remove()
		}
		this._map.off('move', this.onMapMove as any)
		this.tileSouces.clear()
		if (this.dispatcher) {
			this.dispatcher.remove()
		}
	}

	cleanCache() {
		for (const tileSource of this.tileSouces.values()) {
			tileSource.cleanCache()
		}
	}
}
