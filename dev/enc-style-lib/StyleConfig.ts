import { ThemeName, ColorTables, ColorTableType } from './ColorTable'

export interface StyleConfig {
    theme: ThemeName
    showLand?: boolean
    showText?: boolean
    basemap?: 'raster' | 'vector'
    // safetyDepth: number
    // displayMode: 'base' | 'standard' | 'all'
}

export const defaultStyleConfig: StyleConfig = {
    theme: 'DAY_BRIGHT',
    showLand: true,
    showText: true,
    basemap: 'vector'
}

// 根据配置获取颜色表
export function getColorTable(config: StyleConfig): ColorTableType {
    return ColorTables[config.theme]
}

// 获取所有可用主题
export function getAvailableThemes(): ThemeName[] {
    return Object.keys(ColorTables) as ThemeName[]
}
