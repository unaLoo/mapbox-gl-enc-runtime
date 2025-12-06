/**
 * Color utility functions
 */

/**
 * Convert hex color to RGB array
 */
export function hexToRgb(hex: string): [number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	if (!result) {
		throw new Error(`Invalid hex color: ${hex}`)
	}
	return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

/**
 * Convert RGB array to hex color
 */
export function rgbToHex(rgb: [number, number, number]): string {
	return `#${rgb.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Convert RGB to normalized (0-1) values
 */
export function rgbToNormalized(rgb: [number, number, number]): [number, number, number] {
	return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]
}

/**
 * Convert normalized RGB to 0-255 values
 */
export function normalizedToRgb(normalized: [number, number, number]): [number, number, number] {
	return [Math.round(normalized[0] * 255), Math.round(normalized[1] * 255), Math.round(normalized[2] * 255)]
}

/**
 * Apply opacity to RGB color
 */
export function applyOpacity(rgb: [number, number, number], opacity: number): [number, number, number, number] {
	return [rgb[0], rgb[1], rgb[2], opacity]
}
