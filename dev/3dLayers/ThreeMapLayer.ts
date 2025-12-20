import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';

export class ThreeMapLayer {
    id: string;
    type: 'custom';
    renderingMode: '3d';

    map: mapboxgl.Map | null;
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer | null;
    objects: Map<string, THREE.Object3D>;

    // ！！！ 作为局部世界坐标的中心
    sceneAnchor: mapboxgl.MercatorCoordinate | null = null;
    sceneScale: number = 1; // meter per mercatorUnit

    constructor(id = 'three-scene-layer') {
        this.id = id;
        this.type = 'custom';
        this.renderingMode = '3d';
        this.map = null;
        this.renderer = null;
        this.objects = new Map();

        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();

        const ambientLight = new THREE.AmbientLight(0x404040);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(0, -70, 100).normalize();
        this.scene.add(ambientLight, dirLight);
    }

    onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext) {
        this.map = map;
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.autoClear = false;
    }

    setAnchor(lngLat: [number, number]) {
        this.sceneAnchor = mapboxgl.MercatorCoordinate.fromLngLat(lngLat, 0);
        // 计算该纬度下的米与Mercator单位的换算比例
        this.sceneScale = this.sceneAnchor.meterInMercatorCoordinateUnits();
    }

    /**
     * Core：将经纬度转换为相对于 Anchor 的 Three.js 坐标（单位：米）
     */
    projectToScene(lngLat: [number, number], altitude: number = 0): THREE.Vector3 {
        if (!this.sceneAnchor) {
            throw new Error("Please call setAnchor() first!");
        }

        const target = mapboxgl.MercatorCoordinate.fromLngLat(lngLat, altitude);

        // 计算 Mercator 坐标差值
        const dx = target.x - this.sceneAnchor.x;
        const dy = target.y - this.sceneAnchor.y;
        const dz = target.z - this.sceneAnchor.z;

        // 转换为米（除以 scale）
        // 注意：这里 Y 轴取负，因为 Mercator Y 轴向下，而我们希望 Three.js 里 Y 朝上或者 Z 朝上
        // 为了配合下面的旋转矩阵，我们保持 Three.js 标准：
        // 这里的转换策略取决于 render 中使用的旋转矩阵。
        // 如果使用了官方示例的旋转矩阵（X轴转90度），那么：
        // Mapbox X -> Three X
        // Mapbox Y -> Three -Z (或者 Y，取决于旋转方向)
        // Mapbox Z -> Three Y

        // 简单起见，我们直接算出米，然后让外部去 setPosition，
        // 但为了让官方矩阵生效，我们需要按照 (x, -y, z) 的逻辑（假设旋转了）或者直接用 Mercator 差值。

        // 修正逻辑：
        // 我们在 render 里会把世界缩放为“米”。
        // 所以这里返回的值应该是“米”。
        const xMeter = dx / this.sceneScale;
        const yMeter = dy / this.sceneScale;
        const zMeter = dz / this.sceneScale;

        // 返回 Vector3 (X, Y, Z)。 
        // 在官方矩阵下（RotateX 90），Mapbox的 Z 是高度，对应 Three.js 的 Y。
        // Mapbox 的 Y 是纬度，对应 Three.js 的 -Z。
        return new THREE.Vector3(xMeter, zMeter, -yMeter); // 注意顺序：MapboxZ -> ThreeY, MapboxY -> Three-Z
    }

    render(gl: WebGLRenderingContext, matrix: number[]) {
        if (!this.sceneAnchor) return;

        // --- 核心修复：使用类似 Case A 的矩阵构建方式 ---

        // 1. 旋转矩阵：将 Z-up (Mapbox) 转为 Y-up (Three.js 标准)
        const rotateX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

        // 2. 平移矩阵：将世界移动到 Anchor 的位置
        // 3. 缩放矩阵：将单位从 Mercator 变为 米
        const transform = new THREE.Matrix4()
            .makeTranslation(this.sceneAnchor.x, this.sceneAnchor.y, this.sceneAnchor.z)
            .scale(new THREE.Vector3(this.sceneScale, -this.sceneScale, this.sceneScale)) // Y 翻转适配
            .multiply(rotateX);

        // 4. 组合 Mapbox 视图矩阵
        const m = new THREE.Matrix4().fromArray(matrix);

        // 最终投影矩阵 = MapboxView * AnchorTransform
        // 这意味着 Three.js 的 (0,0,0) 现在就在地球表面的 Anchor 点上
        this.camera.projectionMatrix = m.multiply(transform);

        this.renderer!.resetState();
        this.renderer!.render(this.scene, this.camera);
        this.map!.triggerRepaint();
    }

    addToScene(id: string, object: THREE.Object3D) {
        // ... 保持不变
        this.scene.add(object);
    }
}