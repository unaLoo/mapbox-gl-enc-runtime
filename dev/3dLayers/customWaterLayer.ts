import * as THREE from 'three';
import { ThreeMapLayer } from './ThreeMapLayer';

// ----------------------------------------------------------------------------
// Shader
// ----------------------------------------------------------------------------

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    // Three.js 内置的 uv 属性
    vUv = uv; 
    
    // 计算世界坐标 (Model Matrix 变换后)
    // 这里的 worldPosition 对应你之前的 v_worldPos，但单位变成了米
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    // 标准 MVP 变换
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform float uTime;
uniform sampler2D tNormalMap;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uWaterColor;
uniform vec3 uCameraPosition; // Three.js 也可以自动传，但手动传更稳
uniform float uDistortionScale;
uniform float uTextureTiling;

varying vec2 vUv;
varying vec3 vWorldPosition;

// --- 伪天空盒函数 (原样保留) ---
vec3 getSkyColor(vec3 rayDir) {
    vec3 skyBlue = vec3(0.4, 0.6, 0.9);
    vec3 horizon = vec3(0.7, 0.8, 0.9);
    float t = max(rayDir.y, 0.0);
    return mix(horizon, skyBlue, t * 0.8) * 0.8;
}

void main() {
    // 1. UV 计算
    // 使用世界坐标来生成 UV，这样水面再大纹理也不会拉伸，而是平铺
    // 注意：vWorldPosition.xz 代表水平面 (假设 Y up)
    vec2 uv = vWorldPosition.xz * uTextureTiling;

    // 2. 法线采样 (原算法)
    float t = uTime * 0.03;
    vec2 uv0 = uv * 0.5 + vec2(t, t);
    vec2 uv1 = uv * 1.0 + vec2(-t, t * 0.5);

    vec3 normal0 = texture2D(tNormalMap, uv0).rgb;
    vec3 normal1 = texture2D(tNormalMap, uv1).rgb;

    vec3 normal = normalize((normal0 + normal1) * 2.0 - 2.0);
    normal = normalize(vec3(normal.x * uDistortionScale, normal.y * uDistortionScale, normal.z));

    // *关键修正*：你的法线贴图通常是切线空间的 (Tangent Space)。
    // 在简单的平面上，假设法线向上 (0,1,0)，我们需要把扰动应用到世界空间。
    // 简单起见，我们交换一下轴以匹配 Y-up 坐标系
    // 原来的 normal.z 是向上的，现在对应世界 Y
    vec3 worldNormal = normalize(vec3(normal.x, normal.z, normal.y));

    // 3. 光照计算
    vec3 viewVector = normalize(uCameraPosition - vWorldPosition);

    // a. 菲涅尔
    float refractiveFactor = dot(viewVector, worldNormal);
    refractiveFactor = clamp(refractiveFactor, 0.0, 1.0);
    float fresnel = mix(0.1, 1.0, pow(1.0 - refractiveFactor, 3.0)); // 调低指数让反光更明显

    // b. 反射 (伪天空)
    vec3 reflectionVector = reflect(-viewVector, worldNormal);
    vec3 reflectionColor = getSkyColor(reflectionVector);

    // c. 基础水色
    vec3 refractionColor = uWaterColor;

    // d. 太阳高光
    vec3 halfVector = normalize(uSunDirection + viewVector);
    float NdotH = max(dot(worldNormal, halfVector), 0.0);
    float specular = pow(NdotH, 100.0);
    vec3 specularColor = uSunColor * specular * 0.6;

    // 4. 合成
    vec3 finalColor = mix(refractionColor, reflectionColor, fresnel);
    finalColor += specularColor;

    // Alpha 控制 (让水透出底图)
    float alpha = mix(0.6, 0.9, fresnel); // 菲涅尔越强越不透明

    gl_FragColor = vec4(finalColor, alpha);
    
    // 必须处理 ToneMapping，否则在开启了 renderer.toneMapping 时颜色会不对
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;

// ----------------------------------------------------------------------------
// func
// ----------------------------------------------------------------------------

export const addCustomWater = (layer: ThreeMapLayer, anchor: [number, number]) => {

    // 1. 加载纹理 (利用 Three.js Loader)
    const loader = new THREE.TextureLoader();
    const normalMap = loader.load('http://localhost:8081/texture/WaterNormal1.png');
    normalMap.wrapS = normalMap.wrapT = THREE.MirroredRepeatWrapping;

    // 2. 创建 Uniforms
    const uniforms = {
        uTime: { value: 0 },
        tNormalMap: { value: normalMap },
        uSunDirection: { value: new THREE.Vector3(0, 1, 1).normalize() }, // 稍微侧向的阳光
        uSunColor: { value: new THREE.Color(0xffffff) },
        uWaterColor: { value: new THREE.Color(0x001e0f) }, // 深青色
        uCameraPosition: { value: new THREE.Vector3() }, // 我们在 render 循环里手动更
        uDistortionScale: { value: 3.7 },
        uTextureTiling: { value: 0.001 } // 根据世界坐标(米)调整，0.05 意味着 20米重复一次
    };

    // 3. 创建材质
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        transparent: true, // 关键：开启透明
        side: THREE.DoubleSide, // 防止背面剔除看不见
        // lights: true // 如果你想在 Shader 里引用 Three.js 的真实灯光数据，设为 true
    });

    // 4. 创建几何体
    const geometry = new THREE.PlaneGeometry(10000, 10000);

    // 5. 创建 Mesh
    const waterMesh = new THREE.Mesh(geometry, material);

    // 6. 定位 (复用之前的 Anchor 逻辑)
    const pos = layer.projectToScene(anchor, 0);
    waterMesh.position.copy(pos);
    waterMesh.rotation.x = -Math.PI / 2; // 躺平

    // 7. 添加到场景
    layer.addToScene('custom-shader-water', waterMesh);

    // 8. 注册动画与更新逻辑
    // 我们给 mesh 挂载一个 tick 函数，或者直接由 layer 管理
    // 这里我们做一个简单的闭包 update
    const update = () => {
        // 更新时间
        material.uniforms.uTime.value += 1.0 / 60.0;

        // 更新相机位置 (供菲涅尔计算)
        // 注意：layer.camera.position 是相对于 Scene Anchor 的局部坐标
        // 这正是我们在 Shader 里用 vWorldPosition 比较所需要的
        material.uniforms.uCameraPosition.value.copy(layer.camera.position);
    };

    // 将 update 函数推入 layer 的动画队列
    layer.animatedObjects.push({
        tick: update // 假设你修改了 Layer 支持这种对象，或者直接 push mesh 并在 layer 里判断
    });

    // *为了兼容你之前的 animatedObjects 逻辑*
    // 如果 layer 只检查 obj.material.uniforms['time']，那上面的 update 可以简化：
    // 只需确保 uniforms 里叫 'time' 而不是 'uTime'，或者修改 Layer 的逻辑。
    // 建议：直接在 Layer 的 render 里调用一个通用的 .tick() 方法
};