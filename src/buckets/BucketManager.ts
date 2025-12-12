import { Tile } from '@/tiles/tile'
import { ParsedStyledFeature } from '@/rules/types'
import { InstructonType } from '@/rules/types'
import { LayeredParsedStyledFeature, LayeredGroupKey } from '@/types'
import { BaseBucket } from './BaseBucket'
import { ACBucket } from './ACBucket'
import { TXBucket } from './TXBucket'

export class BucketManager {
	// 修改：按 "layerId-type" 创建独立的 Bucket 实例
	private buckets: Map<LayeredGroupKey, BaseBucket> = new Map()

	constructor() {
		// 不再预创建，改为按需创建
	}

	processFeatures(data: {
		tile: Tile
		tileSourceId: string
		layeredStyledFeatures: LayeredParsedStyledFeature[]
		groupedFeatures: Map<LayeredGroupKey, LayeredParsedStyledFeature[]>
	}) {
		const { tile, groupedFeatures } = data

		// 为每个 "图层-类型" 组合创建或获取 Bucket
		for (const [layeredGroupKey, features] of groupedFeatures) {
			if (features.length === 0) continue

			const [, type] = layeredGroupKey.split('-')

			// 创建独立的 Bucket 实例
			const bucket = this.getOrCreateBucket(layeredGroupKey, type as InstructonType)
			bucket.processFeatures(tile, features)
		}
	}

	// 为每个 "图层-类型" 组合创建独立的 Bucket
	private getOrCreateBucket(layeredGroupKey: LayeredGroupKey, type: InstructonType): BaseBucket {
		if (!this.buckets.has(layeredGroupKey)) {
			switch (type) {
				case 'AC':
					this.buckets.set(layeredGroupKey, new ACBucket(layeredGroupKey))
					break
				case 'TX':
					this.buckets.set(layeredGroupKey, new TXBucket(layeredGroupKey))
					break
				// ... 其他类型
				default:
					throw new Error(`Unsupported bucket type: ${type}`)
			}
		}
		return this.buckets.get(layeredGroupKey)!
	}
}
