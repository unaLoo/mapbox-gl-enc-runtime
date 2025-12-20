import * as THREE from 'three';
import { ThreeMapLayer } from './ThreeMapLayer';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const addGLTF = (threeLayer: ThreeMapLayer, id: string, url: string, lnglat: [number, number], altitude: number = 0) => {
    const loader = new GLTFLoader()
    loader.load(url, (gltf) => {

        const posRelativeToAnchor = threeLayer.projectToScene(lnglat, altitude);

        const model = gltf.scene
        model.position.copy(posRelativeToAnchor)
        model.scale.set(10, 10, 10)

        threeLayer.addToScene(id, model)
    })
}

export {
    addGLTF
}