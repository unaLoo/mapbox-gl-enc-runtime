/**
 * Base Render Bucket
 * Base implementation for render buckets
 */

import type { RenderableElement } from '../interpreter/types'
import type { RenderBucket, BucketStats, BucketRenderOptions } from './types'

/**
 * Base class for render buckets
 * Provides common functionality for all bucket types
 */
export abstract class BaseRenderBucket implements RenderBucket {
	abstract readonly type: 'point' | 'line' | 'area' | 'text'

	protected elements: RenderableElement[] = []
	protected vertexBuffer: WebGLBuffer | null = null
	protected indexBuffer: WebGLBuffer | null = null
	protected vertexCount: number = 0
	protected indexCount: number = 0
	protected buffersBuilt: boolean = false

	/**
	 * Add a renderable element to this bucket
	 */
	addElement(element: RenderableElement): void {
		if (element.type === this.type) {
			this.elements.push(element)
			this.buffersBuilt = false // Mark buffers as dirty
		}
	}

	/**
	 * Build GPU buffers from collected elements
	 * Must be implemented by subclasses
	 */
	abstract buildBuffers(gl: WebGL2RenderingContext): void

	/**
	 * Execute rendering
	 * Must be implemented by subclasses
	 */
	abstract render(options: BucketRenderOptions): void

	/**
	 * Clear all elements
	 */
	clear(): void {
		this.elements = []
		this.buffersBuilt = false
	}

	/**
	 * Dispose all resources
	 */
	dispose(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
		if (this.vertexBuffer) {
			gl.deleteBuffer(this.vertexBuffer)
			this.vertexBuffer = null
		}
		if (this.indexBuffer) {
			gl.deleteBuffer(this.indexBuffer)
			this.indexBuffer = null
		}
		this.clear()
	}

	/**
	 * Get statistics
	 */
	getStats(): BucketStats {
		return {
			elementCount: this.elements.length,
			vertexCount: this.vertexCount,
			indexCount: this.indexCount,
		}
	}

	/**
	 * Get all elements in this bucket
	 */
	getElements(): RenderableElement[] {
		return [...this.elements]
	}
}
