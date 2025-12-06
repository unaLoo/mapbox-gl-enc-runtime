/**
 * Render Bucket Manager
 * Manages all render buckets for a single tile
 * One RenderBucketManager per tile
 */

import type { RenderableElement } from '../interpreter/types'
import type { RenderBucket, BucketStats } from './types'
import { PointBucket } from './PointBucket'
import { LineBucket } from './LineBucket'
import { AreaBucket } from './AreaBucket'
import { TextBucket } from './TextBucket'

/**
 * Render Bucket Manager
 * Manages all buckets (point, line, area, text) for a single tile
 */
export class RenderBucketManager {
	private buckets: Map<string, RenderBucket> = new Map()
	private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null

	constructor(gl: WebGLRenderingContext | WebGL2RenderingContext | null = null) {
		this.gl = gl
		this.initializeBuckets()
	}

	/**
	 * Initialize all bucket types
	 */
	private initializeBuckets(): void {
		this.buckets.set('point', new PointBucket())
		this.buckets.set('line', new LineBucket())
		this.buckets.set('area', new AreaBucket())
		this.buckets.set('text', new TextBucket())
	}

	/**
	 * Set WebGL context
	 */
	setGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
		this.gl = gl
	}

	/**
	 * Get WebGL context
	 */
	getGLContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
		return this.gl
	}

	/**
	 * Add a renderable element to the appropriate bucket
	 */
	addElement(element: RenderableElement): void {
		const bucket = this.buckets.get(element.type)
		if (bucket) {
			bucket.addElement(element)
		}
	}

	/**
	 * Get a bucket by type
	 */
	getBucket(type: 'point' | 'line' | 'area' | 'text'): RenderBucket | undefined {
		return this.buckets.get(type)
	}

	/**
	 * Get all buckets
	 */
	getAllBuckets(): Map<string, RenderBucket> {
		return this.buckets
	}

	/**
	 * Clear all buckets
	 */
	clear(): void {
		for (const bucket of this.buckets.values()) {
			bucket.clear()
		}
	}

	/**
	 * Dispose all buckets and their resources
	 */
	dispose(): void {
		if (this.gl) {
			for (const bucket of this.buckets.values()) {
				bucket.dispose(this.gl)
			}
		}
		this.buckets.clear()
	}

	/**
	 * Get statistics for all buckets
	 */
	getStats(): {
		total: BucketStats
		byType: Record<string, BucketStats>
	} {
		const byType: Record<string, BucketStats> = {}
		let totalElementCount = 0
		let totalVertexCount = 0
		let totalIndexCount = 0

		for (const [type, bucket] of this.buckets.entries()) {
			const stats = bucket.getStats()
			byType[type] = stats
			totalElementCount += stats.elementCount
			totalVertexCount += stats.vertexCount
			totalIndexCount += stats.indexCount
		}

		return {
			total: {
				elementCount: totalElementCount,
				vertexCount: totalVertexCount,
				indexCount: totalIndexCount,
			},
			byType,
		}
	}

	/**
	 * Get all elements from all buckets
	 */
	getAllElements(): RenderableElement[] {
		const elements: RenderableElement[] = []
		for (const bucket of this.buckets.values()) {
			elements.push(...bucket.getElements())
		}
		return elements
	}

	/**
	 * Build buffers for all buckets
	 */
	buildAllBuffers(gl: WebGL2RenderingContext): void {
		for (const bucket of this.buckets.values()) {
			bucket.buildBuffers(gl)
		}
	}
}
