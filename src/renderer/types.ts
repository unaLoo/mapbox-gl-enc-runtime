import { mat4 } from 'gl-matrix'

export interface AreaRenderInfo {
	vertexBuffer: WebGLBuffer
	indexBuffer: WebGLBuffer
	vertexCount: number
	indexCount: number
}
