"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HeroDisplacementCanvas.module.css";

type HeroDisplacementCanvasProps = {
  images: string[];
  activeIndex: number;
  className?: string;
};

type TextureRecord = {
  texture: WebGLTexture;
  width: number;
  height: number;
  index: number;
};

type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

type ProgramLocations = {
  position: number;
  textureA: WebGLUniformLocation;
  textureB: WebGLUniformLocation;
  imageSizeA: WebGLUniformLocation;
  imageSizeB: WebGLUniformLocation;
  resolution: WebGLUniformLocation;
  progress: WebGLUniformLocation;
  time: WebGLUniformLocation;
  pointer: WebGLUniformLocation;
};

type PendingImage = {
  image: HTMLImageElement;
  cancel: () => void;
};

const MAX_DPR = 1.5;
const MAX_BACKING_PIXELS = 4_000_000;
const IMAGE_KEY_SEPARATOR = "\u001f";
const LOAD_CANCELLED = Symbol("load-cancelled");

function vertexShaderSource(webGl2: boolean) {
  return `${webGl2 ? "#version 300 es\n" : ""}
  ${webGl2 ? "#define ATTRIBUTE in\n#define VARYING_OUT out" : "#define ATTRIBUTE attribute\n#define VARYING_OUT varying"}
  precision highp float;
  ATTRIBUTE vec2 aPosition;
  VARYING_OUT vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;
}

function fragmentShaderSource(webGl2: boolean) {
  return `${webGl2 ? "#version 300 es\n" : ""}
  ${webGl2
    ? "#define VARYING_IN in\n#define TEXTURE texture\n#define FRAG_COLOR outputColor"
    : "#define VARYING_IN varying\n#define TEXTURE texture2D\n#define FRAG_COLOR gl_FragColor"}
  precision highp float;
  ${webGl2 ? "out vec4 outputColor;" : ""}

  uniform sampler2D uTextureA;
  uniform sampler2D uTextureB;
  uniform vec2 uImageSizeA;
  uniform vec2 uImageSizeB;
  uniform vec2 uResolution;
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uPointer;
  VARYING_IN vec2 vUv;

  float hash21(vec2 point) {
    vec2 value = fract(point * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    vec2 blend = local * local * (3.0 - 2.0 * local);
    float bottom = mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), blend.x);
    float top = mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0)), blend.x);
    return mix(bottom, top, blend.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * valueNoise(point);
      point = rotation * point * 2.03 + 9.7;
      amplitude *= 0.5;
    }
    return value;
  }

  vec2 coverUv(vec2 uv, vec2 imageSize, vec2 viewportSize) {
    float imageAspect = imageSize.x / max(imageSize.y, 1.0);
    float viewportAspect = viewportSize.x / max(viewportSize.y, 1.0);
    vec2 crop = viewportAspect > imageAspect
      ? vec2(1.0, imageAspect / viewportAspect)
      : vec2(viewportAspect / imageAspect, 1.0);
    return (uv - 0.5) * crop + 0.5;
  }

  void main() {
    float phase = clamp(uProgress, 0.0, 1.0);
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 pointer = uPointer * vec2(aspect, 1.0);
    vec2 plane = (vUv - 0.5) * vec2(aspect, 1.0);
    float time = uTime * 0.16;
    float field = fbm(plane * 2.35 + pointer * 0.12 + vec2(time * 0.16, -time * 0.11));
    float grain = valueNoise(vUv * vec2(9.5 * aspect, 9.5) + vec2(time, phase * 2.1));
    float envelope = sin(phase * 3.14159265);
    float edgePosition = mix(-0.16, 1.16, phase);
    float edge = vUv.x + (field - 0.5) * 0.13;
    float reveal = 1.0 - smoothstep(edgePosition - 0.11, edgePosition + 0.11, edge);
    float beam = exp(-abs(edge - edgePosition) * 32.0) * envelope;
    float displacement = (field - 0.5) * (0.035 + 0.12 * envelope);
    vec2 pointerWarp = pointer * 0.008 * (1.0 - length(plane));

    vec2 uvA = coverUv(vUv + pointerWarp + vec2(displacement * 0.24, displacement + phase * 0.035), uImageSizeA, uResolution);
    vec2 uvB = coverUv(vUv + pointerWarp - vec2(displacement * 0.24, displacement + (1.0 - phase) * 0.035), uImageSizeB, uResolution);
    vec3 colorA = TEXTURE(uTextureA, uvA).rgb;
    vec3 colorB = TEXTURE(uTextureB, uvB).rgb;
    vec3 color = mix(colorA, colorB, reveal);

    vec2 chromaOffset = vec2(0.006 * beam, -0.0025 * beam);
    float spectralRed = mix(TEXTURE(uTextureA, uvA + chromaOffset).r, TEXTURE(uTextureB, uvB + chromaOffset).r, reveal);
    float spectralBlue = mix(TEXTURE(uTextureA, uvA - chromaOffset).b, TEXTURE(uTextureB, uvB - chromaOffset).b, reveal);
    color.r = mix(color.r, spectralRed, beam);
    color.b = mix(color.b, spectralBlue, beam * 0.7);

    float radius = length(plane - pointer * 0.055);
    float angle = atan(plane.y, plane.x);
    float caustic = pow(0.5 + 0.5 * sin(angle * 4.0 - radius * 17.0 + time + field * 5.0), 12.0);
    float orbit = exp(-abs(radius - (0.24 + 0.035 * sin(time * 0.7))) * 28.0);
    float dust = smoothstep(0.82, 1.0, grain) * (0.35 + 0.65 * sin(time * 3.0 + grain * 14.0));
    vec3 amber = vec3(1.0, 0.36, 0.07);
    vec3 warm = vec3(1.0, 0.7, 0.38);
    color += amber * (beam * 0.78 + orbit * caustic * 0.08);
    color += warm * dust * 0.028;

    float vignette = smoothstep(1.05, 0.2, length((vUv - 0.5) * vec2(0.78, 1.0)));
    color *= mix(0.72, 1.04, vignette);
    color = color / (color + vec3(0.18));
    FRAG_COLOR = vec4(color, 1.0);
  }
`;
}

function normalizeIndex(index: number, count: number) {
  if (!count) return -1;
  const integer = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((integer % count) + count) % count;
}

class DisplacementRenderer {
  private gl: GLContext | null = null;
  private webGl2 = false;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private locations: ProgramLocations | null = null;
  private current: TextureRecord | null = null;
  private next: TextureRecord | null = null;
  private currentIndex = -1;
  private desiredIndex: number;
  private progress = { value: 0 };
  private tween: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private raf = 0;
  private ambientRaf = 0;
  private width = 1;
  private height = 1;
  private isVisible = true;
  private startedAt = performance.now();
  private pointer = { x: 0, y: 0 };
  private pointerTarget = { x: 0, y: 0 };
  private requestVersion = 0;
  private disposed = false;
  private contextLost = false;
  private pendingImages = new Set<PendingImage>();
  private preloadedImages = new Map<number, HTMLImageElement>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sources: string[],
    initialIndex: number,
    private readonly onReadyChange: (ready: boolean) => void,
  ) {
    this.desiredIndex = normalizeIndex(initialIndex, sources.length);
  }

  async start() {
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas);
    }
    if (typeof IntersectionObserver !== "undefined") {
      this.intersectionObserver = new IntersectionObserver(this.handleIntersection, { threshold: 0.01 });
      this.intersectionObserver.observe(this.canvas);
    }

    if (!this.setupGpu()) {
      this.enterFallback();
      return;
    }

    this.handleResize();
    await this.loadInitialTexture();
  }

  transitionTo(index: number) {
    if (this.disposed) return;
    this.desiredIndex = normalizeIndex(index, this.sources.length);
    if (this.contextLost || !this.current || this.desiredIndex < 0) return;
    void this.beginTransition();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.requestVersion += 1;
    this.onReadyChange(false);
    this.stopAnimation();
    this.cancelPendingImages();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.releaseGpuResources(!this.contextLost);
    this.gl = null;
  }

  private setupGpu() {
    let gl: GLContext | null = null;
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;

    try {
      const contextAttributes: WebGLContextAttributes = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      };
      const webGl2 = this.canvas.getContext("webgl2", contextAttributes);
      gl = webGl2 ?? this.canvas.getContext("webgl", contextAttributes);
      if (!gl) return false;
      this.webGl2 = Boolean(webGl2);

      vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource(this.webGl2));
      fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource(this.webGl2));
      program = gl.createProgram();
      if (!program) throw new Error("Unable to create WebGL program");

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Unable to link WebGL program");

      buffer = gl.createBuffer();
      if (!buffer) throw new Error("Unable to create WebGL buffer");

      const locations = this.getLocations(gl, program);
      if (!locations) throw new Error("Unable to resolve WebGL program locations");

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 1);

      this.gl = gl;
      this.program = program;
      this.buffer = buffer;
      this.locations = locations;
      return true;
    } catch {
      if (gl && buffer) gl.deleteBuffer(buffer);
      if (gl && program) gl.deleteProgram(program);
      return false;
    } finally {
      if (gl && vertexShader) gl.deleteShader(vertexShader);
      if (gl && fragmentShader) gl.deleteShader(fragmentShader);
    }
  }

  private compileShader(gl: GLContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to create WebGL shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) || "Unknown shader compilation error";
      gl.deleteShader(shader);
      throw new Error(`Unable to compile WebGL shader: ${info}`);
    }
    return shader;
  }

  private getLocations(gl: GLContext, program: WebGLProgram): ProgramLocations | null {
    const position = gl.getAttribLocation(program, "aPosition");
    const textureA = gl.getUniformLocation(program, "uTextureA");
    const textureB = gl.getUniformLocation(program, "uTextureB");
    const imageSizeA = gl.getUniformLocation(program, "uImageSizeA");
    const imageSizeB = gl.getUniformLocation(program, "uImageSizeB");
    const resolution = gl.getUniformLocation(program, "uResolution");
    const progress = gl.getUniformLocation(program, "uProgress");
    const time = gl.getUniformLocation(program, "uTime");
    const pointer = gl.getUniformLocation(program, "uPointer");

    if (
      position < 0 ||
      !textureA ||
      !textureB ||
      !imageSizeA ||
      !imageSizeB ||
      !resolution ||
      !progress ||
      !time ||
      !pointer
    ) {
      return null;
    }

    return { position, textureA, textureB, imageSizeA, imageSizeB, resolution, progress, time, pointer };
  }

  private async loadInitialTexture() {
    while (!this.disposed && !this.contextLost && this.desiredIndex >= 0) {
      const index = this.desiredIndex;
      let texture: TextureRecord;

      try {
        texture = await this.loadTexture(index);
      } catch (error) {
        if (error !== LOAD_CANCELLED && !this.disposed && !this.contextLost) this.enterFallback();
        return;
      }

      if (this.disposed || this.contextLost) {
        this.deleteTexture(texture);
        return;
      }
      if (index !== this.desiredIndex) {
        this.deleteTexture(texture);
        continue;
      }

      this.current = texture;
      this.currentIndex = index;
      this.progress.value = 0;
      this.draw();
      this.onReadyChange(true);
      this.startAmbient();
      this.preloadSources();
      return;
    }
  }

  private async beginTransition() {
    this.interruptTransition();
    const targetIndex = this.desiredIndex;
    if (targetIndex < 0 || targetIndex === this.currentIndex || !this.current) {
      this.scheduleDraw();
      return;
    }

    const version = ++this.requestVersion;
    let target: TextureRecord;
    try {
      target = await this.loadTexture(targetIndex);
    } catch (error) {
      if (
        error !== LOAD_CANCELLED &&
        version === this.requestVersion &&
        !this.disposed &&
        !this.contextLost
      ) {
        this.enterFallback();
      }
      return;
    }

    if (
      this.disposed ||
      this.contextLost ||
      version !== this.requestVersion ||
      targetIndex !== this.desiredIndex
    ) {
      this.deleteTexture(target);
      return;
    }

    this.next = target;
    this.progress.value = 0;
    const startedAt = performance.now();
    const animate = (time: number) => {
      if (this.disposed || this.contextLost || version !== this.requestVersion) return;
      const elapsed = Math.min(1, (time - startedAt) / 1000);
      this.progress.value = elapsed < 0.5
        ? 4 * elapsed * elapsed * elapsed
        : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
      this.scheduleDraw();
      if (elapsed < 1) this.tween = requestAnimationFrame(animate);
      else {
        this.tween = null;
        this.completeTransition(targetIndex);
      }
    };
    this.tween = requestAnimationFrame(animate);
  }

  private completeTransition(targetIndex: number) {
    if (!this.current || !this.next || this.disposed || this.contextLost) return;
    this.deleteTexture(this.current);
    this.current = this.next;
    this.next = null;
    this.currentIndex = targetIndex;
    this.progress.value = 0;
    this.tween = null;
    this.draw();

    if (this.desiredIndex !== this.currentIndex) void this.beginTransition();
  }

  private interruptTransition() {
    this.requestVersion += 1;
    this.cancelPendingImages();
    if (this.tween !== null) cancelAnimationFrame(this.tween);
    this.tween = null;

    if (!this.current || !this.next) {
      this.progress.value = 0;
      return;
    }

    if (this.progress.value >= 0.5) {
      this.deleteTexture(this.current);
      this.current = this.next;
      this.currentIndex = this.next.index;
    } else {
      this.deleteTexture(this.next);
    }
    this.next = null;
    this.progress.value = 0;
    this.draw();
  }

  private async loadTexture(index: number) {
    const image = this.preloadedImages.get(index) ?? await this.loadImage(this.sources[index]);
    this.preloadedImages.set(index, image);
    if (!this.gl || this.contextLost || this.disposed) throw LOAD_CANCELLED;

    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Unable to create WebGL texture");

    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return {
        texture,
        width: image.naturalWidth,
        height: image.naturalHeight,
        index,
      };
    } catch (error) {
      gl.deleteTexture(texture);
      throw error;
    }
  }

  private loadImage(source: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";

      let settled = false;
      const finish = () => {
        image.onload = null;
        image.onerror = null;
        this.pendingImages.delete(pending);
      };
      const pending: PendingImage = {
        image,
        cancel: () => {
          if (settled) return;
          settled = true;
          finish();
          reject(LOAD_CANCELLED);
        },
      };

      image.onload = () => {
        if (settled) return;
        settled = true;
        finish();
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error("Image has no dimensions"));
          return;
        }
        resolve(image);
      };
      image.onerror = () => {
        if (settled) return;
        settled = true;
        finish();
        reject(new Error("Unable to load WebGL texture image"));
      };

      this.pendingImages.add(pending);
      image.src = source;
    });
  }

  private draw = (timestamp = performance.now()) => {
    const gl = this.gl;
    const current = this.current;
    const next = this.next ?? current;
    const program = this.program;
    const buffer = this.buffer;
    const locations = this.locations;
    if (
      !gl ||
      !current ||
      !next ||
      !program ||
      !buffer ||
      !locations ||
      this.disposed ||
      this.contextLost
    ) {
      return;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, current.texture);
    gl.uniform1i(locations.textureA, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, next.texture);
    gl.uniform1i(locations.textureB, 1);
    gl.uniform2f(locations.imageSizeA, current.width, current.height);
    gl.uniform2f(locations.imageSizeB, next.width, next.height);
    gl.uniform2f(locations.resolution, this.width, this.height);
    gl.uniform1f(locations.progress, this.next ? this.progress.value : 0);
    gl.uniform1f(locations.time, Math.max(0, timestamp - this.startedAt) / 1000);
    gl.uniform2f(locations.pointer, this.pointer.x, this.pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  private scheduleDraw = () => {
    if (this.raf || this.disposed || this.contextLost) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw(performance.now());
    });
  };

  private handleResize = () => {
    if (this.disposed || this.contextLost) return;
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const pixelBudgetDpr = Math.sqrt(MAX_BACKING_PIXELS / Math.max(1, width * height));
    const dpr = Math.max(0.65, Math.min(MAX_DPR, window.devicePixelRatio || 1, pixelBudgetDpr));
    const backingWidth = Math.max(1, Math.round(width * dpr));
    const backingHeight = Math.max(1, Math.round(height * dpr));

    this.width = width;
    this.height = height;
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    this.scheduleDraw();
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    if (this.disposed) return;
    this.contextLost = true;
    this.requestVersion += 1;
    this.onReadyChange(false);
    this.stopAnimation();
    this.cancelPendingImages();
    this.current = null;
    this.next = null;
    this.currentIndex = -1;
    this.program = null;
    this.buffer = null;
    this.locations = null;
    this.gl = null;
  };

  private handleContextRestored = () => {
    if (this.disposed) return;
    this.contextLost = false;
    this.progress.value = 0;
    if (!this.setupGpu()) {
      this.enterFallback();
      return;
    }
    this.handleResize();
    void this.loadInitialTexture();
  };

  private stopAnimation() {
    if (this.tween !== null) cancelAnimationFrame(this.tween);
    this.tween = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.ambientRaf) cancelAnimationFrame(this.ambientRaf);
    this.ambientRaf = 0;
    this.progress.value = 0;
  }

  private startAmbient = () => {
    if (
      this.ambientRaf ||
      this.disposed ||
      this.contextLost ||
      !this.current ||
      !this.isVisible ||
      document.hidden
    ) {
      return;
    }
    const render = (timestamp: number) => {
      if (this.disposed || this.contextLost || !this.isVisible || document.hidden) {
        this.ambientRaf = 0;
        return;
      }
      this.pointer.x += (this.pointerTarget.x - this.pointer.x) * 0.055;
      this.pointer.y += (this.pointerTarget.y - this.pointer.y) * 0.055;
      this.draw(timestamp);
      this.ambientRaf = requestAnimationFrame(render);
    };
    this.ambientRaf = requestAnimationFrame(render);
  };

  private handlePointerMove = (event: PointerEvent) => {
    this.pointerTarget.x = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    this.pointerTarget.y = 1 - (event.clientY / Math.max(1, window.innerHeight)) * 2;
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      if (this.ambientRaf) cancelAnimationFrame(this.ambientRaf);
      this.ambientRaf = 0;
      return;
    }
    this.startAmbient();
  };

  private handleIntersection: IntersectionObserverCallback = (entries) => {
    this.isVisible = entries[0]?.isIntersecting ?? true;
    if (!this.isVisible) {
      if (this.ambientRaf) cancelAnimationFrame(this.ambientRaf);
      this.ambientRaf = 0;
      return;
    }
    this.startAmbient();
  };

  private preloadSources() {
    this.sources.forEach((source, index) => {
      if (this.preloadedImages.has(index)) return;
      void this.loadImage(source)
        .then((image) => {
          if (!this.disposed) this.preloadedImages.set(index, image);
        })
        .catch(() => undefined);
    });
  }

  private cancelPendingImages() {
    for (const pending of [...this.pendingImages]) pending.cancel();
    this.pendingImages.clear();
  }

  private deleteTexture(record: TextureRecord | null) {
    if (record && this.gl && !this.contextLost) this.gl.deleteTexture(record.texture);
  }

  private releaseGpuResources(deleteResources: boolean) {
    if (deleteResources && this.gl) {
      this.deleteTexture(this.current);
      this.deleteTexture(this.next);
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.current = null;
    this.next = null;
    this.currentIndex = -1;
    this.buffer = null;
    this.program = null;
    this.locations = null;
    this.preloadedImages.clear();
  }

  private enterFallback() {
    this.dispose();
  }
}

export function HeroDisplacementCanvas({
  images,
  activeIndex,
  className,
}: HeroDisplacementCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DisplacementRenderer | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [readySourceKey, setReadySourceKey] = useState<string | null>(null);
  const sourceKey = images.filter(Boolean).join(IMAGE_KEY_SEPARATOR);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 1100px), (hover: none), (pointer: coarse)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: (type: "change", listener: () => void) => void; removeEventListener?: (type: "change", listener: () => void) => void } }).connection;
    const updatePreference = () => {
      const allowed = !query.matches && connection?.saveData !== true;
      setMotionAllowed(allowed);
      if (!allowed) setReadySourceKey(null);
    };
    updatePreference();
    query.addEventListener("change", updatePreference);
    connection?.addEventListener?.("change", updatePreference);
    return () => {
      query.removeEventListener("change", updatePreference);
      connection?.removeEventListener?.("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    rendererRef.current?.transitionTo(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sources = sourceKey ? sourceKey.split(IMAGE_KEY_SEPARATOR) : [];
    if (!canvas || !motionAllowed || !sources.length) return;

    let mounted = true;
    const renderer = new DisplacementRenderer(canvas, sources, activeIndexRef.current, (nextReady) => {
      if (!mounted) return;
      setReadySourceKey((current) => {
        if (nextReady) return sourceKey;
        return current === sourceKey ? null : current;
      });
    });
    rendererRef.current = renderer;
    void renderer.start();

    return () => {
      mounted = false;
      if (rendererRef.current === renderer) rendererRef.current = null;
      renderer.dispose();
    };
  }, [motionAllowed, sourceKey]);

  const ready = motionAllowed && readySourceKey === sourceKey;
  const classes = [styles.canvas, ready ? styles.ready : "", className].filter(Boolean).join(" ");

  return (
    <canvas
      ref={canvasRef}
      className={classes}
      aria-hidden="true"
      tabIndex={-1}
      data-webgl-hero=""
    />
  );
}
