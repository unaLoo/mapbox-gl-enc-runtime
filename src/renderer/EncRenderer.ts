import ezStore from '@/utils/store' // Assume store import
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { RendererManager } from './RendererManager'

export class ENCRenderer {
    private gl: WebGL2RenderingContext
    private rendererManager: RendererManager

    constructor() {
        this.gl = ezStore.get('gl') as WebGL2RenderingContext
        this.rendererManager = new RendererManager(this.gl)
        this.initialize()
    }

    initialize() {
        // RendererManager handles all the event subscriptions internally
        console.log('ENCRenderer initialized with RendererManager')
    }

    renderENC(coords: Tile[], options: { sharingVPMatrix: mat4; viewport: { width: number; height: number } }) {
        // Delegate rendering to RendererManager
        this.rendererManager.renderTiles(coords, options)
    }

    destroy() {
        this.rendererManager.destroy()
    }
}
