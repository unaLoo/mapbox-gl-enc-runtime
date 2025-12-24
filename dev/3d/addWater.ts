import * as THREE from 'three'
import { ThreeMapLayer } from './ThreeMapLayer'

// ----------------------------------------------------------------------------
// Shader
// ----------------------------------------------------------------------------

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
uniform float uTime;

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // 正弦波波浪
    float wave = sin(pos.x * 0.005 + uTime) * 5.0 + sin(pos.y * 0.003 + uTime * 0.5) * 5.0;
    pos.z += wave; 
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const fragmentShader = `
uniform float uTime;
uniform sampler2D tNormalMap;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uWaterColor;
uniform vec3 uCameraPosition;
uniform float uDistortionScale;
uniform float uTextureTiling;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    // 1. UV 计算
    vec2 uv = vWorldPosition.xz * uTextureTiling;

    // 2. 法线采样 (波浪)
    float t = uTime * 0.03;
    vec2 uv0 = uv * 0.5 + vec2(t, t);
    vec2 uv1 = uv * 1.0 + vec2(-t, t * 0.5);

    vec3 normal0 = texture2D(tNormalMap, uv0).rgb;
    vec3 normal1 = texture2D(tNormalMap, uv1).rgb;

    vec3 normal = normalize((normal0 + normal1) * 2.0 - 2.0);
    normal = normalize(vec3(normal.x * uDistortionScale, normal.y * uDistortionScale, normal.z));
    vec3 worldNormal = normalize(vec3(normal.x, normal.z, normal.y));

    // 3. 视线与菲涅尔
    vec3 viewVector = normalize(uCameraPosition - vWorldPosition);
    float refractiveFactor = dot(viewVector, worldNormal);
    refractiveFactor = clamp(refractiveFactor, 0.0, 1.0);
    
    // 菲涅尔系数：0.0(垂直) -> 1.0(平行)
    float fresnel = mix(0.0, 1.0, pow(1.0 - refractiveFactor, 3.0));

    // 4. --- 核心修改：光照与颜色 ---
    
    // a. 太阳高光 (保持不变)
    vec3 halfVector = normalize(uSunDirection + viewVector);
    float NdotH = max(dot(worldNormal, halfVector), 0.0);
    float specular = pow(NdotH, 100.0); 
    vec3 specularColor = uSunColor * specular * 0.6;

    // b. 伪天空反射颜色 (Fake Sky)
    // 当视线平行水面时(fresnel大)，显示淡蓝色/白色，模拟反射了天空
    vec3 skyColor = vec3(0.6, 0.7, 0.8); 
    
    // c. 混合颜色
    // 基础色是 uWaterColor
    // 根据 fresnel 混合：垂直看是水色，平视看是天色
    vec3 finalColor = mix(uWaterColor, skyColor, fresnel * 0.5); 
    
    // 叠加高光
    finalColor += specularColor;

    // 5. --- 核心修改：通透度 (Alpha) ---
    // 垂直看(0.0) -> 透明度 0.4 (很透，能看到底图)
    // 平视看(1.0) -> 透明度 0.9 (不透，反射强)
    float alpha = mix(0.4, 0.9, fresnel); 

    gl_FragColor = vec4(finalColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`

// ----------------------------------------------------------------------------
// func
// ----------------------------------------------------------------------------

const addWater = (layer: ThreeMapLayer, anchor: [number, number]) => {
	// 1. texture
	const loader = new THREE.TextureLoader()
	const normalMap = loader.load('http://localhost:8081/texture/WaterNormal1.png')
	normalMap.wrapS = normalMap.wrapT = THREE.MirroredRepeatWrapping

	// 2. uniform
	const uniforms = {
		uTime: { value: 0 },
		tNormalMap: { value: normalMap },
		uSunDirection: { value: new THREE.Vector3(-1, 1, 1).normalize() },
		uSunColor: { value: new THREE.Color(0xffffff) },
		uWaterColor: { value: new THREE.Color(0x006994) },
		uCameraPosition: { value: new THREE.Vector3() },
		uDistortionScale: { value: 0.5 }, // 如果觉得波纹太碎，可以改小，比如 0.5
		uTextureTiling: { value: 0.001 },
	}

	// 3. material
	const material = new THREE.ShaderMaterial({
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		uniforms: uniforms,
		transparent: true, // 关键：开启透明
		side: THREE.DoubleSide,
	})

	// 4. geometry
	const geometry = new THREE.PlaneGeometry(100000, 100000, 128, 128)

	// 5. mesh
	const waterMesh = new THREE.Mesh(geometry, material)

	// 6. anchor
	const pos = layer.projectToScene(anchor, -5)
	waterMesh.position.copy(pos)
	waterMesh.rotation.x = -Math.PI / 2 // 躺平

	// 7. add to scene
	layer.addToScene('custom-shader-water', waterMesh)

	// 8. animationObject.tick
	const update = () => {
		material.uniforms.uTime.value += 1.0 / 60.0
		material.uniforms.uCameraPosition.value.copy(layer.camera.position)
	}

	// 将 update 函数推入 layer 的动画队列
	layer.animatedObjects.push({
		tick: update, // 假设你修改了 Layer 支持这种对象，或者直接 push mesh 并在 layer 里判断
	})
}

export { addWater }
