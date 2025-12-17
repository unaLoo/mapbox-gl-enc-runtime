/**
 * CollisionIndex - Mapbox-compatible collision detection with viewport projection
 *
 * This class manages collision detection for text labels using grid-based spatial hashing.
 * It projects tile coordinates to viewport space for accurate collision detection at all
 * zoom levels and camera angles.
 *
 * @requirements 3.1 - Project tile coordinates to viewport space using position matrix
 * @requirements 3.2 - Calculate perspective ratio for distance-based scaling
 * @requirements 3.3 - Use grid-based spatial hashing for efficient queries
 * @requirements 3.4 - Return empty box array to indicate rejection on collision
 * @requirements 3.5 - Insert collision box into grid for future queries
 */

import { mat4, vec4 } from 'gl-matrix'
import { GridIndex } from './GridIndex'
import { xyTransformMat4 } from '../utils/symbol_projection'

/**
 * Collision box relative to an anchor point in tile coordinates
 */
export interface SingleCollisionBox {
    /** Left bound relative to anchor */
    x1: number
    /** Top bound relative to anchor */
    y1: number
    /** Right bound relative to anchor */
    x2: number
    /** Bottom bound relative to anchor */
    y2: number
    /** Tile-local anchor X coordinate */
    anchorPointX: number
    /** Tile-local anchor Y coordinate */
    anchorPointY: number
}

/**
 * Result of placing a collision box
 */
export interface PlaceCollisionBoxResult {
    /** Viewport-space collision box [x1, y1, x2, y2], empty if rejected */
    box: number[]
    /** Whether the box is completely offscreen */
    offscreen: boolean
}

/**
 * Key for identifying collision box entries in the grid
 */
export interface CollisionBoxKey {
    bucketInstanceId: number
    featureIndex: number
    collisionGroupID: number
}

/**
 * Point interface for projected coordinates
 */
export interface Point {
    x: number
    y: number
}

/**
 * Transform interface containing viewport dimensions and camera properties
 */
export interface CollisionTransform {
    /** Viewport width in pixels */
    width: number
    /** Viewport height in pixels */
    height: number
    /** Distance from camera to center of the map in pixels */
    cameraToCenterDistance: number
}

/** Padding around viewport for collision detection */
const viewportPadding = 100

/**
 * CollisionIndex manages collision detection for text labels in viewport space.
 *
 * It uses a GridIndex for efficient spatial queries and projects tile coordinates
 * to viewport space using the position matrix for accurate collision detection.
 */
export class CollisionIndex {
    /** Grid for spatial queries */
    grid: GridIndex
    /** Transform containing viewport dimensions */
    transform: CollisionTransform

    /** Right boundary of visible screen area (with padding) */
    screenRightBoundary: number
    /** Bottom boundary of visible screen area (with padding) */
    screenBottomBoundary: number
    /** Right boundary of the collision grid */
    gridRightBoundary: number
    /** Bottom boundary of the collision grid */
    gridBottomBoundary: number

    /**
     * Create a new CollisionIndex
     *
     * @param transform - Transform containing viewport dimensions and camera properties
     * @param grid - Optional pre-existing grid (creates new one if not provided)
     */
    constructor(
        transform: CollisionTransform,
        grid?: GridIndex,
    ) {
        this.transform = transform

        // Create grid with padding on all sides for labels that extend past viewport
        // Cell size of 25 provides good balance between memory and query efficiency
        this.grid = grid ?? new GridIndex(
            transform.width + 2 * viewportPadding,
            transform.height + 2 * viewportPadding,
            60, // Cell size for efficient queries (25px cells)
        )

        // Calculate boundaries
        this.screenRightBoundary = transform.width + viewportPadding
        this.screenBottomBoundary = transform.height + viewportPadding
        this.gridRightBoundary = transform.width + 2 * viewportPadding
        this.gridBottomBoundary = transform.height + 2 * viewportPadding
    }

    /**
     * Attempt to place a collision box.
     *
     * Projects the anchor point to viewport space, applies the collision box offsets,
     * and checks for collisions with existing boxes in the grid.
     *
     * @param collisionBox - The collision box with anchor point and relative bounds
     * @param allowOverlap - If true, skip collision checking
     * @param textPixelRatio - Scale factor for text (currently unused, for future scaling)
     * @param posMatrix - Position matrix for projecting tile coords to clip space
     * @param collisionGroupPredicate - Optional predicate to filter collision candidates
     * @returns Result with viewport-space box (empty if rejected) and offscreen flag
     */
    placeCollisionBox(
        collisionBox: SingleCollisionBox,
        allowOverlap: boolean,
        _textPixelRatio: number,
        posMatrix: mat4,
        collisionGroupPredicate?: (key: CollisionBoxKey) => boolean,
    ): PlaceCollisionBoxResult {
        // Project anchor point to viewport space
        const projectedPoint = this.projectAndGetPerspectiveRatio(
            posMatrix,
            collisionBox.anchorPointX,
            collisionBox.anchorPointY,
        )

        // Calculate viewport-space collision box by adding offsets to projected point
        const tlX = collisionBox.x1 + projectedPoint.point.x
        const tlY = collisionBox.y1 + projectedPoint.point.y
        const brX = collisionBox.x2 + projectedPoint.point.x
        const brY = collisionBox.y2 + projectedPoint.point.y

        // Check if box is inside the grid bounds
        if (!this.isInsideGrid(tlX, tlY, brX, brY)) {
            return {
                box: [],
                offscreen: false,
            }
        }

        // Check for collisions unless overlap is allowed
        if (!allowOverlap && this.grid.hitTest(tlX, tlY, brX, brY, collisionGroupPredicate)) {
            return {
                box: [],
                offscreen: false,
            }
        }

        // Box can be placed - return viewport-space coordinates
        return {
            box: [tlX, tlY, brX, brY],
            offscreen: this.isOffscreen(tlX, tlY, brX, brY),
        }
    }

    /**
     * Insert a collision box into the grid for future collision checks.
     *
     * @param collisionBox - Viewport-space collision box [x1, y1, x2, y2]
     * @param bucketInstanceId - ID of the bucket instance
     * @param featureIndex - Index of the feature within the bucket
     * @param collisionGroupID - ID of the collision group
     */
    insertCollisionBox(
        collisionBox: number[],
        bucketInstanceId: number,
        featureIndex: number,
        collisionGroupID: number,
    ): void {
        const key: CollisionBoxKey = { bucketInstanceId, featureIndex, collisionGroupID }
        this.grid.insert(key, collisionBox[0], collisionBox[1], collisionBox[2], collisionBox[3])
    }

    /**
     * Project a tile coordinate to viewport space and calculate perspective ratio.
     *
     * The perspective ratio is used to scale collision boxes based on their distance
     * from the camera - boxes further away appear smaller and should have smaller
     * collision bounds.
     *
     * @param posMatrix - Position matrix for the tile
     * @param x - Tile-local X coordinate
     * @param y - Tile-local Y coordinate
     * @returns Projected point in viewport space and perspective ratio
     */
    projectAndGetPerspectiveRatio(
        posMatrix: mat4,
        x: number,
        y: number,
    ): { point: Point; perspectiveRatio: number } {
        // Transform tile coordinate to clip space using optimized 2D transform
        const p: vec4 = [x, y, 0, 1]
        xyTransformMat4(p, p, posMatrix)

        // Convert from clip space to viewport space with padding
        // Clip space: [-1, 1] -> Viewport: [0, width/height] + padding
        const point: Point = {
            x: (((p[0] / p[3] + 1) / 2) * this.transform.width) + viewportPadding,
            y: (((-p[1] / p[3] + 1) / 2) * this.transform.height) + viewportPadding,
        }

        // Calculate perspective ratio for distance-based scaling
        // See perspective ratio comment in symbol_sdf.vertex
        // We're doing collision detection in viewport space so we need
        // to scale down boxes in the distance
        const perspectiveRatio = 0.5 + 0.5 * (this.transform.cameraToCenterDistance / p[3])

        return {
            point,
            perspectiveRatio,
        }
    }

    /**
     * Check if a box is completely offscreen (outside visible viewport with padding).
     *
     * @param x1 - Left bound
     * @param y1 - Top bound
     * @param x2 - Right bound
     * @param y2 - Bottom bound
     * @returns true if the box is completely offscreen
     */
    isOffscreen(x1: number, y1: number, x2: number, y2: number): boolean {
        return (
            x2 < viewportPadding ||
            x1 >= this.screenRightBoundary ||
            y2 < viewportPadding ||
            y1 > this.screenBottomBoundary
        )
    }

    /**
     * Check if a box is at least partially inside the collision grid bounds.
     *
     * @param x1 - Left bound
     * @param y1 - Top bound
     * @param x2 - Right bound
     * @param y2 - Bottom bound
     * @returns true if the box is at least partially inside the grid
     */
    isInsideGrid(x1: number, y1: number, x2: number, y2: number): boolean {
        return (
            x2 >= 0 &&
            x1 < this.gridRightBoundary &&
            y2 >= 0 &&
            y1 < this.gridBottomBoundary
        )
    }

    /**
     * Reset the collision index by clearing the grid.
     * Call this at the start of each frame before placing new labels.
     */
    reset(): void {
        this.grid.clear()
    }
}

export default CollisionIndex
