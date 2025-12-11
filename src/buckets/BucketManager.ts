import { Tile } from "@/tiles/tile"
import { ParsedStyledFeature } from "@/rules/types"
import { InstructonType } from "@/rules/types"
import { BaseBucket } from "./BaseBucket"
import { ACBucket } from "./ACBucket"
import { TXBucket } from "./TXBucket"

export class BucketManager {
    private buckets: Map<InstructonType, BaseBucket> = new Map()

    constructor() {
        // Register All Bucket
        this.buckets.set('AC', new ACBucket())
        this.buckets.set('TX', new TXBucket())
        // ... 其他类型
    }

    processFeatures(tile: Tile, styledFeatures: ParsedStyledFeature[]) {
        // 按渲染类型分组要素
        const groupedFeatures = this.groupFeaturesByType(styledFeatures)

        // 分发给对应的Bucket处理
        for (const [type, features] of groupedFeatures) {
            const bucket = this.buckets.get(type)
            if (bucket) {
                bucket.processFeatures(tile, features)
            }
        }
    }

    private groupFeaturesByType(features: ParsedStyledFeature[]): Map<InstructonType, ParsedStyledFeature[]> {
        const groups = new Map<InstructonType, ParsedStyledFeature[]>()

        for (const feature of features) {
            const type = feature.styleDesc.type
            if (!groups.has(type)) {
                groups.set(type, [])
            }
            groups.get(type)!.push(feature)
        }

        return groups
    }
}