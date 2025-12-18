/**
 * WebGL Shaders
 * Shader programs for rendering points, lines, and areas
 */

/**
 * Vertex shader for point/line/area rendering
 * Transforms tile-local coordinates (0-8192) to screen coordinates
 */
export const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec4 a_color;
in float a_size; // For point size or line width

uniform mat4 u_matrix; // Combined transformation matrix (tilePosMatrix * vpMatrix)
uniform vec2 u_viewport; // Viewport size for pixel-based sizing

out vec4 v_color;
out vec2 v_position;

void main() {
    vec4 position = vec4(a_position, 0.0, 1.0);
    gl_Position = u_matrix * position;
    v_color = a_color;
    v_position = a_position;
    
    // For points, set point size
    if (a_size > 0.0) {
        // Convert size from tile-local space to screen pixels
        vec4 clipPos = u_matrix * position;
        float w = clipPos.w;
        gl_PointSize = a_size * u_viewport.y / w;
    }
}
`

/**
 * Fragment shader for point/line/area rendering
 */
export const fragmentShaderSource = `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_position;

out vec4 fragColor;

void main() {
    fragColor = v_color;
	// fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`

/**
 * Vertex shader for point rendering (quads for each point)
 */
export const pointVertexShaderSource = `#version 300 es
in vec2 a_position;
in vec4 a_color;
in float a_size;

uniform mat4 u_matrix;
uniform vec2 u_viewport;

out vec4 v_color;

const vec2 QUAD[4] = vec2[4](
    vec2(-0.5, -0.5),
    vec2(-0.5,  0.5),
    vec2( 0.5, -0.5),
    vec2( 0.5,  0.5)
);

void main() {
    vec4 anchor = u_matrix * vec4(a_position, 0.0, 1.0);
	vec4 anchor_ndc = anchor / anchor.w;
	vec2 offset = QUAD[gl_VertexID] * a_size  / u_viewport;

    gl_Position = vec4(anchor_ndc.xy + offset, anchor_ndc.zw);
    v_color = a_color;
	gl_PointSize = 10.0;
}
`

/**
 * Fragment shader for point rendering (quads for each point)
 */
export const pointFragmentShaderSource = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main() {
    fragColor = v_color;
}
`

/**
 * Vertex shader for pattern (AP) rendering
 * Transforms tile-local coordinates and passes UV coordinates to fragment shader
 */
export const patternVertexShaderSource = `#version 300 es
in vec2 a_position;
in vec2 a_texcoord;

uniform mat4 u_matrix;

out vec2 v_texcoord;

void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
}
`

/**
 * Fragment shader for pattern (AP) rendering
 * Samples texture using UV coordinates and applies opacity
 */
export const patternFragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texcoord;

uniform sampler2D u_pattern;
uniform float u_opacity;

out vec4 fragColor;

void main() {
    vec4 color = texture(u_pattern, v_texcoord);
    fragColor = vec4(color.rgb, color.a * u_opacity);
}
`

/**
 * Vertex shader for SDF text rendering
 * Uses instanced rendering with one quad per glyph
 *
 * Text is rendered with FIXED SIZE in screen pixels (viewport-independent):
 * 1. Anchor point (a_position) is transformed to clip space via u_matrix
 * 2. Glyph offset (a_size, a_offset) is applied in NDC space (screen pixels)
 *
 * This ensures text size remains constant regardless of zoom level.
 */
export const sdfVertexShaderSource = `#version 300 es
// Per-vertex attributes (quad corners)
in vec2 a_quadVertex; // Quad corner: (0,0), (1,0), (0,1), (1,1)

// Per-instance attributes
in vec2 a_position;   // Anchor position in tile-local coordinates (0-8192)
in vec2 a_size;       // Glyph quad size in SCREEN PIXELS
in vec4 a_uvBounds;   // UV bounds: (u0, v0, u1, v1)
in vec3 a_color;      // Text color (RGB, 0-1)
in vec2 a_offset;     // Alignment offset in SCREEN PIXELS

// Transformation matrices
uniform mat4 u_matrix;        // Combined transformation matrix (MVP)

// Viewport and scaling uniforms
uniform vec2 u_viewport;      // Viewport size in pixels
uniform float u_gamma_scale;  // Pitch-based gamma adjustment (typically 1.0 for no pitch)

out vec2 v_texcoord;
out vec3 v_color;
out float v_gamma_scale;

void main() {
    // Step 1: Transform anchor position to clip space
    vec4 anchorClip = u_matrix * vec4(a_position, 0.0, 1.0);
    
    // Step 2: Convert to NDC (Normalized Device Coordinates)
    vec2 anchorNDC = anchorClip.xy / anchorClip.w;
    
    // Step 3: Calculate glyph corner offset in SCREEN PIXELS
    // a_quadVertex is (0,0), (1,0), (0,1), or (1,1)
    vec2 cornerOffsetPixels = a_quadVertex * a_size + a_offset;
    
    // Step 4: Convert pixel offset to NDC offset
    // NDC range is [-1, 1], so 2.0 / viewport converts pixels to NDC
    vec2 cornerOffsetNDC = cornerOffsetPixels * 2.0 / u_viewport;
    
    // Step 5: Apply offset in NDC space (Y is flipped in NDC)
    vec2 finalNDC = anchorNDC + vec2(cornerOffsetNDC.x, -cornerOffsetNDC.y);
    
    // Output final position (keep original w for depth)
    gl_Position = vec4(finalNDC * anchorClip.w, anchorClip.z, anchorClip.w);
    
    // Pass gamma scale for anti-aliasing
    v_gamma_scale = u_gamma_scale;
    
    // Interpolate UV coordinates
    v_texcoord = mix(a_uvBounds.xy, a_uvBounds.zw, a_quadVertex);
    v_color = a_color;
}
`

/**
 * Fragment shader for SDF text rendering
 * Uses smoothstep for anti-aliased edges with configurable bold threshold
 * Supports halo rendering with configurable color, width, and blur
 *
 * @requirements 7.1 - Sample atlas texture using interpolated UV coordinates
 * @requirements 7.2 - Apply gamma correction for anti-aliased edges
 * @requirements 7.3 - Support configurable font color and opacity
 * @requirements 7.4 - Support halo color, width, and blur for text outlines
 */
export const sdfFragmentShaderSource = `#version 300 es
precision highp float;

// SDF constants
#define SDF_PX 8.0
#define DEVICE_PIXEL_RATIO 2.0
#define EDGE_GAMMA 0.105 / DEVICE_PIXEL_RATIO

in vec2 v_texcoord;
in vec3 v_color;
in float v_gamma_scale;

uniform sampler2D u_atlas;

// Font styling uniforms
uniform vec4 u_font_color;    // Font color with alpha (RGBA)
uniform float u_font_opacity; // Font opacity multiplier
uniform float u_font_size;    // Font size for scaling calculations

// Halo styling uniforms
uniform vec4 u_halo_color;    // Halo color with alpha (RGBA)
uniform float u_halo_width;   // Halo width in pixels (0 = no halo)
uniform float u_halo_blur;    // Halo blur amount (0 = sharp edge)

// Legacy uniforms for backward compatibility
uniform float u_boldThreshold; // 0.5 for normal, lower for bold (e.g., 0.4)
uniform float u_gamma;         // Anti-aliasing width (typically 0.1-0.2)

// Debug mode
uniform bool u_debug;

out vec4 fragColor;

void main() {
    // Sample SDF value from atlas (R channel only)
    float dist = texture(u_atlas, v_texcoord).r;
    
    // Calculate font scale based on font size
    float fontScale = u_font_size / 24.0;
    
    // Calculate buffer threshold based on halo width
    // The buffer determines where the edge of the glyph is
    // Larger halo width = smaller buffer = edge moves outward
    lowp float buff = (6.0 - u_halo_width / fontScale) / SDF_PX;
    
    // Calculate gamma for anti-aliasing
    // Combines halo blur with base edge gamma, scaled by font size and perspective
    highp float gamma = (u_halo_blur * 1.19 / SDF_PX + EDGE_GAMMA) / (fontScale * max(v_gamma_scale, 0.001));
    
    // Apply perspective-based gamma scaling
    highp float gamma_scaled = gamma * max(v_gamma_scale, 0.001);
    
    // Calculate alpha using smoothstep for anti-aliased edges
    highp float alpha = smoothstep(buff - gamma_scaled, buff + gamma_scaled, dist);
    
    // Mix between font color and halo color based on distance
    // Inner part (dist close to 1) = font color
    // Outer part (dist close to 0) = halo color
    vec4 fontColorWithOpacity = u_font_color * u_font_opacity;
    vec4 color = mix(fontColorWithOpacity, u_halo_color, smoothstep(0.0, 0.5, 1.0 - dist));
    
    // Apply alpha to final color
    fragColor = color * alpha;
    
    // Debug mode: overlay red tint
    if (u_debug) {
        vec4 debug_color = vec4(1.0, 0.0, 0.0, 1.0);
        fragColor = mix(fragColor, debug_color, 0.5);
    }
}
`

/**
 * Create and compile a shader
 */
export function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type)
	if (!shader) return null

	gl.shaderSource(shader, source)
	gl.compileShader(shader)

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader)
		console.error('Shader compilation error:', info)
		gl.deleteShader(shader)
		return null
	}

	return shader
}

/**
 * Create a shader program from vertex and fragment shaders
 */
export function createProgram(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string,
): WebGLProgram | null {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

	if (!vertexShader || !fragmentShader) {
		return null
	}

	const program = gl.createProgram()
	if (!program) return null

	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)
	gl.linkProgram(program)

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program)
		console.error('Program linking error:', info)
		gl.deleteProgram(program)
		return null
	}

	return program
}
