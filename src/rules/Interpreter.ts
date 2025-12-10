// Input : context , feature 
// Output: styledFeatures

import { ENCFeature } from "@/types";

import { getAcronymByCode } from "./tables/OBJLTable";
import { StyledFeature, FeatureStylingContext } from "./types";
import { getStyleList, updateStyleTable } from "./tables/StyleTable";


export function prepare(context: FeatureStylingContext) {
    updateStyleTable(context.theme)
}

export function interpret(context: FeatureStylingContext, feature: ENCFeature): StyledFeature[] {

    const objl = feature.properties.OBJL
    if (objl === undefined) {
        throw new Error(`OBJL ${objl} is undefined`)
    }
    const acronym = getAcronymByCode(objl)
    const styleList = getStyleList(acronym)

    const res = styleList.map(style => {
        return {
            feature: feature,
            style: style
        }
    })

    return res
}