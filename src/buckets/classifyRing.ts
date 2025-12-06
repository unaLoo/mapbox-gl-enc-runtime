
/**
 * Ring with area property
 */
interface RingWithArea extends Array<{ x: number; y: number }> {
    area?: number
}

/**
 * Calculate signed area of a ring
 * Positive area = counter-clockwise (exterior ring)
 * Negative area = clockwise (interior ring/hole)
 */
function calculateSignedArea(ring: Array<{ x: number; y: number }>): number {
    let sum = 0
    const len = ring.length
    for (let i = 0; i < len; i++) {
        const p1 = ring[i]
        const p2 = ring[(i + 1) % len]
        sum += (p2.x - p1.x) * (p2.y + p1.y)
    }
    return sum / 2
}

/**
 * Compare areas for sorting (largest first)
 */
function compareAreas(a: RingWithArea, b: RingWithArea): number {
    return (b.area || 0) - (a.area || 0)
}

/**
 * Classifies an array of rings into polygons with outer rings and holes
 * Based on Mapbox's classifyRings implementation
 * @param rings Array of rings (each ring is an array of points)
 * @param maxRings Maximum number of rings per polygon (for performance)
 * @returns Array of polygons, where each polygon is [exteriorRing, ...holes]
 */
export default function classifyRings(
    rings: Array<Array<{ x: number; y: number }>>,
    maxRings: number = Infinity,
): Array<Array<Array<{ x: number; y: number }>>> {
    const len = rings.length

    if (len <= 1) return [rings]

    const polygons: Array<Array<RingWithArea>> = []
    let polygon: Array<RingWithArea> | undefined
    let ccw: boolean | undefined

    for (let i = 0; i < len; i++) {
        const area = calculateSignedArea(rings[i])
        if (area === 0) continue

        const ringWithArea = rings[i] as RingWithArea
        ringWithArea.area = Math.abs(area)

        if (ccw === undefined) ccw = area < 0

        if (ccw === area < 0) {
            // Same orientation as first ring - this is a new polygon
            if (polygon) polygons.push(polygon)
            polygon = [ringWithArea]
        } else {
            // Opposite orientation - this is a hole in the current polygon
            if (!polygon) {
                // If no polygon yet, create one (shouldn't happen, but handle it)
                polygon = [ringWithArea]
                ccw = area < 0
            } else {
                polygon.push(ringWithArea)
            }
        }
    }
    if (polygon) polygons.push(polygon)

    // Limit the number of rings per polygon for performance
    // Keep only the largest rings
    if (maxRings > 1) {
        for (let j = 0; j < polygons.length; j++) {
            if (polygons[j].length <= maxRings) continue

            // Sort rings by area (largest first), keeping first ring (exterior)
            const exterior = polygons[j][0]
            const holes = polygons[j].slice(1)
            holes.sort(compareAreas)
            polygons[j] = [exterior, ...holes.slice(0, maxRings - 1)]
        }
    }

    return polygons as Array<Array<Array<{ x: number; y: number }>>>
}
