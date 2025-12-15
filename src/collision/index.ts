/**
 * Collision detection module for text label placement
 */

export { GridIndex, type HitResult, type LabelBBox as GridLabelBBox } from './GridIndex'
export { CollisionDetector, type LabelBBox } from './CollisionDetector'
export {
    CollisionIndex,
    type SingleCollisionBox,
    type PlaceCollisionBoxResult,
    type CollisionBoxKey,
    type CollisionTransform,
    type Point,
} from './CollisionIndex'
