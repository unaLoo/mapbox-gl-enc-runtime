/**
 * Core type definitions for mapbox-gl-enc-runtime
 */

import { OBJLCode } from '@/rules/tables/OBJLTable'
import type { Map, CustomLayerInterface } from 'mapbox-gl'
import { Tile } from '@/tiles/tile'
import { StyledFeature, ParsedStyleDescription, ParsedStyledFeature, InstructonType } from '@/rules/types'
import { AreaRenderInfo } from '@/renderer/types'

/**
 * ENC Feature types
 */
export type ENCFeatureType = 'point' | 'line' | 'area'

/**
 * ENC Feature geometry
 */
export interface ENCFeatureGeometry {
	type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon'
	coordinates: number[] | number[][] | number[][][]
}

/**
 * ENC Feature properties
 */
export interface ENCFeatureProperties {
	[key: string]: any
	// Common S-52 attributes
	OBJL?: OBJLCode // Object class
	OBJNAM?: string // 5 TEXT
	NOBJNM?: string // 6 TEXT
	RCID?: number // 3 INTEGER
	PK_UID?: number // 1 INTEGER
	CHARTID?: number // 2 INTEGER

	DRVAL1?: number // Depth value 1
	DRVAL2?: number // Depth value 2
	CATSPM?: string // Category of special mark
	COLOUR?: string // Color
	COLPAT?: string // Color pattern

	// ... more S-52 attributes
}

type featureType =
	| 'Point'
	| 'LineString'
	| 'Polygon'
	| 'MultiPoint'
	| 'MultiLineString'
	| 'MultiPolygon'
	| 'GeometryCollection'

/**
 * Tile-local geometry (coordinates in 0-extent space)
 * Used for efficient rendering with tile-based coordinate transforms
 */
export interface TileLocalGeometry {
	type: featureType
	coordinates:
	| { x: number; y: number }
	| Array<{ x: number; y: number }>
	| Array<Array<{ x: number; y: number }>>
	| Array<Array<Array<{ x: number; y: number }>>>
	extent: number // Original extent of the tile (usually 4096 or 8192)
}

/**
 * ENC Feature
 */
export interface ENCFeature {
	type: 'Feature'
	geometry: ENCFeatureGeometry
	properties: ENCFeatureProperties
	/**
	 * Tile-local geometry for efficient rendering
	 * Coordinates are in tile-local space (0-extent)
	 * This is used for WebGL rendering with tile-based coordinate transforms
	 */
	tileLocalGeometry?: TileLocalGeometry
}

/**
 * ENC Feature Collection
 */
export interface ENCFeatureCollection {
	type: 'FeatureCollection'
	features: ENCFeature[]
}

/**
 * Mapbox GL instance
 */
export type MapboxMap = Map

/**
 * Custom layer interface extension
 */
export interface ENCCustomLayer extends CustomLayerInterface {
	id: string
	type: 'custom'
	renderingMode?: '2d' | '3d'
}

export type WorkflowEvent = 'tileLoad' | 'featuresStyled' | 'bucketsReady' | 'renderFrame'
export type TileLoadHandler = (data: { tile: Tile; decodedFeatures: ENCFeature[] }) => void
export type FeaturesStyledHandler = (data: { tile: Tile; styledFeatures: ParsedStyledFeature[]; groupedFeatures: globalThis.Map<InstructonType, ParsedStyledFeature[]> }) => void
export type BucketsReadyHandler = (data: { tile: Tile; type: string; renderInfo: AreaRenderInfo }) => void
export type RenderFrameHandler = () => void
export interface WorkflowHandler {
	tileLoad: TileLoadHandler
	featuresStyled: FeaturesStyledHandler
	bucketsReady: BucketsReadyHandler
	renderFrame: RenderFrameHandler
}
