import { CustomLayerInterface, Map, MercatorCoordinate } from "mapbox-gl";
import { type ColorTableType } from './ColorTable'
// import COLOR

interface LightProp {
    "CHARTID": number;
    "RCID": number;
    "OBJL": number;
    "OBJNAM": string;
    "NOBJNM": string;
    "CATEGORY": number;
    "VAL1": number;
    "VAL2": number;
}

interface LightFeature {
    tile: number[];
    coord: [number, number];
    properties: LightProp;
}

export default class LIGHTSLAYER implements CustomLayerInterface {
    id: string;
    type: 'custom'
    renderingMode: '2d' | '3d';
    map!: Map
    gl!: WebGL2RenderingContext
    colorTable: ColorTableType
    visible: boolean = true
    minimumZoom: number = 9 // minzoom

    ringProgram!: WebGLProgram;
    ringBuffer: WebGLBuffer | null = null;
    ringInstanceCount: number = 0;
    ringVao!: WebGLVertexArrayObject

    dashLineProgram!: WebGLProgram;
    dashCoordsBuffer: WebGLBuffer | null = null;
    dashSec1Buffer: WebGLBuffer | null = null;
    dashSec2Buffer: WebGLBuffer | null = null;
    dashLineInstanceCount: number = 0;
    dashLineSec1Vao!: WebGLVertexArrayObject
    dashLineSec2Vao!: WebGLVertexArrayObject

    debug!: Function
    mapUpdateHandler: Function

    constructor(colors: ColorTableType) {
        this.id = 'lights-layer';
        this.type = 'custom';
        this.renderingMode = '2d';
        // this.debug = throttle(this._debug, 300, true).bind(this)
        this.mapUpdateHandler = this.update.bind(this)
        this.colorTable = colors
    }

    _debug(): void {
        console.log(' == == == == == == ')
        const map = this.map
        const sourceCache = map.style?._sourceCaches['symbol:POINT_COMMON_POINT']!
        // 遍历所有瓦片
        for (const tileID in sourceCache._tiles) {
            const tile = sourceCache._tiles[tileID]!;

            // console.log(tile)
            const features: any[] = [];
            tile.querySourceFeatures(features, {
                sourceLayer: 'point_common',  // 可选
                filter: ['all',
                    ['==', ['get', 'OBJL'], 75],
                    ['match', ['get', 'CATEGORY'],
                        [101, 102, 103, 104, 201, 202, 203, 204], true, false]],// 特殊灯塔要素
            });
            // console.log(features)
            console.log(features.map(feat => {
                return {
                    tile: [feat._x, feat._y, feat._z],
                    geometry: feat.geometry.coordinates,
                    properties: feat.properties
                }
            }))
        }
        // console.log(map.getBounds())
    }

    _getCurrentFeatures(): LightFeature[] {
        const map = this.map
        const sourceCache = map.style?._sourceCaches['symbol:POINT_COMMON_POINT']!
        const result: LightFeature[] = []
        // 遍历所有瓦片
        for (const tileID in sourceCache._tiles) {
            const tile = sourceCache._tiles[tileID]!;

            // console.log(tile)
            const features: any[] = [];
            tile.querySourceFeatures(features, {
                sourceLayer: 'point_common',  // 可选
                filter: ['all',
                    ['==', ['get', 'OBJL'], 75],
                    ['match', ['get', 'CATEGORY'],
                        [101, 102, 103, 104, 201, 202, 203, 204], true, false]],// 特殊灯塔要素
            });

            const formattedFeatures = features.map(feat => {
                return {
                    tile: [feat._x, feat._y, feat._z],
                    coord: feat.geometry.coordinates,
                    properties: feat.properties
                }
            })
            result.push(...formattedFeatures)
        }
        return result
    }

    _classify(features: LightFeature[]) {


        const ringCats: number[] = [101, 102, 103, 104]
        const ringFeatures: LightFeature[] = []
        const sectorRingCats: number[] = [201, 202, 203, 204]
        const sectorRingFeatures: LightFeature[] = []

        features.forEach(feat => {
            if (ringCats.includes(feat.properties.CATEGORY)) {
                ringFeatures.push(feat)
            } else if (sectorRingCats.includes(feat.properties.CATEGORY)) {
                sectorRingFeatures.push(feat)
            }
        })

        return { ringFeatures, sectorRingFeatures }
    }

    _processRingFeature(feat: LightFeature) {

        const dict = {
            101: {
                color: hexToRgb(this.colorTable.LITRD),
                sec1: 0,
                sec2: 360,
                ri: feat.properties.VAL1 * 8, // field value of VAL1
                ro: feat.properties.VAL1 * 8 + 14, // field value of VAL1 + 3
            },
            102: {
                color: hexToRgb(this.colorTable.LITGN),
                sec1: 0,
                sec2: 360,
                ri: feat.properties.VAL1 * 8, // field value of VAL1
                ro: feat.properties.VAL1 * 8 + 14, // field value of VAL1 + 3
            },
            103: {
                color: hexToRgb(this.colorTable.LITYW),
                sec1: 0,
                sec2: 360,
                ri: feat.properties.VAL1 * 8, // field value of VAL1
                ro: feat.properties.VAL1 * 8 + 14, // field value of VAL1 + 3
            },
            104: {
                color: hexToRgb(this.colorTable.CHMGD),
                sec1: 0,
                sec2: 360,
                ri: feat.properties.VAL1 * 8, // field value of VAL1
                ro: feat.properties.VAL1 * 8 + 14, // field value of VAL1 + 3
            },
            201: {
                color: hexToRgb(this.colorTable.LITRD),
                sec1: (feat.properties.VAL1 + 180) % 360,
                sec2: (feat.properties.VAL2 + 180) % 360,
                ri: 12 * 8,
                ro: 12 * 8 + 14,
            },
            202: {
                color: hexToRgb(this.colorTable.LITGN),
                sec1: (feat.properties.VAL1 + 180) % 360,
                sec2: (feat.properties.VAL2 + 180) % 360,
                ri: 12 * 8, // field value of VAL1
                ro: 12 * 8 + 14, // field value of VAL1 + 3
            },
            203: {
                color: hexToRgb(this.colorTable.LITYW),
                sec1: (feat.properties.VAL1 + 180) % 360,
                sec2: (feat.properties.VAL2 + 180) % 360,
                ri: 12 * 8,
                ro: 12 * 8 + 14,
            },
            204: {
                color: hexToRgb(this.colorTable.CHMGD),
                sec1: (feat.properties.VAL1 + 180) % 360,
                sec2: (feat.properties.VAL2 + 180) % 360,
                ri: 12 * 8,
                ro: 12 * 8 + 14,
            }

        }
        const mercatorCoord = MercatorCoordinate.fromLngLat({
            lng: feat.coord[0],
            lat: feat.coord[1]
        })

        return {
            ...dict[feat.properties.CATEGORY as keyof typeof dict],
            coord: [mercatorCoord.x, mercatorCoord.y],
        }
    }

    _processRingFeatures(feats: LightFeature[]) {
        const verticesData: number[] = []
        feats.forEach(feat => {
            const { coord, color, ri, ro, sec1, sec2 } = this._processRingFeature(feat)
            verticesData.push(...coord, ...color, ri, ro, sec1, sec2) // [x,y,r,g,b,ri,ro,sec1,sec2]
        })
        return verticesData
    }

    _processDashFeatures(feats: LightFeature[]) {
        const catHasDash = [201, 202, 203, 204]
        let hereFeats = feats.filter(item => {
            return catHasDash.includes(item.properties.CATEGORY)
        })

        const coords = hereFeats.map(feat => {
            const mercatorCoord = MercatorCoordinate.fromLngLat({
                lng: feat.coord[0],
                lat: feat.coord[1]
            })
            return [mercatorCoord.x, mercatorCoord.y]
        }).flat()

        const sec1s = hereFeats.map(feat => (feat.properties.VAL1 + 180) % 360,)
        const sec2s = hereFeats.map(feat => (feat.properties.VAL2 + 180) % 360,)

        return {
            coords,
            sec1s,
            sec2s
        }
    }

    _updateRingGLResouce(ringVerticesData: number[]) {
        const gl = this.gl
        if (this.ringBuffer === null) {
            this.ringBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ringBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(ringVerticesData),
            gl.DYNAMIC_DRAW
        );
        this.ringInstanceCount = ringVerticesData.length / 9; // [x,y,r,g,b,ri,ro,sec1,sec2]

        this.ringVao = gl.createVertexArray();
        const aPos = gl.getAttribLocation(this.ringProgram, 'a_pos');
        const aColor = gl.getAttribLocation(this.ringProgram, 'a_color');
        const aRi = gl.getAttribLocation(this.ringProgram, 'a_ri');
        const aRo = gl.getAttribLocation(this.ringProgram, 'a_ro');
        const aSec1 = gl.getAttribLocation(this.ringProgram, 'a_sec1');
        const aSec2 = gl.getAttribLocation(this.ringProgram, 'a_sec2');
        gl.bindVertexArray(this.ringVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ringBuffer);

        // Stride = 7 * 4 = 28 bytes  
        const stride = 9 * 4;

        // a_pos: float2, [x, y], offset 0
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribDivisor(aPos, 1);

        // a_color: float3, [r, g, b], offset 2*4 = 8 bytes
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 2 * 4);
        gl.vertexAttribDivisor(aColor, 1);

        // a_ri: float, [ri], offset 5*4 = 20 bytes
        gl.enableVertexAttribArray(aRi);
        gl.vertexAttribPointer(aRi, 1, gl.FLOAT, false, stride, 5 * 4);
        gl.vertexAttribDivisor(aRi, 1);

        // a_ro: float, [ro], offset 6*4 = 24 bytes
        gl.enableVertexAttribArray(aRo);
        gl.vertexAttribPointer(aRo, 1, gl.FLOAT, false, stride, 6 * 4);
        gl.vertexAttribDivisor(aRo, 1);

        // a_sec1: float, [sec1], offset 7*4 = 28 bytes
        gl.enableVertexAttribArray(aSec1);
        gl.vertexAttribPointer(aSec1, 1, gl.FLOAT, false, stride, 7 * 4);
        gl.vertexAttribDivisor(aSec1, 1);

        // a_sec2: float, [sec2], offset 8*4 = 32 bytes
        gl.enableVertexAttribArray(aSec2);
        gl.vertexAttribPointer(aSec2, 1, gl.FLOAT, false, stride, 8 * 4);
        gl.vertexAttribDivisor(aSec2, 1);
        gl.bindVertexArray(null)
    }

    _updateDashLineGLResouce(coords: number[], sec1s: number[], sec2s: number[]) {
        const gl = this.gl

        /// Step 1: update buffer (coord, sec1, sec2)

        if (this.dashCoordsBuffer === null) {
            this.dashCoordsBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashCoordsBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(coords),
            gl.DYNAMIC_DRAW
        );
        this.dashLineInstanceCount = coords.length / 2; // [x,y]


        if (this.dashSec1Buffer === null) {
            this.dashSec1Buffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashSec1Buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(sec1s),
            gl.DYNAMIC_DRAW
        );

        if (this.dashSec2Buffer === null) {
            this.dashSec2Buffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashSec2Buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(sec2s),
            gl.DYNAMIC_DRAW
        );

        /// Step 2 : update vao (coord, sec1, sec2)
        const aPos = gl.getAttribLocation(this.dashLineProgram, 'a_pos');
        const aAngle = gl.getAttribLocation(this.dashLineProgram, 'a_angle');

        this.dashLineSec1Vao = gl.createVertexArray();
        gl.bindVertexArray(this.dashLineSec1Vao);

        gl.enableVertexAttribArray(aPos);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashCoordsBuffer);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(aPos, 1);

        gl.enableVertexAttribArray(aAngle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashSec1Buffer);
        gl.vertexAttribPointer(aAngle, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(aAngle, 1);
        gl.bindVertexArray(null)

        this.dashLineSec2Vao = gl.createVertexArray();
        gl.bindVertexArray(this.dashLineSec2Vao);

        gl.enableVertexAttribArray(aPos);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashCoordsBuffer);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(aPos, 1);

        gl.enableVertexAttribArray(aAngle);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dashSec2Buffer);
        gl.vertexAttribPointer(aAngle, 1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(aAngle, 1);
        gl.bindVertexArray(null)
    }

    update() {
        // console.log('trigger update')
        // 当地图数据更新时触发更新

        // Step 1.1: ring feature preprocess
        const features = this._getCurrentFeatures()
        // const { ringFeatures, sectorRingFeatures } = this._classify(features)
        const ringVerticesData = this._processRingFeatures(features)
        // console.log('ringVerticesData', ringVerticesData)

        // Step 1.2: update ring gl resource
        this._updateRingGLResouce(ringVerticesData)


        // Step 2.1 dash feature preprocess
        const { coords, sec1s, sec2s } = this._processDashFeatures(features)
        // console.log(coords, sec1s, sec2s)
        // Step 2.2 dash gl resource update
        this._updateDashLineGLResouce(coords, sec1s, sec2s)
    }

    _initRingProgram() {
        const gl = this.gl
        // create GLSL source for vertex shader
        const vertexSource = `#version 300 es
                precision highp float;
    
                in vec2 a_pos;
                in vec3 a_color;
                in float a_ri; // inner radius in pixels
                in float a_ro; // outer radius in pixels
                in float a_sec1; // start angle in degrees
                in float a_sec2; // end angle in degrees

                uniform mat4 u_matrix;
                uniform vec2 u_viewport;
    
                out vec3 v_color;
                out vec2 v_pos;
                out float v_ri;
                out float v_ro;
                out float v_sec1;
                out float v_sec2;
    
                const vec2 quad_offsets[4] = vec2[4](
                    vec2(-1.0, -1.0),
                    vec2(-1.0,  1.0),
                    vec2( 1.0, -1.0),
                    vec2( 1.0,  1.0)
                );
    
                void main() {
                    vec4 clipPosWithW = u_matrix * vec4(a_pos, 0.0, 1.0);
                    vec4 clipPos = clipPosWithW / clipPosWithW.w; // perspective divide
    
                    // Expand quad in clip space by outer radius
                    vec2 offsetInClip = quad_offsets[gl_VertexID] * (2.0 * a_ro / u_viewport);
                    // Note: NDC width = 2, so to offset by 'a_ro' pixels, we scale by (a_ro / viewport) * 2
    
                    gl_Position = vec4(clipPos.xy + offsetInClip, clipPos.z, 1.0);
    
                    // Convert center to screen pixel space (origin bottom-left)
                    v_pos = (clipPos.xy * 0.5 + 0.5) * u_viewport;
                    v_ri = a_ri;
                    v_ro = a_ro;
                    v_sec1 = a_sec1;
                    v_sec2 = a_sec2;
                    v_color = a_color;
                }
            `

        // create GLSL source for fragment shader
        const fragmentSource = `#version 300 es
            precision highp float;

            in vec3 v_color;
            in vec2 v_pos;
            in float v_ri;   // 内径
            in float v_ro;   // 外径
            in float v_sec1; // 起始角度 (Degree, 0=North, CW) !!!
            in float v_sec2; // 终止角度 (Degree, 0=North, CW) !!!

            out vec4 outColor;

            float normalizeAngle(float angle) {
                float res = mod(angle, 360.0);
                if (res < 0.0) res += 360.0;
                return res;
            }

            void main() {
                ///// 1. Basic Coordinate and Distance
                vec2 p = gl_FragCoord.xy - v_pos;
                float dist = length(p);

                float strokeWidth = 2.0; 
                float aa = 1.0; 
                vec3 strokeColor = vec3(0.0, 0.0, 0.0);

                ///// 2. Degree Calculation
                // 使用 atan(x, y) 而非 atan(y, x) 可实现 0度指向 Y轴正方向(北)
                float currentAngle = degrees(atan(p.x, p.y)) * 1.0; 

                currentAngle = mod(currentAngle + 360.0 , 360.0);

                ///// 3. Sector Mask
                bool inSector = false;
            
                if (v_sec1 <= v_sec2) {
                    // 比如 sec1 = 20, sec2 = 150, 那么有效区域应该是， 20 - 150
                    inSector = (currentAngle >= v_sec1 && currentAngle <= v_sec2);
                } else {
                    // 比如 sec1 = 150, sec2 = 20, 那么有效区域应该是， 150-360, 0-20
                    inSector = (currentAngle <= 360.0 && currentAngle >= v_sec1) || 
                        (currentAngle >= 0.0 && currentAngle <= v_sec2);
                }

                if (!inSector) discard;


                ///// 4. 圆环径向 Alpha
                float alphaOuter = 1.0 - smoothstep(v_ro - aa, v_ro, dist);
                float alphaInner = smoothstep(v_ri, v_ri + aa, dist);
                
                float shapeAlpha = alphaOuter * alphaInner;
                if (shapeAlpha < 0.01) discard;


                ///// 5. 描边距离计算 (Stroke Distance)
                
                // 径向边缘距离
                float distToOuter = abs(dist - v_ro);
                float distToInner = abs(dist - v_ri);
                float distToRadial = distToOuter;
                if (v_ri > 0.5) distToRadial = min(distToOuter, distToInner);

                float distToEdge = distToRadial;

                // 6. 混合颜色与描边
                float borderFactor = 1.0 - smoothstep(strokeWidth - aa, strokeWidth, distToEdge);
                vec3 finalColor = mix(v_color, strokeColor, borderFactor);

                outColor = vec4(finalColor, shapeAlpha);
            }
        `;

        // create a vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        // create a fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        // link the two shaders into a WebGL program
        this.ringProgram = gl.createProgram()!;
        gl.attachShader(this.ringProgram, vertexShader);
        gl.attachShader(this.ringProgram, fragmentShader);
        gl.linkProgram(this.ringProgram);
    }

    _initDashLineProgram() {
        const gl = this.gl;

        const vertexSource = `#version 300 es
            precision highp float;

            in vec2 a_pos;
            in float a_angle; 

            uniform mat4 u_matrix;
            uniform vec2 u_viewport;

            const float u_length = 180.0;
            const float u_width = 2.0;

            out float v_dist;

            void main() {
    
                // gl_VertexID: 0, 1, 2, 3 对应 Triangle Strip 的四个角
                // 0: (0, -w/2), 1: (0, +w/2), 2: (L, -w/2), 3: (L, +w/2)
                
                float x = (gl_VertexID == 2 || gl_VertexID == 3) ? u_length : 0.0;
                float y = (gl_VertexID == 1 || gl_VertexID == 3) ? u_width * 0.5 : -u_width * 0.5;
                
                v_dist = x;
                float rad = radians(a_angle);
                vec2 dir = vec2(sin(rad), cos(rad));
                vec2 perp = vec2(-dir.y, dir.x);    

                vec2 offsetPixels = dir * x + perp * y;

                vec4 centerClip = u_matrix * vec4(a_pos, 0.0, 1.0);
                vec4 centerNDC = centerClip / centerClip.w;

                vec2 centerScreen = (centerNDC.xy * 0.5 + 0.5) * u_viewport;

                vec2 targetScreen = centerScreen + offsetPixels;

                vec2 targetNDC = (targetScreen / u_viewport) * 2.0 - 1.0;
                
                gl_Position = vec4(targetNDC * centerClip.w, centerClip.z, centerClip.w);
            }
        `;

        const fragmentSource = `#version 300 es
            precision highp float;

            in float v_dist;

            const vec3 u_color = vec3(0.0, 0.0, 0.0);
            const float u_dash_size = 10.0; // 实线长度
            const float u_gap_size = 5.0; // 间隔长度

            out vec4 outColor;

            void main() {
                float totalSize = u_dash_size + u_gap_size;
                float pattern = mod(v_dist, totalSize);

                if (pattern > u_dash_size) {
                    discard;
                }

                outColor = vec4(u_color, 1.0);
            }
        `;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        this.dashLineProgram = gl.createProgram()!;
        gl.attachShader(this.dashLineProgram, vertexShader);
        gl.attachShader(this.dashLineProgram, fragmentShader);
        gl.linkProgram(this.dashLineProgram);
    }

    setVisibility(state: boolean) {
        this.visible = state
    }

    onAdd(map: Map, gl: WebGL2RenderingContext): void {
        this.map = map
        this.gl = gl

        this._initRingProgram()
        this._initDashLineProgram()

        this.map.on('moveend', this.mapUpdateHandler as any)
        setTimeout(this.mapUpdateHandler, 500);
    }

    render(gl: WebGL2RenderingContext, matrix: number[]): void {
        if (this.visible === false) return
        if (this.map.getZoom() < this.minimumZoom) return
        if (this.map.getPitch() > 0) return
        // this.debug()

        // Step 1 : config
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


        // Step 2 : ring render
        gl.useProgram(this.ringProgram);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.ringProgram, 'u_matrix'),
            false,
            matrix
        );
        gl.uniform2f(
            gl.getUniformLocation(this.ringProgram, 'u_viewport'),
            this.gl.canvas.width,
            this.gl.canvas.height
        )
        gl.bindVertexArray(this.ringVao)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.ringInstanceCount)

        // Step 3: sec1, sec2 render 
        gl.useProgram(this.dashLineProgram);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.dashLineProgram, 'u_matrix'),
            false,
            matrix
        );
        gl.uniform2f(
            gl.getUniformLocation(this.dashLineProgram, 'u_viewport'),
            this.gl.canvas.width,
            this.gl.canvas.height
        )

        //// 
        gl.bindVertexArray(this.dashLineSec1Vao)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.dashLineInstanceCount)
        /// 
        gl.bindVertexArray(this.dashLineSec2Vao)
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.dashLineInstanceCount)


        // Final : clean resource
        gl.bindVertexArray(null)
        gl.useProgram(null)
        gl.disable(gl.BLEND)
    }
}

function throttle(fn: Function, interval: number = 300, immediate: boolean = false) {
    let lastExecTime = 0;
    let timer: NodeJS.Timeout | null = null;

    return function (this: any, ...args: any[]) {
        const currentTime = Date.now();

        if (immediate) {
            if (currentTime - lastExecTime >= interval) {
                fn.apply(this, args);
                lastExecTime = currentTime;
            }
        } else {
            if (timer) clearTimeout(timer);

            if (currentTime - lastExecTime >= interval) {
                fn.apply(this, args);
                lastExecTime = currentTime;
            } else {
                timer = setTimeout(() => {
                    fn.apply(this, args);
                    lastExecTime = Date.now();
                    timer = null;
                }, interval - (currentTime - lastExecTime));
            }
        }
    };
}

function hexToRgb(hex: string) {
    const [r, g, b] = hex.match(/\w\w/g)!.map(c => parseInt(c, 16))
    return [r / 255, g / 255, b / 255]
}