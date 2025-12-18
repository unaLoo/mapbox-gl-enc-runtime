import { mat4, vec4 } from 'gl-matrix'

/**
 * The maximum value of a coordinate in the internal tile coordinate system.
 * Coordinates of all source features are normalized to this extent upon load.
 *
 * The value is a consequence of the following:
 * - Vertex buffer stores positions as signed 16 bit integers.
 * - One bit is lost for signedness to support tile buffers.
 * - One bit is lost because the line vertex buffer used to pack 1 bit of other data into the int.
 * - One bit is lost to support features extending past the extent on the right edge of the tile.
 * - This leaves us with 2^13 = 8192
 */
export const EXTENT = 8192

/**
 * Standard tile size in pixels
 */
export const tileSize = 512

/**
 * Transform interface for symbol projection calculations.
 * Contains viewport dimensions and camera angle.
 */
export interface SymbolTransform {
	width: number
	height: number
	angle: number
}

/**
 * Converts a pixel value at the given zoom level to tile units.
 *
 * @param overscaledZ - The overscaled zoom level of the tile
 * @param pixelValue - The pixel value to convert
 * @param z - The canonical zoom level
 * @returns The value in tile units
 */
export function pixelsToTileUnits(overscaledZ: number, pixelValue: number, z: number): number {
	return pixelValue * (EXTENT / (tileSize * Math.pow(2, z - overscaledZ)))
}

/**
 * Returns a matrix for converting from tile coordinates to label placement space.
 *
 * When pitchWithMap is true, labels are placed in tile space and scaled.
 * When pitchWithMap is false, labels are placed in screen space.
 *
 * @param posMatrix - The position matrix for the tile
 * @param pitchWithMap - Whether labels should pitch with the map
 * @param rotateWithMap - Whether labels should rotate with the map
 * @param transform - The map transform containing viewport dimensions and angle
 * @param pixelsToTileUnitsScale - The scale factor from pixels to tile units
 * @returns The label plane matrix
 */
export function getLabelPlaneMatrix(
	posMatrix: mat4,
	pitchWithMap: boolean,
	rotateWithMap: boolean,
	transform: SymbolTransform,
	pixelsToTileUnitsScale: number,
): mat4 {
	const m = mat4.identity(new Float32Array(16) as unknown as mat4)

	if (pitchWithMap) {
		mat4.identity(m)
		mat4.scale(m, m, [1 / pixelsToTileUnitsScale, 1 / pixelsToTileUnitsScale, 1])
		if (!rotateWithMap) {
			mat4.rotateZ(m, m, transform.angle)
		}
	} else {
		mat4.scale(m, m, [transform.width / 2, -transform.height / 2, 1])
		mat4.translate(m, m, [1, -1, 0])
		mat4.multiply(m, m, posMatrix)
	}

	return m
}

/**
 * Returns a matrix for converting from the correct label coordinate space to GL clip coords.
 *
 * This is the inverse transformation of getLabelPlaneMatrix, used to transform
 * label positions back to clip space for rendering.
 *
 * @param posMatrix - The position matrix for the tile
 * @param pitchWithMap - Whether labels should pitch with the map
 * @param rotateWithMap - Whether labels should rotate with the map
 * @param transform - The map transform containing viewport dimensions and angle
 * @param pixelsToTileUnitsScale - The scale factor from pixels to tile units
 * @returns The GL coordinate matrix
 */
export function getGlCoordMatrix(
	posMatrix: mat4,
	pitchWithMap: boolean,
	rotateWithMap: boolean,
	transform: SymbolTransform,
	pixelsToTileUnitsScale: number,
): mat4 {
	const m = mat4.identity(new Float32Array(16) as unknown as mat4)

	if (pitchWithMap) {
		mat4.multiply(m, m, posMatrix)
		mat4.scale(m, m, [pixelsToTileUnitsScale, pixelsToTileUnitsScale, 1])
		if (!rotateWithMap) {
			mat4.rotateZ(m, m, -transform.angle)
		}
	} else {
		mat4.scale(m, m, [1, -1, 1])
		mat4.translate(m, m, [-1, -1, 0])
		mat4.scale(m, m, [2 / transform.width, 2 / transform.height, 1])
	}

	return m
}

/**
 * Optimized 2D matrix transformation for line label layout.
 *
 * For line label layout, we're not using z output and our w input is always 1.
 * This custom matrix transformation ignores those components to make projection faster.
 *
 * @param out - The output vector
 * @param a - The input vector (x, y, z, w)
 * @param m - The transformation matrix
 * @returns The transformed output vector
 */
export function xyTransformMat4(out: vec4, a: vec4, m: mat4): vec4 {
	const x = a[0]
	const y = a[1]
	out[0] = m[0] * x + m[4] * y + m[12]
	out[1] = m[1] * x + m[5] * y + m[13]
	out[3] = m[3] * x + m[7] * y + m[15]
	return out
}
