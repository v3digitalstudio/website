"use client";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { burstGlitch } from "./glitch";
import { useReducedMotion } from "./use-reduced-motion";

// A new wheel gesture starts after this much quiet, or when the delta jumps (a fresh flick during momentum).
const GESTURE_GAP_MS = 180;
const GESTURE_THRESHOLD_PX = 28;
const SWIPE_MIN_PX = 48;
const TOUCH_IGNORE = "input, textarea, canvas, .sd-app, .labs-cmd";

export function useCarousel(ids: readonly string[]) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tearRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(0);
  const reduce = useReducedMotion();
  const reduceRef = useRef(reduce);
  const indexRef = useRef(0);
  const animating = useRef(false);

  useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  const go = useCallback(
    (target: number, instant = false) => {
      const track = trackRef.current;
      if (!track) return;
      const next = Math.max(0, Math.min(ids.length - 1, target));
      if (next === indexRef.current && !instant) return;
      const direction = Math.sign(next - indexRef.current) || 1;
      indexRef.current = next;
      setIndex(next);
      try {
        const hash = next === 0 ? "" : `#${ids[next]}`;
        history.replaceState(
          history.state,
          "",
          `${location.pathname}${location.search}${hash}`,
        );
      } catch {
        // History can be unavailable in sandboxed previews; the hash is a convenience.
      }
      const xPercent = (-100 * next) / ids.length;
      const slide = track.children[next] as HTMLElement | undefined;
      if (instant || reduceRef.current) {
        gsap.killTweensOf(track);
        gsap.set(track, { xPercent });
        animating.current = false;
        setSettled(next);
        return;
      }
      animating.current = true;
      const timeline = gsap
        .timeline({
          onComplete: () => {
            animating.current = false;
            setSettled(next);
          },
        })
        .to(track, { xPercent, duration: 1.05, ease: "expo.inOut" }, 0);
      const layers = slide?.querySelectorAll<HTMLElement>("[data-par]");
      if (layers?.length) {
        timeline.fromTo(
          layers,
          {
            x: (_: number, el: HTMLElement) =>
              direction * Number(el.dataset["par"]),
          },
          { x: 0, duration: 1.3, ease: "expo.out" },
          0.2,
        );
      }
      for (const bar of tearRef.current?.children ?? []) {
        gsap.set(bar, {
          top: `${Math.random() * 100}%`,
          height: 2 + Math.random() * 14,
          x: 0,
        });
        gsap
          .timeline({ delay: 0.25 + Math.random() * 0.3 })
          .to(bar, {
            opacity: 0.12 + Math.random() * 0.25,
            x: direction * (20 + Math.random() * 80),
            duration: 0.08,
          })
          .to(bar, { opacity: 0, duration: 0.12 });
      }
      burstGlitch(
        slide?.querySelector(
          ".labs-product.glitch, .labs-product .glitch, .glitch-img",
        ) ?? null,
      );
    },
    [ids],
  );

  // Open on the slide named in the hash, without animating.
  useEffect(() => {
    const start = ids.indexOf(location.hash.slice(1));
    if (start > 0) go(start, true);
  }, [ids, go]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    let lastWheel = 0;
    let lastAbs = 0;
    let accumulated = 0;
    let spent = false;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      let delta = horizontal ? event.deltaX : event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      const now = performance.now();
      const abs = Math.abs(delta);
      const fresh = now - lastWheel > GESTURE_GAP_MS || abs > lastAbs * 1.8 + 6;
      lastWheel = now;
      lastAbs = abs;
      const slide = track.children[indexRef.current] as HTMLElement | undefined;
      if (!horizontal && slide && slide.scrollHeight > slide.clientHeight + 2) {
        const atTop = slide.scrollTop <= 0;
        const atBottom =
          slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 2;
        if ((delta > 0 && !atBottom) || (delta < 0 && !atTop)) {
          spent = true;
          return;
        }
      }
      event.preventDefault();
      if (animating.current) return;
      if (fresh) {
        accumulated = 0;
        spent = false;
      }
      if (spent) return;
      accumulated += delta;
      if (Math.abs(accumulated) >= GESTURE_THRESHOLD_PX) {
        spent = true;
        go(indexRef.current + Math.sign(accumulated));
      }
    };

    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      tracking = !(event.target as Element).closest(TOUCH_IGNORE);
      startX = touch.clientX;
      startY = touch.clientY;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!tracking || !touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.3) {
        go(indexRef.current + (dx < 0 ? 1 : -1));
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (document.querySelector("dialog[open]")) return;
      const key = event.key;
      if (
        ["ArrowRight", "ArrowDown", "PageDown"].includes(key) ||
        (key === " " && !target.closest("button, a"))
      ) {
        event.preventDefault();
        go(indexRef.current + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(key)) {
        event.preventDefault();
        go(indexRef.current - 1);
      } else if (key === "Home") {
        event.preventDefault();
        go(0);
      } else if (key === "End") {
        event.preventDefault();
        go(ids.length - 1);
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      gsap.killTweensOf(track);
    };
  }, [ids, go]);

  return { rootRef, trackRef, tearRef, index, settled, go };
}
