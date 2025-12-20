// @ts-ignore
import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';

// 1. 坐标配置 (保持不变)
const modelOrigin = [-122.5122, 47.522] as [number, number];
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, 0, 0];

const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
    modelOrigin,
    modelAltitude
);

// 2. 变换参数配置 (保持不变，这决定了 Cube 出现在哪里以及多大)
const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    /* 
     * 这里的 scale 是核心。
     * 它将 Mercator 坐标单位转换为了“米”。
     * 所以我们在 Three.js 里创建几何体时，直接填“米”为单位的数值即可。
     */
    scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};

const cubeLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        // 3. 灯光 (保持不变，以便观察立方体的阴影面)
        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(0, -70, 100).normalize();
        this.scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff);
        directionalLight2.position.set(0, 70, 100).normalize();
        this.scene.add(directionalLight2);

        // 添加环境光，防止背光面全黑
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // 创建一个 100米 x 100米 x 100米 的几何体
        const geometry = new THREE.BoxGeometry(100, 100, 100);

        // 使用红色材质
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });

        const cube = new THREE.Mesh(geometry, material);

        // 可选：将立方体向上移动 50米，使其“坐”在地图表面，而不是中心点陷在地下
        // (因为 BoxGeometry 的原点在几何体中心)
        cube.position.y = 50;

        this.scene.add(cube);

        this.map = map;

        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });

        this.renderer.autoClear = false;
    },
    render: function (gl, matrix) {
        const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
        );

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
            .makeTranslation(
                modelTransform.translateX,
                modelTransform.translateY,
                modelTransform.translateZ
            )
            .scale(
                new THREE.Vector3(
                    modelTransform.scale,
                    -modelTransform.scale, // 注意这里有一个负号，用于翻转 Y 轴以适配 WebGL
                    modelTransform.scale
                )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
    }
};

export default cubeLayer;