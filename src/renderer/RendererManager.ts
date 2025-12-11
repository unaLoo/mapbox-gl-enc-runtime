import { BaseRenderer } from './BaseRenderer'
import { ACRenderer } from './ACRenderer'
import { TXRenderer } from './TXRenderer'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'

export class RendererManager {
    private renderers: Map<string, BaseRenderer> = new Map()

    constructor(gl: WebGL2RenderingContext) {
        this.renderers.set('AC', new ACRenderer(gl))
        this.renderers.set('TX', new TXRenderer(gl))
        // other (LS, LC, SY, etc.)...
    }

    renderTiles(tiles: Tile[], options: {
        sharingVPMatrix: mat4
        viewport: { width: number; height: number }
    }) {
        tiles.forEach((tile: Tile) => {
            const tilePosMatrix = tile.tilePosMatrix()

            // Render each type for this tile
            this.renderers.forEach((renderer) => {
                renderer.renderTile(tile, {
                    ...options,
                    tilePosMatrix
                })
            })
        })
    }

    getRenderer(type: string): BaseRenderer | undefined {
        return this.renderers.get(type)
    }

    destroy() {
        this.renderers.forEach((renderer) => {
            renderer.destroy()
        })
        this.renderers.clear()
    }
}
