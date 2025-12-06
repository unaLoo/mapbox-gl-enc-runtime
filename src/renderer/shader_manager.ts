/**
 * Shader Manager
 * Manages WebGL shader programs for rendering
 */

import { createProgram, vertexShaderSource, fragmentShaderSource, pointFragmentShaderSource, pointVertexShaderSource } from './shaders'

/**
 * Shader Manager
 * Singleton that manages shader programs
 */
export class ShaderManager {
	private static instance: ShaderManager | null = null

	private pointProgram: WebGLProgram | null = null
	private lineProgram: WebGLProgram | null = null
	private areaProgram: WebGLProgram | null = null

	private gl: WebGL2RenderingContext | null = null

	static getInstance(): ShaderManager {
		if (!ShaderManager.instance) {
			ShaderManager.instance = new ShaderManager()
		}
		return ShaderManager.instance
	}

	/**
	 * Initialize shader programs
	 */
	initialize(gl: WebGL2RenderingContext): void {
		this.gl = gl

		// Create point shader program (with circular point fragment shader)
		// this.pointProgram = createProgram(gl, vertexShaderSource, pointFragmentShaderSource)
		this.pointProgram = createProgram(gl, pointVertexShaderSource, pointFragmentShaderSource)

		// Create line shader program
		this.lineProgram = createProgram(gl, vertexShaderSource, fragmentShaderSource)

		// Create area shader program
		this.areaProgram = createProgram(gl, vertexShaderSource, fragmentShaderSource)
	}

	/**
	 * Get point shader program
	 */
	getPointProgram(): WebGLProgram | null {
		return this.pointProgram
	}

	/**
	 * Get line shader program
	 */
	getLineProgram(): WebGLProgram | null {
		return this.lineProgram
	}

	/**
	 * Get area shader program
	 */
	getAreaProgram(): WebGLProgram | null {
		return this.areaProgram
	}

	/**
	 * Dispose all shader programs
	 */
	dispose(): void {
		if (!this.gl) return

		if (this.pointProgram) {
			this.gl.deleteProgram(this.pointProgram)
			this.pointProgram = null
		}
		if (this.lineProgram) {
			this.gl.deleteProgram(this.lineProgram)
			this.lineProgram = null
		}
		if (this.areaProgram) {
			this.gl.deleteProgram(this.areaProgram)
			this.areaProgram = null
		}

		this.gl = null
	}
}
