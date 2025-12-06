/**
 * Area Render Bucket
 * Manages area (polygon) renderable elements
 */
import earcut from 'earcut'
import { BaseRenderBucket } from './RenderBucket'
import type { BucketRenderOptions } from './types'
import { ShaderManager } from '../renderer/shader_manager'
import type { TileLocalGeometry } from '../types'
import type { RenderStyle } from '../interpreter/types'
import classifyRings from './classifyRing'

/**
 * Area Bucket
 * Collects and manages area renderable elements
 * Uses ear clipping triangulation for polygons
 */
export class AreaBucket extends BaseRenderBucket {
	readonly type = 'area' as const

	/**
	 * Build GPU buffers from area elements
	 * Vertex format: [x, y, r, g, b, a]
	 * Uses triangulation for polygons
	 */
	buildBuffers(gl: WebGL2RenderingContext): void {
		if (this.buffersBuilt && this.elements.length === 0) {
			return
		}
		const vertices: number[] = []
		const indices: number[] = []

		// 获取颜色，默认为白色
		const getColor = (style: RenderStyle): [number, number, number, number] => {
			if (style.color) {
				return style.color
			}
			const opacity = style.opacity ?? 1.0
			return [1.0, 1.0, 1.0, opacity]
		}

		for (const element of this.elements) {
			const { geometry, style } = element
			const color = getColor(style)
			const rawPolygons = this.extractPolygons(geometry)

			// 记录当前顶点起始索引
			let vertexOffset = vertices.length / 6

			for (const rawPolygon of rawPolygons) {
				if (rawPolygon.length === 0) continue

				// 使用 classifyRings 正确分类外环和内环（孔）
				const classifiedPolygons = classifyRings(rawPolygon, 500) // maxRings = 500 for performance

				for (const polygon of classifiedPolygons) {
					if (polygon.length === 0) continue

					// 外环（第一个环）
					const exteriorRing = polygon[0]
					if (exteriorRing.length < 3) continue // 至少需要3个点才能形成三角形

					// 准备 earcut 输入：扁平化的坐标数组 [x0, y0, x1, y1, ...]
					const flatCoords: number[] = []
					for (const point of exteriorRing) {
						flatCoords.push(point.x, point.y)
					}

					// 洞的索引数组（内环，从第二个环开始）
					const holes: number[] = []
					let holeIndex = exteriorRing.length
					for (let i = 1; i < polygon.length; i++) {
						const hole = polygon[i]
						if (hole.length >= 3) {
							holes.push(holeIndex)
							for (const point of hole) {
								flatCoords.push(point.x, point.y)
							}
							holeIndex += hole.length
						}
					}

					// 使用 earcut 进行三角化
					const triangulation = earcut(flatCoords, holes.length > 0 ? holes : undefined, 2)

					// 生成顶点数据（每个顶点包含位置和颜色）
					for (let i = 0; i < flatCoords.length; i += 2) {
						vertices.push(
							flatCoords[i], // x
							flatCoords[i + 1], // y
							color[0], // r
							color[1], // g
							color[2], // b
							color[3], // a
						)
					}

					// 生成索引数据（需要加上顶点偏移量）
					for (const index of triangulation) {
						indices.push(vertexOffset + index)
					}

					// 更新顶点偏移量
					vertexOffset += flatCoords.length / 2
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
	 * Render areas
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
		const program = shaderManager.getAreaProgram()
		if (!program) {
			console.warn('Area shader program not initialized')
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

		// Draw triangles
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
		gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0)
	}

	/**
	 * Extract polygons from geometry
	 */
	private extractPolygons(geometry: TileLocalGeometry): Array<Array<Array<{ x: number; y: number }>>> {
		const polygons: Array<Array<Array<{ x: number; y: number }>>> = []

		const coords = geometry.coordinates as Array<Array<{ x: number; y: number }>>
		polygons.push(coords)

		return polygons
	}
}
