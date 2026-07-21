"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./CatalogAmbientFieldCanvas.module.css";

type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

const MAX_DPR = 1.25;
const MAX_BACKING_PIXELS = 1_500_000;
const MAX_FPS = 30;

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
    ? "#define VARYING_IN in\n#define FRAG_COLOR outputColor"
    : "#define VARYING_IN varying\n#define FRAG_COLOR gl_FragColor"}
  precision highp float;
  ${webGl2 ? "out vec4 outputColor;" : ""}

  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
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
      point = rotation * point * 2.03 + 7.9;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 plane = (vUv - 0.5) * vec2(aspect, 1.0);
    vec2 pointer = (uPointer - 0.5) * vec2(aspect, 1.0);
    float time = uTime * 0.085;
    float field = fbm(plane * 2.7 + pointer * 0.16 + vec2(time, -time * 0.72));

    vec2 amberCenter = vec2(-0.38, -0.28) + pointer * 0.12;
    vec2 silverCenter = vec2(0.43, 0.25) - pointer * 0.08;
    float amberDistance = length(plane - amberCenter);
    float silverDistance = length(plane - silverCenter);
    float amberPool = exp(-amberDistance * (3.5 + field * 1.4));
    float silverPool = exp(-silverDistance * (4.4 - field * 0.8));

    float orbitRadius = 0.34 + sin(time * 1.7) * 0.018;
    float orbit = exp(-abs(silverDistance - orbitRadius) * 34.0);
    float veil = smoothstep(0.72, 0.2, abs(plane.y + plane.x * 0.16 - (field - 0.5) * 0.2));
    float grain = smoothstep(0.84, 1.0, valueNoise(vUv * vec2(70.0 * aspect, 70.0) + time));

    vec3 charcoal = vec3(0.055, 0.056, 0.052);
    vec3 silver = vec3(0.72, 0.74, 0.75);
    vec3 amber = vec3(1.0, 0.285, 0.075);
    vec3 color = charcoal;
    color += amber * amberPool * (0.42 + field * 0.16);
    color += silver * silverPool * 0.19;
    color += mix(amber, silver, field) * orbit * 0.09;
    color += silver * veil * 0.035;
    color += silver * grain * 0.018;

    float edgeFade = smoothstep(0.0, 0.18, vUv.x)
      * smoothstep(0.0, 0.18, 1.0 - vUv.x)
      * smoothstep(0.0, 0.15, vUv.y)
      * smoothstep(0.0, 0.15, 1.0 - vUv.y);
    float alpha = clamp((amberPool * 0.62 + silverPool * 0.34 + orbit * 0.18 + veil * 0.08) * edgeFade, 0.0, 0.78);
    FRAG_COLOR = vec4(color, alpha);
  }
`;
}

function compileShader(gl: GLContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function CatalogAmbientFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderEnabled, setRenderEnabled] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const capability = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-width: 1100px), (hover: none), (pointer: coarse)",
    );
    const connection = (
      navigator as Navigator & {
        connection?: {
          saveData?: boolean;
          addEventListener?: (type: "change", listener: () => void) => void;
          removeEventListener?: (type: "change", listener: () => void) => void;
        };
      }
    ).connection;
    const updateCapability = () => {
      const enabled = !capability.matches && connection?.saveData !== true;
      setRenderEnabled(enabled);
      if (!enabled) setReady(false);
    };

    updateCapability();
    capability.addEventListener("change", updateCapability);
    connection?.addEventListener?.("change", updateCapability);
    return () => {
      capability.removeEventListener("change", updateCapability);
      connection?.removeEventListener?.("change", updateCapability);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host || !renderEnabled) return;

    let mounted = true;
    setReady(false);
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    };
    const webGl2 = canvas.getContext("webgl2", contextAttributes);
    const gl = webGl2 ?? canvas.getContext("webgl", contextAttributes);
    if (!gl) return;

    const vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      vertexShaderSource(Boolean(webGl2)),
    );
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource(Boolean(webGl2)),
    );
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (program) gl.deleteProgram(program);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, "aPosition");
    const resolution = gl.getUniformLocation(program, "uResolution");
    const pointerLocation = gl.getUniformLocation(program, "uPointer");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    if (position < 0 || !resolution || !pointerLocation || !timeLocation) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const pointer = { x: 0.48, y: 0.52 };
    const pointerTarget = { ...pointer };
    let frame = 0;
    let visible = true;
    let destroyed = false;
    let lastDrawnAt = 0;
    let readyAnnounced = false;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const budgetDpr = Math.sqrt(
        MAX_BACKING_PIXELS / Math.max(1, bounds.width * bounds.height),
      );
      const dpr = Math.max(
        0.65,
        Math.min(MAX_DPR, window.devicePixelRatio || 1, budgetDpr),
      );
      const width = Math.max(1, Math.round(bounds.width * dpr));
      const height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const draw = (now: number) => {
      frame = 0;
      if (destroyed || !visible || document.hidden || gl.isContextLost()) return;
      if (now - lastDrawnAt < 1000 / MAX_FPS) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawnAt = now;
      pointer.x += (pointerTarget.x - pointer.x) * 0.055;
      pointer.y += (pointerTarget.y - pointer.y) * 0.055;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.uniform1f(timeLocation, now / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!readyAnnounced) {
        readyAnnounced = true;
        if (mounted) setReady(true);
      }
      frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frame && !destroyed && visible && !document.hidden) {
        frame = window.requestAnimationFrame(draw);
      }
    };
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return;
      }
      pointerTarget.x =
        (event.clientX - bounds.left) / Math.max(1, bounds.width);
      pointerTarget.y =
        1 - (event.clientY - bounds.top) / Math.max(1, bounds.height);
    };
    const handleVisibilityChange = () => {
      if (document.hidden && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      start();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setReady(false);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const handleContextRestored = () => {
      if (mounted) setContextVersion((value) => value + 1);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    const intersectionObserver =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              visible = entry?.isIntersecting ?? true;
              if (visible) start();
              else if (frame) {
                window.cancelAnimationFrame(frame);
                frame = 0;
              }
            },
            { rootMargin: "120px 0px", threshold: 0.01 },
          );

    resizeObserver?.observe(host);
    intersectionObserver?.observe(canvas);
    host.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    resize();
    start();

    return () => {
      mounted = false;
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      host.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      if (!gl.isContextLost()) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    };
  }, [contextVersion, renderEnabled]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`${styles.canvas}${ready ? ` ${styles.ready}` : ""}`}
      data-catalog-ambient-field=""
      tabIndex={-1}
    />
  );
}
