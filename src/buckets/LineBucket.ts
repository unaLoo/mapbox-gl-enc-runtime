/**
 * Line Render Bucket
 * Manages line renderable elements
 */

import { BaseRenderBucket } from './RenderBucket'
import type { BucketRenderOptions } from './types'
import { ShaderManager } from '../renderer/shader_manager'
import type { TileLocalGeometry } from '../types'

/**
 * Line Bucket
 * Collects and manages line renderable elements
 */
export class LineBucket extends BaseRenderBucket {
	readonly type = 'line' as const

	/**
	 * Build GPU buffers from line elements
	 * Vertex format: [x, y, r, g, b, a]
	 */
	buildBuffers(gl: WebGL2RenderingContext): void {
		if (this.buffersBuilt && this.elements.length === 0) {
			return
		}

		const vertices: number[] = []
		const indices: number[] = []

		let vertexIndex = 0

		for (const element of this.elements) {
			const { geometry, style } = element
			const color = style.color || [0, 0, 255, 1]
			const opacity = style.opacity ?? 1.0

			// Normalize color to 0-1 range
			const r = color[0] / 255
			const g = color[1] / 255
			const b = color[2] / 255
			const a = (color[3] ?? 1.0) * opacity

			// Extract line coordinates
			const lines = this.extractLines(geometry)
			for (const line of lines) {
				for (const point of line) {
					vertices.push(point.x, point.y, r, g, b, a)
					indices.push(vertexIndex++)
				}
			}
		}

		this.vertexCount = vertices.length / 6 // 6 components per vertex
		this.indexCount = indices.length

		// Create or update vertex buffer
		if (!this.vertexBuffer) {
			this.vertexBuffer = gl.createBuffer()
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

		// Create or update index buffer
		if (!this.indexBuffer) {
			this.indexBuffer = gl.createBuffer()
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

		this.buffersBuilt = true
	}

	/**
	 * Render lines
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
		const program = shaderManager.getLineProgram()
		if (!program) {
			console.warn('Line shader program not initialized')
			return
		}

		// Use shader program
		gl.useProgram(program)

		// Set up attributes
		const positionLoc = gl.getAttribLocation(program, 'a_position')
		const colorLoc = gl.getAttribLocation(program, 'a_color')

		// Bind vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
		gl.enableVertexAttribArray(positionLoc)
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 6 * 4, 0)
		gl.enableVertexAttribArray(colorLoc)
		gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 6 * 4, 2 * 4)

		// Set uniforms
		const matrixLoc = gl.getUniformLocation(program, 'u_matrix')
		gl.uniformMatrix4fv(matrixLoc, false, matrix)
		const viewportLoc = gl.getUniformLocation(program, 'u_viewport')
		gl.uniform2f(viewportLoc, viewport.width, viewport.height)

		// Enable blending for transparency
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

		// Draw lines as line strips
		// We need to draw each line separately, so we'll use a simple approach
		// For better performance, we could use primitive restart or separate draw calls
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)

		// Simple approach: draw all as one line strip (may have artifacts between lines)
		// TODO: Implement proper line segment rendering with primitive restart
		let offset = 0
		for (const element of this.elements) {
			const lines = this.extractLines(element.geometry)
			for (const line of lines) {
				const count = line.length
				if (count > 1) {
					gl.drawElements(gl.LINE_STRIP, count, gl.UNSIGNED_SHORT, offset * 2)
					offset += count
				}
			}
		}

	}

	/**
	 * Extract lines from geometry
	 */
	private extractLines(geometry: TileLocalGeometry): Array<Array<{ x: number; y: number }>> {
		const lines: Array<Array<{ x: number; y: number }>> = []

		if (geometry.type === 'LineString') {
			const coords = geometry.coordinates as Array<{ x: number; y: number }>
			lines.push(coords)
		} else if (geometry.type === 'MultiLineString') {
			const coords = geometry.coordinates as Array<Array<{ x: number; y: number }>>
			lines.push(...coords)
		}

		return lines
	}

}

