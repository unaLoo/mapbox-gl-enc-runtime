import { BaseRenderer } from './BaseRenderer'
import { ShaderManager } from './shader_manager'
import { PatternManager } from '@/pattern/PatternManager'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { APRenderInfo } from './types'
import { getEventBus } from '@/utils/eventBus'

/**
 * APRenderer - Area Pattern Renderer
 * Renders textured polygons using pattern fills
 */
export class APRenderer extends BaseRenderer {
    private shaderManager: ShaderManager
    private patternManager: PatternManager

    constructor(gl: WebGL2RenderingContext) {
        super('AP', gl)
        this.shaderManager = ShaderManager.getInstance()
        this.shaderManager.initialize(this.gl)
        this.patternManager = PatternManager.getInstance()
        this.patternManager.initialize(this.gl)
    }

    handleBucketsReady(
        tile: Tile,
        renderInfo: {
            vertices: number[]
            indices: number[]
            vertexCount: number
            indexCount: number
            patternUrl: string
            opacity: number
        },
    ) {
        const tileId = tile.overscaledTileID.toString()

        // Create vertex buffer with position + UV data
        const vertexBuffer = this.gl.createBuffer()
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(renderInfo.vertices), this.gl.STATIC_DRAW)

        // Create index buffer
        const indexBuffer = this.gl.createBuffer()
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderInfo.indices), this.gl.STATIC_DRAW)

        // Store render info including patternUrl and opacity
        this.tileRenderInfo.set(tileId, {
            vertexBuffer,
            indexBuffer,
            vertexCount: renderInfo.vertexCount,
            indexCount: renderInfo.indexCount,
            patternUrl: renderInfo.patternUrl,
            opacity: renderInfo.opacity,
        } as APRenderInfo)


        // Start loading the pattern texture if not already cached
        if (!this.patternManager.hasTexture(renderInfo.patternUrl)) {
            this.patternManager.onTextureReady(renderInfo.patternUrl, () => {
                // Trigger render frame when texture becomes available
                const eventBus = getEventBus()
                eventBus?.trigger('renderFrame')
            })
        }

        // Trigger render frame
        const eventBus = getEventBus()
        eventBus?.trigger('renderFrame')
    }

    renderTile(
        tile: Tile,
        options: {
            sharingVPMatrix: mat4
            viewport: { width: number; height: number }
            tilePosMatrix: mat4
        },
    ): void {
        const tileId = tile.overscaledTileID.toString()
        const renderInfo = this.tileRenderInfo.get(tileId) as APRenderInfo
        if (!renderInfo) return

        this.renderPattern(renderInfo, options)
    }

    private renderPattern(
        renderInfo: APRenderInfo,
        options: { sharingVPMatrix: mat4; viewport: { width: number; height: number }; tilePosMatrix: mat4 },
    ) {
        // Get pattern texture from PatternManager
        const patternResult = this.patternManager.getTexture(renderInfo.patternUrl)

        // Skip rendering if texture not ready
        if (!patternResult) {
            return
        }

        // Use pattern shader program
        const program = this.shaderManager.getPatternProgram()
        if (!program) return

        this.gl.useProgram(program)

        // Set vertex attributes (a_position, a_texcoord)
        const positionLoc = this.gl.getAttribLocation(program, 'a_position')
        const texcoordLoc = this.gl.getAttribLocation(program, 'a_texcoord')

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, renderInfo.vertexBuffer)

        // Vertex layout: [x, y, u, v] - 4 floats per vertex, stride = 16 bytes
        this.gl.enableVertexAttribArray(positionLoc)
        this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 16, 0) // position at offset 0

        this.gl.enableVertexAttribArray(texcoordLoc)
        this.gl.vertexAttribPointer(texcoordLoc, 2, this.gl.FLOAT, false, 16, 8) // texcoord at offset 8 bytes

        // Set uniforms (u_matrix, u_pattern, u_opacity)
        const tMVP = mat4.create()
        mat4.mul(tMVP, options.sharingVPMatrix, options.tilePosMatrix)

        const matrixLoc = this.gl.getUniformLocation(program, 'u_matrix')
        this.gl.uniformMatrix4fv(matrixLoc, false, tMVP)

        const opacityLoc = this.gl.getUniformLocation(program, 'u_opacity')
        this.gl.uniform1f(opacityLoc, renderInfo.opacity)

        // Bind texture and set sampler uniform
        this.gl.activeTexture(this.gl.TEXTURE0)
        this.gl.bindTexture(this.gl.TEXTURE_2D, patternResult.texture)

        const patternLoc = this.gl.getUniformLocation(program, 'u_pattern')
        this.gl.uniform1i(patternLoc, 0) // texture unit 0

        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        // Draw triangles
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, renderInfo.indexBuffer)
        this.gl.drawElements(this.gl.TRIANGLES, renderInfo.indexCount, this.gl.UNSIGNED_SHORT, 0)
    }
}
