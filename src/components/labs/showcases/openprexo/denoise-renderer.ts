// One offscreen WebGL context renders every tile's denoise; each frame is copied into the tile's 2D canvas.

const vertex =
  "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
const fragment = `precision mediump float;
uniform sampler2D uTo, uFrom; uniform float uProg, uHasFrom, uTime, uSeed; uniform vec2 uRes;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1. - uv.y;
  float p = uProg;
  float block = mix(36., 1., pow(p, .55));
  vec2 q = (floor(gl_FragCoord.xy / block) + .5) * block / uRes; q.y = 1. - q.y;
  vec3 to = texture2D(uTo, p > .995 ? uv : q).rgb;
  float l = dot(to, vec3(.299, .587, .114));
  to = mix(vec3(l) * vec3(.92, .95, 1.08), to, smoothstep(.15, .8, p));
  float n = hash(floor(gl_FragCoord.xy / 2.) + uSeed * 91. + floor(uTime * 20.) * 13.7);
  vec3 c;
  if (uHasFrom > .5) {
    vec3 from = texture2D(uFrom, uv).rgb;
    c = mix(from, to, smoothstep(.2, .85, p));
    c = mix(c, vec3(n), sin(p * 3.14159) * .5);
  } else {
    c = mix(to, vec3(n) * vec3(.88, .9, 1.), pow(1. - p, 1.25));
  }
  gl_FragColor = vec4(c, 1.);
}`;

const uniforms = [
  "uTo",
  "uFrom",
  "uProg",
  "uHasFrom",
  "uTime",
  "uSeed",
  "uRes",
] as const;

export type DenoiseFrame = {
  readonly src: string;
  readonly from?: string | undefined;
  /** 0 is pure noise (or the source image), 1 is the finished result. */
  readonly progress: number;
  readonly seed: number;
};

class DenoiseRenderer {
  private readonly canvas = document.createElement("canvas");
  private readonly gl: WebGLRenderingContext | null;
  private readonly location = new Map<string, WebGLUniformLocation | null>();
  private readonly textures = new Map<string, WebGLTexture>();
  private readonly images = new Map<string, Promise<HTMLImageElement>>();

  constructor() {
    this.gl = this.canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    const gl = this.gl;
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!program || !vs || !fs) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL method, not a React hook.
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of uniforms)
      this.location.set(name, gl.getUniformLocation(program, name));
    gl.uniform1i(this.location.get("uTo") ?? null, 0);
    gl.uniform1i(this.location.get("uFrom") ?? null, 1);
  }

  load(src: string) {
    const cached = this.images.get(src);
    if (cached) return cached;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        const gl = this.gl;
        const texture = gl?.createTexture();
        if (gl && texture) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            image,
          );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          this.textures.set(src, texture);
        }
        resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
    this.images.set(src, promise);
    return promise;
  }

  async draw(target: HTMLCanvasElement, frame: DenoiseFrame) {
    const context = target.getContext("2d");
    if (!context) return;
    const image = await this.load(frame.src);
    const gl = this.gl;
    const to = this.textures.get(frame.src);
    if (!gl || !to) {
      // Without WebGL: a blur that sharpens as the steps advance.
      context.filter = `blur(${(1 - frame.progress) * 14}px) grayscale(${1 - frame.progress})`;
      context.drawImage(image, 0, 0, target.width, target.height);
      return;
    }
    if (
      this.canvas.width !== target.width ||
      this.canvas.height !== target.height
    ) {
      this.canvas.width = target.width;
      this.canvas.height = target.height;
    }
    const from = frame.from ? this.textures.get(frame.from) : undefined;
    gl.viewport(0, 0, target.width, target.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, to);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, from ?? to);
    gl.uniform1f(this.location.get("uProg") ?? null, frame.progress);
    gl.uniform1f(this.location.get("uHasFrom") ?? null, from ? 1 : 0);
    gl.uniform1f(this.location.get("uTime") ?? null, performance.now() / 1000);
    gl.uniform1f(this.location.get("uSeed") ?? null, frame.seed);
    gl.uniform2f(
      this.location.get("uRes") ?? null,
      target.width,
      target.height,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    context.drawImage(this.canvas, 0, 0);
  }
}

let renderer: DenoiseRenderer | null = null;
export function denoiseRenderer() {
  renderer ??= new DenoiseRenderer();
  return renderer;
}
