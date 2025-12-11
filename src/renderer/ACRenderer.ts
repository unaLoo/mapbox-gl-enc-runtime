import { BaseRenderer } from './BaseRenderer'
import { ShaderManager } from './shader_manager'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { AreaRenderInfo } from './types'
import { getEventBus } from '@/utils/eventBus'

export class ACRenderer extends BaseRenderer {
    private shaderManager: ShaderManager

    constructor(gl: WebGL2RenderingContext) {
        super('AC', gl)
        this.shaderManager = ShaderManager.getInstance()
        this.shaderManager.initialize(this.gl)
    }

    protected handleBucketsReady(tile: Tile, renderInfo: { vertices: number[]; indices: number[]; vertexCount: number; indexCount: number }) {
        const tileId = tile.overscaledTileID.toString()
        console.log('handleBucketsReady in AC', tileId)
        // Create GL buffers
        const vertexBuffer = this.gl.createBuffer()
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(renderInfo.vertices), this.gl.STATIC_DRAW)

        const indexBuffer = this.gl.createBuffer()
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderInfo.indices), this.gl.STATIC_DRAW)

        // Store render info
        this.tileRenderInfo.set(tileId, {
            vertexBuffer,
            indexBuffer,
            vertexCount: renderInfo.vertexCount,
            indexCount: renderInfo.indexCount,
            tilePosMatrix: tile.tilePosMatrix(),
        })

        // Trigger render frame
        const eventBus = getEventBus()
        eventBus?.trigger('renderFrame')
    }

    renderTile(tile: Tile, options: {
        sharingVPMatrix: mat4
        viewport: { width: number; height: number }
        tilePosMatrix: mat4
    }): void {
        console.log('render tile in AC')
        const tileId = tile.overscaledTileID.toString()
        const renderInfo = this.tileRenderInfo.get(tileId) as AreaRenderInfo
        if (!renderInfo) return

        console.log('renderArea', renderInfo)
        this.renderArea(renderInfo, options)
    }

    private renderArea(
        renderInfo: AreaRenderInfo,
        options: { sharingVPMatrix: mat4; viewport: { width: number; height: number }; tilePosMatrix: mat4 },
    ) {
        const program = this.shaderManager.getAreaProgram()
        if (!program) return

        this.gl.useProgram(program)

        // Set attributes
        const positionLoc = this.gl.getAttribLocation(program, 'a_position')
        const colorLoc = this.gl.getAttribLocation(program, 'a_color')

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, renderInfo.vertexBuffer)
        this.gl.enableVertexAttribArray(positionLoc)
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 24, 0) // 6 floats * 4 bytes = 24 stride
        this.gl.enableVertexAttribArray(colorLoc)
        this.gl.vertexAttribPointer(colorLoc, 4, this.gl.FLOAT, false, 24, 8) // offset 2 floats * 4 = 8

        // Uniforms
        const tMVP = mat4.create()
        mat4.mul(tMVP, options.sharingVPMatrix, options.tilePosMatrix)

        const matrixLoc = this.gl.getUniformLocation(program, 'u_matrix')
        this.gl.uniformMatrix4fv(matrixLoc, false, tMVP)
        const viewportLoc = this.gl.getUniformLocation(program, 'u_viewport')
        this.gl.uniform2f(viewportLoc, options.viewport.width, options.viewport.height)

        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, renderInfo.indexBuffer)
        this.gl.drawElements(this.gl.TRIANGLES, renderInfo.indexCount, this.gl.UNSIGNED_SHORT, 0)
    }
}
