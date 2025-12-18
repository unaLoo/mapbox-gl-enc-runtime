import { CustomLayerInterface, Map } from 'mapbox-gl'
import earcut, { flatten } from 'earcut'

// ... (接口定义保持不变) ...
interface GeoJSONFeature {
    type: 'Feature'
    geometry: {
        type: 'Polygon' | 'MultiPolygon'
        coordinates: number[][][] | number[][][][]
    }
    properties?: Record<string, any>
}

interface GeoJSONData {
    type: 'FeatureCollection'
    features: GeoJSONFeature[]
}

interface ParsedPolygonData {
    vertexData: number[]
    indexData: number[]
}

export default class WaterLayer implements CustomLayerInterface {
    id = 'waterLayer'
    type = 'custom' as const
    renderingMode = '3d' as const
    map: Map | null = null

    // 资源数据
    polygonData: GeoJSONData | null = null
    polygonSrcUrl: string
    normalMapUrl: string // 新增：法线贴图 URL

    // GL 对象
    program: WebGLProgram | null = null
    vao: WebGLVertexArrayObject | null = null
    texture: WebGLTexture | null = null // 新增：纹理对象

    indexCount: number = 0
    renderReady: boolean = false
    startTime: number = 0

    // 构造函数传入贴图地址
    constructor(polygonSrcUrl: string, normalMapUrl: string) {
        this.polygonSrcUrl = polygonSrcUrl
        this.normalMapUrl = normalMapUrl
    }

    onAdd(map: Map, gl: WebGL2RenderingContext): void {
        this.map = map
        this.startTime = performance.now()

        // 1. 加载多边形数据
        loadPolygon(this.polygonSrcUrl).then(res => {
            this.polygonData = res
            this.checkReady(gl)
        })

        // 2. 加载法线纹理
        loadTexture(gl, this.normalMapUrl).then(tex => {
            this.texture = tex
            this.checkReady(gl)
        })

        this.initShader(gl)
    }

    // 检查资源是否都准备好了
    checkReady(gl: WebGL2RenderingContext) {
        if (this.polygonData && this.texture && this.program) {
            if (this.initBuffers(gl)) {
                this.renderReady = true
                this.map?.triggerRepaint()
            }
        }
    }

    render(gl: WebGL2RenderingContext, matrix: number[]): void {
        if (!this.renderReady || !this.program || !this.texture || !this.map) return

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.disable(gl.CULL_FACE)

        gl.useProgram(this.program)
        gl.bindVertexArray(this.vao)

        // --- 绑定 Uniforms ---
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_matrix'), false, matrix)

        const time = (performance.now() - this.startTime) / 1000.0
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), time)

        const camPos = this.map.getFreeCameraOptions().position
        if (camPos) {
            gl.uniform3f(gl.getUniformLocation(this.program, 'u_cameraPos'), camPos.x, camPos.y, camPos.z)
        } else {
            gl.uniform3f(gl.getUniformLocation(this.program, 'u_cameraPos'), 0.5, 0.5, 1.0)
        }

        // --- 绑定纹理 ---
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_normalMap'), 0)

        // --- 绘制 ---
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0)

        this.map?.triggerRepaint()
    }

    // 初始化 Shader (分离出来)
    initShader(gl: WebGL2RenderingContext) {
        this.program = createShaderFromCode(gl, WATER_VERTEX_SHADER, WATER_FRAGMENT_SHADER)
    }

    // 初始化 Buffer (分离出来)
    initBuffers(gl: WebGL2RenderingContext): boolean {
        try {
            if (!this.polygonData) return false
            const { vertexData, indexData } = parsePolygon(this.polygonData)

            const posBuffer = createVBO(gl, vertexData)
            const idxBuffer = createIBO(gl, indexData)
            const vao = gl.createVertexArray()

            gl.bindVertexArray(vao)
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer)
            gl.bindVertexArray(null)

            this.vao = vao
            this.indexCount = indexData.length
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    onRemove(map: Map, gl: WebGL2RenderingContext): void {
        if (this.program) gl.deleteProgram(this.program)
        if (this.vao) gl.deleteVertexArray(this.vao)
        if (this.texture) gl.deleteTexture(this.texture)
    }
}

// --- Shader 部分 ---

const WATER_VERTEX_SHADER = `
layout(location = 0) in vec2 aPosition;
uniform mat4 u_matrix;
out vec2 v_worldPos;
void main() {
    v_worldPos = aPosition;
    // gl_Position = u_matrix * vec4(aPosition, 1e-6, 1.0);
    gl_Position = u_matrix * vec4(aPosition, 0.0, 1.0);
}
`
const WATER_FRAGMENT_SHADER = `
precision highp float;

in vec2 v_worldPos;
out vec4 FragColor;

uniform sampler2D u_normalMap;
uniform float u_time;
uniform vec3 u_cameraPos;

// --- 模拟 Three.js 的参数 ---
const vec3 SUN_DIRECTION = normalize(vec3(-0.5, 0.4, 0.5)); // 太阳方向
const vec3 SUN_COLOR = vec3(1.0, 1.0, 1.0);
const vec3 WATER_COLOR = vec3(0.0, 0.12, 0.25); // 深水颜色 (Three.js 默认色)
const float DISTORTION_SCALE = 3.7;             // 波浪扭曲程度

// 纹理平铺系数 (根据你的地图层级调整，建议 5000-10000)
const float TEXTURE_TILING = 10000.0; 

// --- 伪天空盒函数 ---
// 因为我们没有真正的 CubeMap，我们要用数学公式模拟一个天空
// 根据光线反射方向(rayDir)，返回天空颜色
vec3 getSkyColor(vec3 rayDir) {
    // 简单的天空渐变：
    // y > 0 是天空，越接近 1.0 越蓝
    // y < 0 是地平线以下，稍微暗淡一点
    vec3 skyBlue = vec3(0.4, 0.6, 0.9);
    vec3 horizon = vec3(0.7, 0.8, 0.9);
    
    // 根据 rayDir.y (高度角) 混合颜色
    float t = max(rayDir.y, 0.0);
    return mix(horizon, skyBlue, t * 0.8) * 0.8;
}

void main() {
    // 1. 基础 UV 计算
    vec2 uv = v_worldPos * TEXTURE_TILING;

    // 2. 法线采样 (复刻 Three.js Water 的采样逻辑)
    // 它的核心是：同一个纹理，采样两次，方向不同，速度不同，UV 缩放也不同
    float t = u_time * 0.03;
    
    vec2 uv0 = uv * 0.5 + vec2(t, t);         // 第一层：慢速，大波浪
    vec2 uv1 = uv * 1.0 + vec2(-t, t * 0.5);  // 第二层：稍快，小波浪细节

    vec3 normal0 = texture(u_normalMap, uv0).rgb;
    vec3 normal1 = texture(u_normalMap, uv1).rgb;

    // 混合法线，并将范围从 [0,1] 映射回 [-1,1]
    vec3 normal = normalize((normal0 + normal1) * 2.0 - 2.0); 
    
    // 应用法线强度干扰 (Distortion)
    // 我们不仅干扰法线本身，还让法线去干扰一点点 UV (可选，这里简化处理只做法线干扰)
    // 这里的 normal.xy *= DISTORTION_SCALE 是为了让波浪看起来更有立体感
    normal = normalize(vec3(normal.x * DISTORTION_SCALE, normal.y * DISTORTION_SCALE, normal.z));

    // -----------------------------------------------------------
    // 3. 物理光照计算 (关键差异点)
    // -----------------------------------------------------------

    // 视线向量
    vec3 viewVector = normalize(u_cameraPos - vec3(v_worldPos, 0.0));
    
    // a. 菲涅尔效应 (Fresnel)
    // 视线与法线的夹角决定了水面是透明还是像镜子
    // dot(viewVector, normal) 越小(越平视)，反射越强
    float refractiveFactor = dot(viewVector, normal) * 0.5;
    refractiveFactor = clamp(refractiveFactor, 0.0, 1.0);
    // 这里的参数可以微调，决定了“有多反光”
    float fresnel = mix(0.1, 1.0, pow(1.0 - refractiveFactor, 5.0));

    // b. 反射颜色 (Reflection)
    // 计算反射向量：视线射入水面，反射向哪？
    vec3 reflectionVector = reflect(-viewVector, normal); 
    // *重点*：去采样伪天空
    vec3 reflectionColor = getSkyColor(reflectionVector);

    // c. 漫反射/折射颜色 (Refraction)
    // 简单模拟：深水色 + 一点点环境光
    vec3 refractionColor = WATER_COLOR;

    // d. 太阳高光 (Specular)
    // 计算半角向量
    vec3 halfVector = normalize(SUN_DIRECTION + viewVector);
    float NdotH = max(dot(normal, halfVector), 0.0);
    float specular = pow(NdotH, 100.0); 
    vec3 specularColor = SUN_COLOR * specular * 0.3; // 0.6 是强度

    // 4. 最终合成
    // 颜色 = 混合(折射色, 反射色, 菲涅尔系数) + 高光
    vec3 finalColor = mix(refractionColor, reflectionColor, fresnel);
    finalColor += specularColor;

    // 5. Alpha 处理
    // 视线越平，水面越不透明 (Alpha 越高)
    float alpha = mix(0.8, 1.0, fresnel);

    FragColor = vec4(finalColor, alpha);
}
`

// // 核心修改：使用纹理采样的 Fragment Shader
// const WATER_FRAGMENT_SHADER = `
// precision highp float;

// in vec2 v_worldPos;
// out vec4 FragColor;

// uniform sampler2D u_normalMap; // 传入的法线贴图
// uniform float u_time;
// uniform vec3 u_cameraPos;

// // --- 参数配置 ---
// const vec3 SUN_DIR = normalize(vec3(-0.5, 0.4, 0.5));
// const vec3 WATER_BASE = vec3(0.05, 0.25, 0.55); // 基础水色
// const vec3 WATER_SHALLOW = vec3(0.0, 0.5, 0.7); // 浅水透光色
// const float SPECULAR_STRENGTH = 1.8;
// const float SHININESS = 60.0;
// const float NORMAL_SCALE = 2.0; // 法线强度

// // 纹理缩放因子：根据你的地图多边形大小调整
// // 如果纹理看起来太大/太模糊，增大这个值；如果太密，减小这个值
// const float TEX_SCALE = 8000.0; 

// void main() {
//     // 基础 UV
//     vec2 uv = v_worldPos * TEX_SCALE;

//     // --- 多层采样 (Texture Advection / Mixing) ---
//     // 1. 第一层：向一个方向慢速移动，尺寸较大
//     vec2 uv1 = uv * 0.5 + vec2(u_time * 0.04, u_time * 0.02);
//     vec3 normal1 = texture(u_normalMap, uv1).rgb;

//     // 2. 第二层：向相反方向快速移动，尺寸稍小
//     vec2 uv2 = uv * 2.0 + vec2(-u_time * 0.05, u_time * 0.06);
//     vec3 normal2 = texture(u_normalMap, uv2).rgb;

//     // 混合两层法线 (0~1 空间)
//     vec3 mixedNormal = normalize(normal1 + normal2);

//     // 解码法线: 从 [0, 1] 映射到 [-1, 1]
//     // 只有 red 和 green 通道需要映射，blue (z) 保持向上
//     vec3 normal = normalize(mixedNormal * 2.0 - 1.0);

//     // 增强/减弱法线凹凸感
//     normal.xy *= NORMAL_SCALE;
//     normal = normalize(normal);

//     // --- 光照计算 ---
//     vec3 viewDir = normalize(u_cameraPos - vec3(v_worldPos, 0.0));
//     vec3 halfDir = normalize(SUN_DIR + viewDir);

//     // Diffuse
//     float diff = max(dot(normal, SUN_DIR), 0.0);

//     // Specular (Blinn-Phong)
//     float spec = pow(max(dot(normal, halfDir), 0.0), SHININESS);

//     // Fresnel
//     float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);

//     // --- 颜色合成 ---
//     vec3 col = mix(WATER_BASE, WATER_SHALLOW, diff * 0.2 + 0.1);

//     // 加入高光
//     col += vec3(0.5) * spec * SPECULAR_STRENGTH;

//     // 加入天空反射 (Fresnel)
//     col += vec3(0.8, 0.9, 1.0) * fresnel * 0.5;

//     // Alpha (透明度)
//     float alpha = 0.85 + fresnel * 0.15;

//     FragColor = vec4(col, alpha);
// }
// `

// --- 工具函数 ---

// 新增：加载纹理
async function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'Anonymous' // 必须，否则跨域无法用于 WebGL
        image.onload = () => {
            const texture = gl.createTexture()
            if (!texture) {
                reject('Failed to create texture')
                return
            }
            gl.bindTexture(gl.TEXTURE_2D, texture)

            // 上传图片数据
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

            // 设置参数：必须是 REPEAT 才能平铺
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

            // 生成 Mipmap (让远处的纹理不闪烁)
            gl.generateMipmap(gl.TEXTURE_2D)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

            resolve(texture)
        }
        image.onerror = (e) => reject(e)
        image.src = url
    })
}

// ... (loadPolygon, parsePolygon, createVBO 等函数保持不变) ...
async function loadPolygon(url: string): Promise<GeoJSONData> {
    const response = await fetch(url)
    return await response.json()
}

function lngLatToMercator(lng: number, lat: number): [number, number] {
    const x = (180 + lng) / 360
    const y = (180 - (Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI)) / 360
    return [x, y]
}

function parsePolygon(geojson: GeoJSONData): ParsedPolygonData {
    const feature = geojson.features[0]
    const coordinates = feature.geometry.coordinates as number[][][]
    console.log(coordinates)

    const mercatorCoordinates = coordinates.map(ring =>
        ring.map(coord => {
            const [x, y] = lngLatToMercator(coord[0], coord[1])
            return [x, y]
        })
    )
    const data = flatten(mercatorCoordinates)
    const triangles = earcut(data.vertices, data.holes, data.dimensions)
    return {
        vertexData: data.vertices.flat(),
        indexData: triangles,
    }
}
function createVBO(gl: WebGL2RenderingContext, data: number[] | Float32Array): WebGLBuffer | null {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data instanceof Array ? new Float32Array(data) : data, gl.STATIC_DRAW)
    return buffer
}
function createIBO(gl: WebGL2RenderingContext, data: number[] | Uint16Array): WebGLBuffer | null {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data instanceof Array ? new Uint16Array(data) : data, gl.STATIC_DRAW)
    return buffer
}
function createShaderFromCode(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
    const header = '#version 300 es\n'
    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, header + vsSource)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(vs))

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, header + fsSource)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(fs))

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    return program
}