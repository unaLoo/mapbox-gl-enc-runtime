import { ThreeMapLayer } from "./ThreeMapLayer";
import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js';

const initOceanScene = (layer: ThreeMapLayer) => {
    const scene = layer.scene;
    // const renderer = layer.renderer!;

    const waterAnchor = [-122.5, 47.4] as [number, number];
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    const water = new Water(
        waterGeometry,
        {
            textureWidth: 256,
            textureHeight: 256,
            waterNormals: new THREE.TextureLoader().load(
                'http://localhost:8081/texture/WaterNormal1.png', // 确保你有这张图
                function (texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }
            ),
            distortionScale: 3.7,
            fog: scene.fog !== undefined,
            sunDirection: new THREE.Vector3(0, 2, 3).normalize(),
            sunColor: 0xffffff,
            waterColor: 0xffffff,
            alpha: 0.8
        }
    );

    const waterPos = layer.projectToScene(waterAnchor, 0);
    water.position.copy(waterPos);
    water.rotation.x = -Math.PI / 2; // 躺平
    water.material.transparent = true;
    water.renderOrder = 1;

    layer.addToScene('ocean-water', water);

    layer.animatedObjects.push(water);

    const cubeGeo = new THREE.BoxGeometry(50, 50, 50);
    const cubeMat = new THREE.MeshStandardMaterial({
        roughness: 0, // 0 粗糙度 = 镜面反射
        metalness: 1
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);

    const cubePos = waterPos.clone();
    cubePos.y += 0;
    cube.position.copy(cubePos);

    layer.addToScene('reflection-test-cube', cube);
};

export default initOceanScene