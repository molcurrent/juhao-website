"use client";

import {
  Children,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type TouchEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./AccessibleCarousel.module.css";

export type AccessibleCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  loop?: boolean;
};

type TouchPoint = { x: number; y: number };

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getVisibilitySnapshot() {
  return !document.hidden;
}

function normaliseIndex(index: number, slideCount: number, loop: boolean) {
  if (slideCount < 1 || !Number.isFinite(index)) return 0;
  const integer = Math.trunc(index);

  if (loop) return ((integer % slideCount) + slideCount) % slideCount;
  return Math.min(Math.max(integer, 0), slideCount - 1);
}

export function AccessibleCarousel({
  children,
  ariaLabel = "内容轮播",
  className,
  index,
  defaultIndex = 0,
  onIndexChange,
  autoPlay = false,
  autoPlayInterval = 5_000,
  loop = true,
}: AccessibleCarouselProps) {
  const slides = Children.toArray(children);
  const slideCount = slides.length;
  const isControlled = index !== undefined;
  const [internalIndex, setInternalIndex] = useState(() =>
    normaliseIndex(defaultIndex, slideCount, loop),
  );
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [touching, setTouching] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const touchStart = useRef<TouchPoint | null>(null);
  const viewportId = useId();
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
  const pageVisible = useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    () => true,
  );
  const selectedIndex = normaliseIndex(
    isControlled ? index : internalIndex,
    slideCount,
    false,
  );
  const canGoPrevious = slideCount > 1 && (loop || selectedIndex > 0);
  const canGoNext = slideCount > 1 && (loop || selectedIndex < slideCount - 1);
  const isPlaying =
    autoPlay &&
    !manuallyPaused &&
    !reducedMotion &&
    !hovered &&
    !focusWithin &&
    !touching &&
    pageVisible &&
    canGoNext;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (slideCount < 1) return;
      const next = normaliseIndex(nextIndex, slideCount, loop);
      if (next === selectedIndex) return;
      if (!isControlled) setInternalIndex(next);
      onIndexChange?.(next);
    },
    [isControlled, loop, onIndexChange, selectedIndex, slideCount],
  );

  const goPrevious = useCallback(
    () => goTo(selectedIndex - 1),
    [goTo, selectedIndex],
  );
  const goNext = useCallback(
    () => goTo(selectedIndex + 1),
    [goTo, selectedIndex],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const delay = Number.isFinite(autoPlayInterval)
      ? Math.max(1_000, autoPlayInterval)
      : 5_000;
    const timer = window.setTimeout(goNext, delay);
    return () => window.clearTimeout(timer);
  }, [autoPlayInterval, goNext, isPlaying]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(slideCount - 1);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setFocusWithin(false);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      setTouching(false);
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setTouching(true);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    setTouching(false);
    if (!start || !touch || slideCount < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const threshold = Math.max(36, event.currentTarget.clientWidth * 0.08);
    if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    if (event.cancelable) event.preventDefault();
    if (deltaX > 0) goPrevious();
    else goNext();
  };

  if (slideCount < 1) return null;

  const trackStyle = {
    transform: `translate3d(-${selectedIndex * 100}%, 0, 0)`,
  } satisfies CSSProperties;
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;
  const status = `第 ${selectedIndex + 1} 张，共 ${slideCount} 张`;

  return (
    <div
      className={rootClassName}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={handleBlur}
    >
      <div
        className={styles.viewport}
        id={viewportId}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStart.current = null;
          setTouching(false);
        }}
      >
        <div className={styles.track} style={trackStyle}>
          {slides.map((slide, slideIndex) => {
            const active = slideIndex === selectedIndex;
            return (
              <div
                className={styles.slide}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} / ${slideCount}`}
                aria-hidden={!active}
                inert={!active}
                key={slideIndex}
              >
                {slide}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.pagination} role="group" aria-label="选择轮播页">
          {slides.map((_, slideIndex) => {
            const active = slideIndex === selectedIndex;
            return (
              <button
                className={styles.pageButton}
                type="button"
                aria-controls={viewportId}
                aria-label={`转到第 ${slideIndex + 1} 张`}
                aria-current={active ? "true" : undefined}
                onClick={() => goTo(slideIndex)}
                key={slideIndex}
              >
                <span aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <span className={styles.counter} aria-hidden="true">
            {String(selectedIndex + 1).padStart(2, "0")}
            <i>/</i>
            {String(slideCount).padStart(2, "0")}
          </span>
          {autoPlay && !reducedMotion && (
            <button
              className={styles.controlButton}
              type="button"
              aria-label={manuallyPaused ? "继续自动播放" : "暂停自动播放"}
              aria-pressed={manuallyPaused}
              onClick={() => setManuallyPaused((paused) => !paused)}
            >
              <span aria-hidden="true">{manuallyPaused ? "▶" : "Ⅱ"}</span>
            </button>
          )}
          <button
            className={styles.controlButton}
            type="button"
            aria-controls={viewportId}
            aria-label="上一张"
            disabled={!canGoPrevious}
            onClick={goPrevious}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            className={styles.controlButton}
            type="button"
            aria-controls={viewportId}
            aria-label="下一张"
            disabled={!canGoNext}
            onClick={goNext}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <span
        className={styles.srOnly}
        aria-live={isPlaying ? "off" : "polite"}
        aria-atomic="true"
      >
        {status}
      </span>
    </div>
  );
}
