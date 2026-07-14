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

type ProgramLocations = {
  position: number;
  textureA: WebGLUniformLocation;
  textureB: WebGLUniformLocation;
  imageSizeA: WebGLUniformLocation;
  imageSizeB: WebGLUniformLocation;
  resolution: WebGLUniformLocation;
  progress: WebGLUniformLocation;
};

type PendingImage = {
  image: HTMLImageElement;
  cancel: () => void;
};

const MAX_DPR = 2;
const IMAGE_KEY_SEPARATOR = "\u001f";
const LOAD_CANCELLED = Symbol("load-cancelled");

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTextureA;
  uniform sampler2D uTextureB;
  uniform vec2 uImageSizeA;
  uniform vec2 uImageSizeB;
  uniform vec2 uResolution;
  uniform float uProgress;
  varying vec2 vUv;

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
    float grain = valueNoise(vUv * vec2(6.5 * aspect, 6.5) + vec2(0.0, phase * 1.7));
    float envelope = sin(phase * 3.14159265);
    float displacement = (grain - 0.5) * 0.18 * envelope;

    vec2 uvA = coverUv(vUv + vec2(0.0, displacement + phase * 0.08), uImageSizeA, uResolution);
    vec2 uvB = coverUv(vUv + vec2(0.0, displacement - (1.0 - phase) * 0.08), uImageSizeB, uResolution);
    vec4 colorA = texture2D(uTextureA, uvA);
    vec4 colorB = texture2D(uTextureB, uvB);

    gl_FragColor = mix(colorA, colorB, phase);
  }
`;

function normalizeIndex(index: number, count: number) {
  if (!count) return -1;
  const integer = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((integer % count) + count) % count;
}

class DisplacementRenderer {
  private gl: WebGLRenderingContext | null = null;
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
  private raf = 0;
  private width = 1;
  private height = 1;
  private requestVersion = 0;
  private disposed = false;
  private contextLost = false;
  private pendingImages = new Set<PendingImage>();

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

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas);
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
    window.removeEventListener("resize", this.handleResize);
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.releaseGpuResources(!this.contextLost);
    this.gl = null;
  }

  private setupGpu() {
    let gl: WebGLRenderingContext | null = null;
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;

    try {
      gl = this.canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "default",
      });
      if (!gl) return false;

      vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
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

  private compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to create WebGL shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Unable to compile WebGL shader");
    }
    return shader;
  }

  private getLocations(gl: WebGLRenderingContext, program: WebGLProgram): ProgramLocations | null {
    const position = gl.getAttribLocation(program, "aPosition");
    const textureA = gl.getUniformLocation(program, "uTextureA");
    const textureB = gl.getUniformLocation(program, "uTextureB");
    const imageSizeA = gl.getUniformLocation(program, "uImageSizeA");
    const imageSizeB = gl.getUniformLocation(program, "uImageSizeB");
    const resolution = gl.getUniformLocation(program, "uResolution");
    const progress = gl.getUniformLocation(program, "uProgress");

    if (
      position < 0 ||
      !textureA ||
      !textureB ||
      !imageSizeA ||
      !imageSizeB ||
      !resolution ||
      !progress
    ) {
      return null;
    }

    return { position, textureA, textureB, imageSizeA, imageSizeB, resolution, progress };
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
    const image = await this.loadImage(this.sources[index]);
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

  private draw = () => {
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
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  private scheduleDraw = () => {
    if (this.raf || this.disposed || this.contextLost) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  };

  private handleResize = () => {
    if (this.disposed || this.contextLost) return;
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const dpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
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
    this.progress.value = 0;
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
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      const allowed = !query.matches;
      setMotionAllowed(allowed);
      if (!allowed) setReadySourceKey(null);
    };
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
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
