import { BaseRenderer } from './BaseRenderer'
import { ShaderManager } from './shader_manager'
import { Tile } from '@/tiles/tile'
import { mat4 } from 'gl-matrix'
import { getEventBus } from '@/utils/eventBus'

interface TextInstance {
	position: [number, number] // x, y
	text: string
	style: {
		fontSize: number
		color: [number, number, number]
		horizontalAlign: number
		verticalAlign: number
		direction: number
		bold: number
	}
}

export class TXRenderer extends BaseRenderer {
	private shaderManager: ShaderManager

	constructor(gl: WebGL2RenderingContext) {
		super('TX', gl)
		this.shaderManager = ShaderManager.getInstance()
		this.shaderManager.initialize(this.gl)
	}

	handleBucketsReady(tile: Tile, renderInfo: { textInstances: TextInstance[]; instanceCount: number }) {
		const tileId = tile.overscaledTileID.toString()

		// Store text instances for this tile
		this.tileRenderInfo.set(tileId, {
			textInstances: renderInfo.textInstances,
			instanceCount: renderInfo.instanceCount,
			tilePosMatrix: tile.tilePosMatrix(),
		})

		// TODO: Create text geometry and buffers here
		// For now, just trigger render frame
		const eventBus = getEventBus()
		eventBus?.trigger('renderFrame')
	}

	renderTile(
		tile: Tile,
		options: {
			sharingVPMatrix: mat4
			viewport: { width: number; height: number }
			tilePosMatrix: mat4
		},
	): void {
		const tileId = tile.overscaledTileID.toString()
		const renderInfo = this.tileRenderInfo.get(tileId)
		if (!renderInfo) return

		// TODO: Implement text rendering
		// this.renderText(renderInfo, options)
	}

	private renderText(
		renderInfo: any,
		options: { sharingVPMatrix: mat4; viewport: { width: number; height: number }; tilePosMatrix: mat4 },
	) {
		console.log('render tile TX')

		// TODO: Implement text rendering logic
		// This would involve:
		// 1. Text atlas management
		// 2. Glyph rendering
		// 3. Positioning and styling
	}
}
