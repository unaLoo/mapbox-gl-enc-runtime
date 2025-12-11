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
