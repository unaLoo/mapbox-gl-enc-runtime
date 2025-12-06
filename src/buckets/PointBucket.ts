/**
 * Point Render Bucket
 * Manages point renderable elements
 */

import { BaseRenderBucket } from './RenderBucket'
import type { BucketRenderOptions } from './types'
import { ShaderManager } from '../renderer/shader_manager'
import type { TileLocalGeometry } from '../types'

/**
 * Point Bucket
 * Collects and manages point renderable elements
 */
export class PointBucket extends BaseRenderBucket {
	readonly type = 'point' as const

	/**
	 * Build GPU buffers from point elements
	 * Vertex format: [x, y, r, g, b, a, size]
	 */
	buildBuffers(gl: WebGL2RenderingContext): void {
		if (this.buffersBuilt && this.elements.length === 0) {
			return
		}

		const vertices: number[] = []


		for (const element of this.elements) {
			const { geometry, style } = element
			const color = style.color || [255, 0, 0, 1]
			const size = style.symbolSize || 24
			const opacity = style.opacity ?? 1.0

			// Normalize color to 0-1 range
			const r = color[0] / 255
			const g = color[1] / 255
			const b = color[2] / 255
			const a = (color[3] ?? 1.0) * opacity

			// Extract point coordinates
			const points = this.extractPoints(geometry)
			for (const point of points) {
				vertices.push(point.x, point.y, r, g, b, a, size)
			}
		}

		this.vertexCount = vertices.length / 7 // 7 components per vertex

		// Create or update vertex buffer
		if (!this.vertexBuffer) {
			this.vertexBuffer = gl.createBuffer()
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

		this.buffersBuilt = true
	}

	/**
	 * Render points
	 */
	render(options: BucketRenderOptions): void {
		const { gl, matrix, viewport } = options

		if (!this.buffersBuilt || this.vertexCount === 0) {
			this.buildBuffers(gl)
		}

		if (this.vertexCount === 0) {
			return
		}

		const shaderManager = ShaderManager.getInstance()
		const program = shaderManager.getPointProgram()
		if (!program) {
			console.warn('Point shader program not initialized')
			return
		}

		// Use shader program
		gl.useProgram(program)

		// Set up attributes
		const positionLoc = gl.getAttribLocation(program, 'a_position')
		const colorLoc = gl.getAttribLocation(program, 'a_color')
		const sizeLoc = gl.getAttribLocation(program, 'a_size')


		// Bind vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
		gl.enableVertexAttribArray(positionLoc)
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 7 * 4, 0)
		gl.vertexAttribDivisor(positionLoc, 1)
		gl.enableVertexAttribArray(colorLoc)
		gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 7 * 4, 2 * 4)
		gl.vertexAttribDivisor(colorLoc, 1)
		gl.enableVertexAttribArray(sizeLoc)
		gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 7 * 4, 6 * 4)
		gl.vertexAttribDivisor(sizeLoc, 1)

		// Set uniforms
		const matrixLoc = gl.getUniformLocation(program, 'u_matrix')
		gl.uniformMatrix4fv(matrixLoc, false, matrix)
		const viewportLoc = gl.getUniformLocation(program, 'u_viewport')
		gl.uniform2f(viewportLoc, viewport.width, viewport.height)

		// Enable blending for transparency
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

		// Draw quads for each point (billboarding)
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.vertexCount)

		// 重置分频器
		gl.vertexAttribDivisor(positionLoc, 0);
		gl.vertexAttribDivisor(colorLoc, 0);
		gl.vertexAttribDivisor(sizeLoc, 0);

		// 解绑缓冲区（可选，但推荐）
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	}

	/**
	 * Extract points from geometry
	 */
	private extractPoints(geometry: TileLocalGeometry): Array<{ x: number; y: number }> {
		const points: Array<{ x: number; y: number }> = []

		if (geometry.type === 'Point') {
			const coords = geometry.coordinates as { x: number; y: number }
			points.push(coords)
		} else if (geometry.type === 'MultiPoint') {
			const coords = geometry.coordinates as Array<{ x: number; y: number }>
			points.push(...coords)
		}

		return points
	}
}
