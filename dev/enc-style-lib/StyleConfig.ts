import { ThemeName, ColorTables, ColorTableType } from './ColorTable'

export interface StyleConfig {
    theme: ThemeName
    // 未来可扩展的配置项
    // safetyDepth: number
    // displayMode: 'base' | 'standard' | 'all'
    // showSoundings: boolean
    // showLights: boolean
}

export const defaultStyleConfig: StyleConfig = {
    theme: 'DAY_BRIGHT',
}

// 根据配置获取颜色表
export function getColorTable(config: StyleConfig): ColorTableType {
    return ColorTables[config.theme]
}

// 获取所有可用主题
export function getAvailableThemes(): ThemeName[] {
    return Object.keys(ColorTables) as ThemeName[]
}
