"use client";

import { type ReactNode, useEffect, useRef } from "react";

const targets = [
  ".hero-copy h1 > span",
  ".hero-description > *",
  ".hero-art",
  ".hero-foot",
  ".studio-note > div",
  ".section-header > *",
  ".project-card",
  ".field-services > .eyebrow",
  ".field-service-intro > *",
  ".field-services details",
  ".field-testimonial figure",
  ".contact-copy > *",
  ".contact-form",
  ".footer-top",
  ".footer-statement",
  ".footer-bottom",
].join(",");

export function FieldMotion({
  children,
  paused,
}: {
  readonly children: ReactNode;
  readonly paused: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(new WeakSet<HTMLElement>());

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(targets));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<HTMLElement, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, index) => {
            if (!(entry.target instanceof HTMLElement)) return;
            const element = entry.target;
            observer.unobserve(element);
            if (seen.current.has(element)) return;
            seen.current.add(element);
            element.dataset["fieldReveal"] = "visible";
            const animation = element.animate(
              [
                { opacity: 0, transform: "translateY(24px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 500,
                delay: Math.min(index, 3) * 120,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                fill: "backwards",
              },
            );
            animations.set(element, animation);
            animation.addEventListener(
              "finish",
              () => animations.delete(element),
              { once: true },
            );
          });
      },
      { rootMargin: "0px 0px -100px 0px" },
    );

    function showAll() {
      observer.disconnect();
      for (const element of elements) {
        seen.current.add(element);
        element.dataset["fieldReveal"] = "visible";
      }
      for (const animation of animations.values()) animation.cancel();
      animations.clear();
    }
    function onPreferenceChange() {
      if (reduced.matches) showAll();
    }
    function onFocus(event: FocusEvent) {
      if (!(event.target instanceof Node)) return;
      const target = event.target;
      for (const element of elements.filter((item) => item.contains(target))) {
        seen.current.add(element);
        element.dataset["fieldReveal"] = "visible";
        observer.unobserve(element);
        animations.get(element)?.cancel();
        animations.delete(element);
      }
    }
    if (paused || reduced.matches) showAll();
    else {
      for (const element of elements) {
        if (seen.current.has(element)) continue;
        element.dataset["fieldReveal"] = "pending";
        observer.observe(element);
      }
    }
    reduced.addEventListener("change", onPreferenceChange);
    root.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      for (const animation of animations.values()) animation.cancel();
      for (const element of elements) delete element.dataset["fieldReveal"];
      reduced.removeEventListener("change", onPreferenceChange);
      root.removeEventListener("focusin", onFocus);
    };
  }, [paused]);

  return (
    <div ref={ref} className="page-layout page-field">
      {children}
    </div>
  );
}
