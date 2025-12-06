/**
 * Render Bucket Types
 * Defines interfaces for render buckets
 */

import type { RenderableElement } from '../interpreter/types'

/**
 * Bucket statistics
 */
export interface BucketStats {
	elementCount: number
	vertexCount: number
	indexCount: number
}

import type { mat4 } from 'gl-matrix'

/**
 * Render options for bucket rendering
 */
export interface BucketRenderOptions {
	gl: WebGL2RenderingContext
	matrix: mat4 // Combined transformation matrix (tilePosMatrix * vpMatrix)
	viewport: { width: number; height: number }
}

/**
 * Render bucket interface
 * Manages renderable elements of a specific type for a tile
 */
export interface RenderBucket {
	// Bucket type
	type: 'point' | 'line' | 'area' | 'text'

	// Add a renderable element to this bucket
	addElement(element: RenderableElement): void

	// Build GPU buffers from collected elements
	buildBuffers(gl: WebGL2RenderingContext): void

	// Execute rendering
	render(options: BucketRenderOptions): void

	// Clear all elements (but keep buffers if they exist)
	clear(): void

	// Dispose all resources (buffers, etc.)
	dispose(gl: WebGLRenderingContext | WebGL2RenderingContext): void

	// Get statistics
	getStats(): BucketStats

	// Get all elements in this bucket
	getElements(): RenderableElement[]
}
