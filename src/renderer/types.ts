import { mat4 } from 'gl-matrix'

export interface AreaRenderInfo {
	vertexBuffer: WebGLBuffer
	indexBuffer: WebGLBuffer
	vertexCount: number
	indexCount: number
}

/**
 * Render info for Area Pattern (AP) rendering
 * Contains buffers and pattern-specific data for textured polygon fills
 */
export interface APRenderInfo {
	vertexBuffer: WebGLBuffer
	indexBuffer: WebGLBuffer
	vertexCount: number
	indexCount: number
	patternUrl: string
	opacity: number
}
