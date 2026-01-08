import * as THREE from 'three'
import { ThreeMapLayer } from './ThreeMapLayer'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const addGLTF = (
    threeLayer: ThreeMapLayer,
    id: string,
    url: string,
    lnglat: [number, number],
    altitude: number = 0,
): Promise<THREE.Object3D> => {
    return new Promise((resolve) => {
        let loader = new GLTFLoader()

        loader.load(url, (gltf) => {
            const posRelativeToAnchor = threeLayer.projectToScene(lnglat, altitude)
            const model = gltf.scene
            console.log(dumpObject(model).join('\n'))
            model.position.copy(posRelativeToAnchor)
            model.scale.set(10, 100, 10)

            threeLayer.addToScene(id, model)
            resolve(model)
        })
    })
}

function dumpObject(obj, lines: string[] = [], isLast = true, prefix = '') {
    const localPrefix = isLast ? '└─' : '├─'
    lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'}[${obj.type}]`)
    const newPrefix = prefix + (isLast ? '  ' : '│ ')
    const lastNdx = obj.children.length - 1
    obj.children.forEach((child, ndx) => {
        const isLast = ndx === lastNdx
        dumpObject(child, lines, isLast, newPrefix)
    })
    return lines
}
export { addGLTF }
