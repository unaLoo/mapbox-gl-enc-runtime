import { getEventBus } from '@/utils/eventBus'
import { ShaderManager } from './shader_manager' // Assume path
import ezStore from '@/utils/store' // Assume store import
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { AreaRenderInfo } from './types'

export class ENCRenderer {
	private gl: WebGL2RenderingContext
	private tileRenderInfo: Map<string, Map<string, any>> = new Map() // tileId -> type -> {vertexBuffer, indexBuffer, vertexCount, indexCount}
	private shaderManager: ShaderManager

	constructor() {
		this.gl = ezStore.get('gl') as WebGL2RenderingContext
		this.shaderManager = ShaderManager.getInstance()
		this.initialize()
	}

	initialize() {
		// console.log('initialize ENCRenderer');
		this.shaderManager.initialize(this.gl)
		const eventBus = getEventBus()
		eventBus?.on('bucketsReady', (data: { tile: Tile; type: string; renderInfo: any }) => {
			this.handleBucketsReady(data)
		})
	}

	private handleBucketsReady(data: {
		tile: Tile
		type: string
		renderInfo: { vertices: number[]; indices: number[]; vertexCount: number; indexCount: number }
	}) {
		const { tile, type, renderInfo } = data
		const tileId = tile.overscaledTileID.toString()

		// Create GL buffers
		const vertexBuffer = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(renderInfo.vertices), this.gl.STATIC_DRAW)

		const indexBuffer = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderInfo.indices), this.gl.STATIC_DRAW)

		if (!this.tileRenderInfo.has(tileId)) {
			this.tileRenderInfo.set(tileId, new Map())
		}
		this.tileRenderInfo.get(tileId)!.set(type, {
			vertexBuffer,
			indexBuffer,
			vertexCount: renderInfo.vertexCount,
			indexCount: renderInfo.indexCount,
			tilePosMatrix: tile.tilePosMatrix(),
		}) // Area Render Info Structure

		const eventBus = getEventBus()
		eventBus?.trigger('renderFrame') // EncRuntime listening and trigger this.renderCharts
	}

	renderENC(coords: Tile[], options: { sharingVPMatrix: mat4; viewport: { width: number; height: number } }) {
		// Coords and Options passed from ENCRuntime`s render loop
		console.log(1231, coords)
		coords.forEach((tile: Tile) => {
			const id = tile.overscaledTileID.toString()
			const renderInfo = this.tileRenderInfo.get(id)
			if (!renderInfo) return

			// temp
			const areaRenderInfo = renderInfo.get('area')
			this.renderArea(areaRenderInfo, { ...options, tilePosMatrix: tile.tilePosMatrix() })
		})

		// this.tileRenderInfo.forEach((typeMap) => {
		//     typeMap.forEach((renderInfo, type) => {
		//         if (type === 'area') {
		//             this.renderArea(renderInfo, options);
		//         }
		//         // Add other types later
		//     });
		// });
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

	// Other methods can be kept or removed as needed
}
