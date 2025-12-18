/**
 * AlphaImage - Single-channel image for storing SDF glyph data
 * Based on Mapbox's AlphaImage implementation
 */

export interface Size {
	width: number
	height: number
}

interface Point {
	x: number
	y: number
}

/**
 * Helper function to create an image with the specified size and channels
 */
function createImage<T extends { width: number; height: number; data: Uint8Array | Uint8ClampedArray }>(
	image: T,
	{ width, height }: Size,
	channels: number,
	data?: Uint8Array | Uint8ClampedArray,
): T {
	if (!data) {
		data = new Uint8Array(width * height * channels)
	} else if (data.length !== width * height * channels) {
		throw new RangeError('mismatched image size')
	}
	image.width = width
	image.height = height
	image.data = data
	return image
}

/**
 * Helper function to resize an image, preserving existing data where possible
 */
function resizeImage<T extends { width: number; height: number; data: Uint8Array | Uint8ClampedArray }>(
	image: T,
	{ width, height }: Size,
	channels: number,
): void {
	if (width === image.width && height === image.height) {
		return
	}

	const newImage = createImage({} as T, { width, height }, channels)

	copyImage(
		image,
		newImage,
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{
			width: Math.min(image.width, width),
			height: Math.min(image.height, height),
		},
		channels,
	)

	image.width = width
	image.height = height
	image.data = newImage.data
}

/**
 * Helper function to copy a region from one image to another
 */
function copyImage<T extends { width: number; height: number; data: Uint8Array | Uint8ClampedArray }>(
	srcImg: T,
	dstImg: T,
	srcPt: Point,
	dstPt: Point,
	size: Size,
	channels: number,
): T {
	if (size.width === 0 || size.height === 0) {
		return dstImg
	}

	if (
		size.width > srcImg.width ||
		size.height > srcImg.height ||
		srcPt.x > srcImg.width - size.width ||
		srcPt.y > srcImg.height - size.height
	) {
		throw new RangeError('out of range source coordinates for image copy')
	}

	if (
		size.width > dstImg.width ||
		size.height > dstImg.height ||
		dstPt.x > dstImg.width - size.width ||
		dstPt.y > dstImg.height - size.height
	) {
		throw new RangeError('out of range destination coordinates for image copy')
	}

	const srcData = srcImg.data
	const dstData = dstImg.data

	for (let y = 0; y < size.height; y++) {
		const srcOffset = ((srcPt.y + y) * srcImg.width + srcPt.x) * channels
		const dstOffset = ((dstPt.y + y) * dstImg.width + dstPt.x) * channels
		for (let i = 0; i < size.width * channels; i++) {
			dstData[dstOffset + i] = srcData[srcOffset + i]
		}
	}

	return dstImg
}

/**
 * Single-channel (alpha) image class for SDF glyph storage
 * Used by GlyphAtlas for packing glyph bitmaps
 */
export class AlphaImage {
	width: number
	height: number
	data: Uint8Array | Uint8ClampedArray

	/**
	 * Create a new AlphaImage
	 * @param size - Width and height of the image
	 * @param data - Optional initial data (must match size)
	 */
	constructor(size: Size, data?: Uint8Array | Uint8ClampedArray) {
		this.width = 0
		this.height = 0
		this.data = new Uint8Array(0)
		createImage(this, size, 1, data)
	}

	/**
	 * Resize the image, preserving existing data where possible
	 * @param size - New width and height
	 */
	resize(size: Size): void {
		resizeImage(this, size, 1)
	}

	/**
	 * Create a deep copy of this image
	 * @returns New AlphaImage with copied data
	 */
	clone(): AlphaImage {
		return new AlphaImage({ width: this.width, height: this.height }, new Uint8Array(this.data))
	}

	/**
	 * Copy a region from one AlphaImage to another
	 * @param srcImg - Source image
	 * @param dstImg - Destination image
	 * @param srcPt - Source position (top-left corner)
	 * @param dstPt - Destination position (top-left corner)
	 * @param size - Size of region to copy
	 */
	static copy(srcImg: AlphaImage, dstImg: AlphaImage, srcPt: Point, dstPt: Point, size: Size): void {
		copyImage(srcImg, dstImg, srcPt, dstPt, size, 1)
	}
}
