import ezstore from "@/utils/store";
import type { CustomLayerInterface } from "mapbox-gl";
import type { MapboxMap } from "../types";
import TileManager, { type TileSourceType } from "@/tiles/tile_manager";
import { initEventBus } from "@/utils/eventBus";

export interface ENCLayerOptions {
    tileSources?: TileSourceType[]
    [key: string]: any // other options maybe
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
        this.tileSources.forEach(item => tileManager.addSource(item))
    }

    render(gl: WebGL2RenderingContext, matrix: number[]): void {
        if (!this.tileManager) return

        for (const tileSource of this.tileManager.tileSourceMap.values()) {
            const tiles = tileSource.readyTiles()
            console.log('current tiles :', tiles.map(item => item.overscaledTileID.toString()))
        }
    }

    onRemove(map: MapboxMap, gl: WebGL2RenderingContext): void {
        this.tileManager?.remove()
        this.tileManager = null
        this.map = null
        this.gl = null
        ezstore.destroy()
    }
}