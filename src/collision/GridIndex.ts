/**
 * GridIndex - Spatial data structure for efficient collision detection
 *
 * GridIndex is a data structure for testing the intersection of
 * circles and rectangles in a 2d plane.
 * It is optimized for rapid insertion and querying.
 * GridIndex splits the plane into a set of "cells" and keeps track
 * of which geometries intersect with each cell. At query time,
 * full geometry comparisons are only done for items that share
 * at least one cell. As long as the geometries are relatively
 * uniformly distributed across the plane, this greatly reduces
 * the number of comparisons necessary.
 *
 * @requirements 3.3 - Use grid-based spatial hashing for efficient queries
 */

/**
 * Result from a grid query containing the key and bounding box
 */
export interface HitResult {
	key: any
	x1: number
	y1: number
	x2: number
	y2: number
}

/**
 * Legacy bounding box interface for backward compatibility
 */
export interface LabelBBox {
	id: string
	minX: number
	minY: number
	maxX: number
	maxY: number
}

/**
 * GridIndex implements cell-based spatial hashing for collision detection.
 * Supports both rectangular boxes and circles.
 */
export class GridIndex {
	boxKeys: any[]
	boxCells: number[][]
	bboxes: number[]
	circleKeys: any[]
	circleCells: number[][]
	circles: number[]

	xCellCount: number
	yCellCount: number
	width: number
	height: number
	xScale: number
	yScale: number
	boxUid: number
	circleUid: number

	constructor(width: number, height: number, cellSize: number) {
		const boxCells: number[][] = (this.boxCells = [])
		const circleCells: number[][] = (this.circleCells = [])

		// More cells -> fewer geometries to check per cell, but items tend
		// to be split across more cells.
		// Sweet spot allows most small items to fit in one cell
		this.xCellCount = Math.ceil(width / cellSize)
		this.yCellCount = Math.ceil(height / cellSize)

		for (let i = 0; i < this.xCellCount * this.yCellCount; i++) {
			boxCells.push([])
			circleCells.push([])
		}
		this.circleKeys = []
		this.boxKeys = []
		this.bboxes = []
		this.circles = []

		this.width = width
		this.height = height
		this.xScale = this.xCellCount / width
		this.yScale = this.yCellCount / height
		this.boxUid = 0
		this.circleUid = 0
	}

	/**
	 * Get the total number of keys (boxes + circles) in the grid
	 */
	keysLength(): number {
		return this.boxKeys.length + this.circleKeys.length
	}

	/**
	 * Insert a rectangular bounding box into the grid.
	 *
	 * @param key - Unique identifier for the box
	 * @param x1 - Left bound
	 * @param y1 - Top bound
	 * @param x2 - Right bound
	 * @param y2 - Bottom bound
	 */
	insert(key: any, x1: number, y1: number, x2: number, y2: number): void {
		this._forEachCell(x1, y1, x2, y2, this._insertBoxCell, this.boxUid++)
		this.boxKeys.push(key)
		this.bboxes.push(x1)
		this.bboxes.push(y1)
		this.bboxes.push(x2)
		this.bboxes.push(y2)
	}

	/**
	 * Insert a circle into the grid.
	 * The circle is inserted into all cells in its circumscribing square.
	 *
	 * @param key - Unique identifier for the circle
	 * @param x - Center X coordinate
	 * @param y - Center Y coordinate
	 * @param radius - Circle radius
	 */
	insertCircle(key: any, x: number, y: number, radius: number): void {
		// Insert circle into grid for all cells in the circumscribing square
		// It's more than necessary (by a factor of 4/PI), but fast to insert
		this._forEachCell(x - radius, y - radius, x + radius, y + radius, this._insertCircleCell, this.circleUid++)
		this.circleKeys.push(key)
		this.circles.push(x)
		this.circles.push(y)
		this.circles.push(radius)
	}

	/**
	 * Internal method to insert a box into a specific cell
	 */
	_insertBoxCell(_x1: number, _y1: number, _x2: number, _y2: number, cellIndex: number, uid: number): void {
		this.boxCells[cellIndex].push(uid)
	}

	/**
	 * Internal method to insert a circle into a specific cell
	 */
	_insertCircleCell(_x1: number, _y1: number, _x2: number, _y2: number, cellIndex: number, uid: number): void {
		this.circleCells[cellIndex].push(uid)
	}

	/**
	 * Internal query implementation supporting both hit testing and full results
	 */
	_query(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		hitTest: boolean,
		predicate?: (key: any) => boolean,
	): boolean | HitResult[] {
		if (x2 < 0 || x1 > this.width || y2 < 0 || y1 > this.height) {
			return hitTest ? false : []
		}
		const result: HitResult[] = []
		if (x1 <= 0 && y1 <= 0 && this.width <= x2 && this.height <= y2) {
			if (hitTest) {
				return this.boxKeys.length > 0 || this.circleKeys.length > 0
			}
			for (let boxUid = 0; boxUid < this.boxKeys.length; boxUid++) {
				const item: HitResult = {
					key: this.boxKeys[boxUid],
					x1: this.bboxes[boxUid * 4],
					y1: this.bboxes[boxUid * 4 + 1],
					x2: this.bboxes[boxUid * 4 + 2],
					y2: this.bboxes[boxUid * 4 + 3],
				}
				if (!predicate || predicate(item.key)) {
					result.push(item)
				}
			}
			for (let circleUid = 0; circleUid < this.circleKeys.length; circleUid++) {
				const x = this.circles[circleUid * 3]
				const y = this.circles[circleUid * 3 + 1]
				const radius = this.circles[circleUid * 3 + 2]
				const item: HitResult = {
					key: this.circleKeys[circleUid],
					x1: x - radius,
					y1: y - radius,
					x2: x + radius,
					y2: y + radius,
				}
				if (!predicate || predicate(item.key)) {
					result.push(item)
				}
			}
			return result
		} else {
			const queryArgs = {
				hitTest,
				seenUids: { box: {} as Record<number, boolean>, circle: {} as Record<number, boolean> },
			}
			this._forEachCell(x1, y1, x2, y2, this._queryCell, result, queryArgs, predicate)
			return hitTest ? result.length > 0 : result
		}
	}

	/**
	 * Internal circle query implementation
	 */
	_queryCircle(
		x: number,
		y: number,
		radius: number,
		hitTest: boolean,
		predicate?: (key: any) => boolean,
	): boolean | HitResult[] {
		const x1 = x - radius
		const x2 = x + radius
		const y1 = y - radius
		const y2 = y + radius
		if (x2 < 0 || x1 > this.width || y2 < 0 || y1 > this.height) {
			return hitTest ? false : []
		}

		const result: HitResult[] = []
		const queryArgs = {
			hitTest,
			circle: { x, y, radius },
			seenUids: { box: {} as Record<number, boolean>, circle: {} as Record<number, boolean> },
		}
		this._forEachCell(x1, y1, x2, y2, this._queryCellCircle, result, queryArgs, predicate)
		return hitTest ? result.length > 0 : result
	}

	/**
	 * Query for all items that intersect with the given bounding box.
	 *
	 * @param x1 - Left bound
	 * @param y1 - Top bound
	 * @param x2 - Right bound
	 * @param y2 - Bottom bound
	 * @param predicate - Optional filter function
	 * @returns Array of HitResult objects
	 */
	query(x1: number, y1: number, x2: number, y2: number, predicate?: (key: any) => boolean): HitResult[] {
		return this._query(x1, y1, x2, y2, false, predicate) as HitResult[]
	}

	/**
	 * Test if any items intersect with the given bounding box.
	 *
	 * @param x1 - Left bound
	 * @param y1 - Top bound
	 * @param x2 - Right bound
	 * @param y2 - Bottom bound
	 * @param predicate - Optional filter function
	 * @returns true if any intersection exists
	 */
	hitTest(x1: number, y1: number, x2: number, y2: number, predicate?: (key: any) => boolean): boolean {
		return this._query(x1, y1, x2, y2, true, predicate) as boolean
	}

	/**
	 * Test if any items intersect with the given circle.
	 *
	 * @param x - Center X coordinate
	 * @param y - Center Y coordinate
	 * @param radius - Circle radius
	 * @param predicate - Optional filter function
	 * @returns true if any intersection exists
	 */
	hitTestCircle(x: number, y: number, radius: number, predicate?: (key: any) => boolean): boolean {
		return this._queryCircle(x, y, radius, true, predicate) as boolean
	}

	/**
	 * Internal method to query a specific cell for box intersections
	 */
	_queryCell(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		cellIndex: number,
		result: HitResult[],
		queryArgs: { hitTest: boolean; seenUids: { box: Record<number, boolean>; circle: Record<number, boolean> } },
		predicate?: (key: any) => boolean,
	): boolean {
		const seenUids = queryArgs.seenUids
		const boxCell = this.boxCells[cellIndex]
		if (boxCell !== null) {
			const bboxes = this.bboxes
			for (const boxUid of boxCell) {
				if (!seenUids.box[boxUid]) {
					seenUids.box[boxUid] = true
					const offset = boxUid * 4
					if (
						x1 <= bboxes[offset + 2] &&
						y1 <= bboxes[offset + 3] &&
						x2 >= bboxes[offset + 0] &&
						y2 >= bboxes[offset + 1] &&
						(!predicate || predicate(this.boxKeys[boxUid]))
					) {
						if (queryArgs.hitTest) {
							result.push({
								key: this.boxKeys[boxUid],
								x1: bboxes[offset],
								y1: bboxes[offset + 1],
								x2: bboxes[offset + 2],
								y2: bboxes[offset + 3],
							})
							return true
						} else {
							result.push({
								key: this.boxKeys[boxUid],
								x1: bboxes[offset],
								y1: bboxes[offset + 1],
								x2: bboxes[offset + 2],
								y2: bboxes[offset + 3],
							})
						}
					}
				}
			}
		}
		const circleCell = this.circleCells[cellIndex]
		if (circleCell !== null) {
			const circles = this.circles
			for (const circleUid of circleCell) {
				if (!seenUids.circle[circleUid]) {
					seenUids.circle[circleUid] = true
					const offset = circleUid * 3
					if (
						this._circleAndRectCollide(
							circles[offset],
							circles[offset + 1],
							circles[offset + 2],
							x1,
							y1,
							x2,
							y2,
						) &&
						(!predicate || predicate(this.circleKeys[circleUid]))
					) {
						const cx = circles[offset]
						const cy = circles[offset + 1]
						const radius = circles[offset + 2]
						if (queryArgs.hitTest) {
							result.push({
								key: this.circleKeys[circleUid],
								x1: cx - radius,
								y1: cy - radius,
								x2: cx + radius,
								y2: cy + radius,
							})
							return true
						} else {
							result.push({
								key: this.circleKeys[circleUid],
								x1: cx - radius,
								y1: cy - radius,
								x2: cx + radius,
								y2: cy + radius,
							})
						}
					}
				}
			}
		}
		return false
	}

	/**
	 * Internal method to query a specific cell for circle intersections
	 */
	_queryCellCircle(
		_x1: number,
		_y1: number,
		_x2: number,
		_y2: number,
		cellIndex: number,
		result: HitResult[],
		queryArgs: {
			hitTest: boolean
			circle: { x: number; y: number; radius: number }
			seenUids: { box: Record<number, boolean>; circle: Record<number, boolean> }
		},
		predicate?: (key: any) => boolean,
	): boolean {
		const circle = queryArgs.circle
		const seenUids = queryArgs.seenUids
		const boxCell = this.boxCells[cellIndex]
		if (boxCell !== null) {
			const bboxes = this.bboxes
			for (const boxUid of boxCell) {
				if (!seenUids.box[boxUid]) {
					seenUids.box[boxUid] = true
					const offset = boxUid * 4
					if (
						this._circleAndRectCollide(
							circle.x,
							circle.y,
							circle.radius,
							bboxes[offset + 0],
							bboxes[offset + 1],
							bboxes[offset + 2],
							bboxes[offset + 3],
						) &&
						(!predicate || predicate(this.boxKeys[boxUid]))
					) {
						result.push({
							key: this.boxKeys[boxUid],
							x1: bboxes[offset],
							y1: bboxes[offset + 1],
							x2: bboxes[offset + 2],
							y2: bboxes[offset + 3],
						})
						return true
					}
				}
			}
		}

		const circleCell = this.circleCells[cellIndex]
		if (circleCell !== null) {
			const circles = this.circles
			for (const circleUid of circleCell) {
				if (!seenUids.circle[circleUid]) {
					seenUids.circle[circleUid] = true
					const offset = circleUid * 3
					if (
						this._circlesCollide(
							circles[offset],
							circles[offset + 1],
							circles[offset + 2],
							circle.x,
							circle.y,
							circle.radius,
						) &&
						(!predicate || predicate(this.circleKeys[circleUid]))
					) {
						const cx = circles[offset]
						const cy = circles[offset + 1]
						const radius = circles[offset + 2]
						result.push({
							key: this.circleKeys[circleUid],
							x1: cx - radius,
							y1: cy - radius,
							x2: cx + radius,
							y2: cy + radius,
						})
						return true
					}
				}
			}
		}
		return false
	}

	/**
	 * Iterate over all cells that intersect with the given bounding box.
	 *
	 * @param x1 - Left bound
	 * @param y1 - Top bound
	 * @param x2 - Right bound
	 * @param y2 - Bottom bound
	 * @param fn - Callback function to call for each cell
	 * @param arg1 - First argument to pass to callback
	 * @param arg2 - Second argument to pass to callback
	 * @param predicate - Optional predicate to pass to callback
	 */
	_forEachCell(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		fn: (
			x1: number,
			y1: number,
			x2: number,
			y2: number,
			cellIndex: number,
			arg1: any,
			arg2?: any,
			predicate?: (key: any) => boolean,
		) => boolean | void,
		arg1: any,
		arg2?: any,
		predicate?: (key: unknown) => boolean,
	): void {
		const cx1 = this._convertToXCellCoord(x1)
		const cy1 = this._convertToYCellCoord(y1)
		const cx2 = this._convertToXCellCoord(x2)
		const cy2 = this._convertToYCellCoord(y2)

		for (let x = cx1; x <= cx2; x++) {
			for (let y = cy1; y <= cy2; y++) {
				const cellIndex = this.xCellCount * y + x
				if (fn.call(this, x1, y1, x2, y2, cellIndex, arg1, arg2, predicate)) return
			}
		}
	}

	/**
	 * Convert an X coordinate to a cell X index
	 */
	_convertToXCellCoord(x: number): number {
		return Math.max(0, Math.min(this.xCellCount - 1, Math.floor(x * this.xScale)))
	}

	/**
	 * Convert a Y coordinate to a cell Y index
	 */
	_convertToYCellCoord(y: number): number {
		return Math.max(0, Math.min(this.yCellCount - 1, Math.floor(y * this.yScale)))
	}

	/**
	 * Test if two circles collide.
	 *
	 * @param x1 - First circle center X
	 * @param y1 - First circle center Y
	 * @param r1 - First circle radius
	 * @param x2 - Second circle center X
	 * @param y2 - Second circle center Y
	 * @param r2 - Second circle radius
	 * @returns true if circles overlap
	 */
	_circlesCollide(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
		const dx = x2 - x1
		const dy = y2 - y1
		const bothRadii = r1 + r2
		return bothRadii * bothRadii > dx * dx + dy * dy
	}

	/**
	 * Test if a circle and rectangle collide.
	 *
	 * @param circleX - Circle center X
	 * @param circleY - Circle center Y
	 * @param radius - Circle radius
	 * @param x1 - Rectangle left bound
	 * @param y1 - Rectangle top bound
	 * @param x2 - Rectangle right bound
	 * @param y2 - Rectangle bottom bound
	 * @returns true if circle and rectangle overlap
	 */
	_circleAndRectCollide(
		circleX: number,
		circleY: number,
		radius: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
	): boolean {
		const halfRectWidth = (x2 - x1) / 2
		const distX = Math.abs(circleX - (x1 + halfRectWidth))
		if (distX > halfRectWidth + radius) {
			return false
		}

		const halfRectHeight = (y2 - y1) / 2
		const distY = Math.abs(circleY - (y1 + halfRectHeight))
		if (distY > halfRectHeight + radius) {
			return false
		}

		if (distX <= halfRectWidth || distY <= halfRectHeight) {
			return true
		}

		const dx = distX - halfRectWidth
		const dy = distY - halfRectHeight
		return dx * dx + dy * dy <= radius * radius
	}

	/**
	 * Clear all items from the grid.
	 * Resets the grid to its initial empty state.
	 */
	clear(): void {
		// Reset all cell arrays
		for (let i = 0; i < this.boxCells.length; i++) {
			this.boxCells[i] = []
			this.circleCells[i] = []
		}
		// Reset storage arrays
		this.boxKeys = []
		this.bboxes = []
		this.circleKeys = []
		this.circles = []
		this.boxUid = 0
		this.circleUid = 0
	}
}

export default GridIndex
