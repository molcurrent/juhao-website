"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./LightFieldCanvas.module.css";

type LightFieldVariant = "product" | "space" | "case";

type LightFieldCanvasProps = {
  className?: string;
  mode?: number;
  variant: LightFieldVariant;
};

const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 out_color;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_variant;
uniform float u_mode;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + 13.7;
    amplitude *= 0.5;
  }
  return value;
}

float lineMask(float distanceToLine, float width) {
  return 1.0 - smoothstep(width, width * 2.4, abs(distanceToLine));
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 pointer = (u_pointer - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.13;
  float grain = fbm(p * 3.7 + vec2(t, -t * 0.72));
  float pulse = 0.88 + 0.12 * sin(u_time * 0.55 + grain * 3.4);

  vec3 warm = vec3(1.0, 0.28, 0.055);
  vec3 amber = vec3(1.0, 0.58, 0.22);
  vec3 cool = vec3(0.42, 0.68, 1.0);
  float modeMix = clamp(u_mode * 0.5, 0.0, 1.0);
  vec3 modeColor = mix(warm, mix(amber, cool, step(1.5, u_mode)), modeMix * 0.55);

  float alpha = 0.0;
  vec3 color = modeColor;

  if (u_variant < 0.5) {
    vec2 lensCenter = mix(vec2(-0.05, 0.03), pointer, 0.42);
    float radius = length(p - lensCenter);
    float aperture = lineMask(radius - 0.22, 0.006) + lineMask(radius - 0.34, 0.004) * 0.45;
    float cross = lineMask(p.x - lensCenter.x, 0.0018) + lineMask(p.y - lensCenter.y, 0.0018);
    vec2 beamDirection = normalize(vec2(0.58, 0.82));
    vec2 beamNormal = vec2(-beamDirection.y, beamDirection.x);
    float beamDistance = dot(p + vec2(0.48, 0.42), beamNormal);
    float beamTravel = dot(p + vec2(0.48, 0.42), beamDirection);
    float beam = lineMask(beamDistance, 0.095 + grain * 0.035)
      * smoothstep(-0.15, 0.55, beamTravel)
      * (1.0 - smoothstep(0.5, 1.2, beamTravel));
    float spectral = lineMask(beamDistance - 0.018, 0.008) * 0.3;
    alpha = aperture * 0.22 + cross * 0.055 + beam * 0.23 * pulse + spectral;
    color = mix(modeColor, vec3(1.0, 0.72, 0.42), aperture);
  } else if (u_variant < 1.5) {
    vec2 source = mix(vec2(-0.58, -0.46), pointer, 0.28);
    vec2 ray = p - source;
    float angle = atan(ray.y, ray.x);
    float targetAngle = 0.72 + (u_mode - 1.0) * 0.16;
    float cone = 1.0 - smoothstep(0.12, 0.42, abs(angle - targetAngle));
    float distanceFade = smoothstep(0.02, 0.22, length(ray)) * (1.0 - smoothstep(0.45, 1.45, length(ray)));
    float haze = cone * distanceFade * (0.52 + grain * 0.48);
    float edge = lineMask(abs(angle - targetAngle) - 0.25, 0.018) * distanceFade;
    float pool = 1.0 - smoothstep(0.0, 0.42, length(p - vec2(0.25 + 0.08 * u_mode, -0.2)));
    alpha = haze * 0.28 * pulse + edge * 0.12 + pool * 0.08;
    color = mix(modeColor, vec3(1.0, 0.76, 0.46), grain * 0.35);
  } else {
    float scanPosition = fract(t * 0.34 + 0.22);
    float scan = lineMask(uv.x - scanPosition, 0.004);
    float afterglow = 1.0 - smoothstep(0.0, 0.18, scanPosition - uv.x);
    float horizontalGrid = lineMask(fract(uv.y * 12.0) - 0.5, 0.012);
    float verticalGrid = lineMask(fract(uv.x * 12.0) - 0.5, 0.012);
    float target = 1.0 - smoothstep(0.0, 0.12, length(p - pointer));
    alpha = scan * 0.34 + afterglow * 0.07 * grain + (horizontalGrid + verticalGrid) * 0.022 + target * 0.09;
    color = mix(warm, amber, grain);
  }

  alpha *= smoothstep(0.0, 0.12, uv.x) * smoothstep(0.0, 0.1, uv.y)
    * smoothstep(0.0, 0.12, 1.0 - uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.y);
  out_color = vec4(color, clamp(alpha, 0.0, 0.48));
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
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

export function LightFieldCanvas({ className, mode = 0, variant }: LightFieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const [contextVersion, setContextVersion] = useState(0);
  const [renderEnabled, setRenderEnabled] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactPointer = window.matchMedia("(max-width: 700px), (pointer: coarse)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const updateRenderCapability = () => {
      setRenderEnabled(!reducedMotion.matches && !compactPointer.matches && !connection?.saveData);
    };

    updateRenderCapability();
    reducedMotion.addEventListener("change", updateRenderCapability);
    compactPointer.addEventListener("change", updateRenderCapability);
    return () => {
      reducedMotion.removeEventListener("change", updateRenderCapability);
      compactPointer.removeEventListener("change", updateRenderCapability);
    };
  }, []);

  useEffect(() => {
    const maybeCanvas = canvasRef.current;
    const maybeHost = maybeCanvas?.parentElement;
    if (!maybeCanvas || !maybeHost || !renderEnabled) return;
    const canvas = maybeCanvas;
    const host = maybeHost;

    const maybeGl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    if (!maybeGl) return;
    const gl = maybeGl;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const variantLocation = gl.getUniformLocation(program, "u_variant");
    const modeLocation = gl.getUniformLocation(program, "u_mode");

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const pointer = { x: 0.58, y: 0.44 };
    const targetPointer = { ...pointer };
    const variantValue = variant === "product" ? 0 : variant === "space" ? 1 : 2;
    let frame = 0;
    let visible = true;
    let destroyed = false;
    let lastDrawnAt = 0;

    function resize() {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const requestedDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelBudgetDpr = Math.sqrt(4_000_000 / (rect.width * rect.height));
      const dpr = Math.min(requestedDpr, pixelBudgetDpr);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    function draw(now: number) {
      frame = 0;
      if (destroyed || !visible || document.hidden || gl.isContextLost()) return;
      if (now - lastDrawnAt < 1000 / 60) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawnAt = now;
      pointer.x += (targetPointer.x - pointer.x) * 0.055;
      pointer.y += (targetPointer.y - pointer.y) * 0.055;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.uniform1f(timeLocation, now / 1000);
      gl.uniform1f(variantLocation, variantValue);
      gl.uniform1f(modeLocation, Math.max(0, Math.min(modeRef.current, 2)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frame = window.requestAnimationFrame(draw);
    }

    function start() {
      if (!frame && !destroyed && visible && !document.hidden) frame = window.requestAnimationFrame(draw);
    }

    function onPointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      targetPointer.x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      targetPointer.y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) start();
      else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { rootMargin: "120px 0px", threshold: 0.01 });
    const onVisibilityChange = () => start();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const onContextRestored = () => setContextVersion((value) => value + 1);

    resizeObserver.observe(host);
    intersectionObserver.observe(canvas);
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    resize();
    start();

    return () => {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [contextVersion, renderEnabled, variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`${styles.canvas}${className ? ` ${className}` : ""}`}
      data-light-field={variant}
      tabIndex={-1}
    />
  );
}
