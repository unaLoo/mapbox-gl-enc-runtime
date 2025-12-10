import { AreaSimpleFillDescription, StyleDescription } from "../types"
import { Theme } from "./ColorTable"
import { OBJLAcronym } from "./OBJLTable"
import { getColor } from "./ColorTable"

/**
 * Table for Basic S52 Style
 */
const StyleTable = {
    "LNDARE": [
        {
            "type": "area.simplefill",
            "style": {
                "themeColor": "LANDA",
                "color": [1, 1, 1],
            }
        } as AreaSimpleFillDescription
    ],
}

function getStyleList(acronym: OBJLAcronym) {

    const baseStyleList = StyleTable[acronym as keyof typeof StyleTable] as StyleDescription[]
    return baseStyleList

}


function updateStyleTable(theme: Theme) {
    // 保留原始 themeColor 作为索引，在颜色更新时更新 color 字段

    for (const acronym in StyleTable) {
        const styleList = StyleTable[acronym as keyof typeof StyleTable] as StyleDescription[]
        styleList.forEach((styleItem) => {
            switch (styleItem.type) {
                case "area.simplefill":
                    styleItem.style.color = getColor(theme, styleItem.style.themeColor)
                    break
                default:
                    break
            }
        })
    }
}

updateStyleTable('DAY_BRIGHT')
console.log('init color theme as Day_Bright')

export {
    getStyleList,
    updateStyleTable
}