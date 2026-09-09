"use client";

import { useEffect, useRef, useState } from "react";

const width = 1440;
const height = 800;
const spacing = 38;
const offsets = Array.from({ length: 26 }, (_, index) => index * spacing - 152);
const bend = (x: number) =>
  95 * Math.sin(x / 310) + 45 * Math.sin(x / 150 + 0.5);

function contour(offset: number, start = 0, end = width) {
  const steps = Math.ceil((end - start) / 12);
  return Array.from({ length: steps + 1 }, (_, index) => {
    const x = start + ((end - start) * index) / steps;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${(offset + bend(x)).toFixed(2)}`;
  }).join(" ");
}

const contours = offsets.map((offset) => ({ offset, path: contour(offset) }));
type Highlight = {
  readonly x: number;
  readonly offset: number;
  readonly id: number;
};

export function FieldHeroContours({ paused }: { readonly paused: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const sequence = useRef(0);
  const [highlights, setHighlights] = useState<readonly Highlight[]>([]);

  useEffect(() => {
    const svg = ref.current;
    const hero = svg?.parentElement;
    if (!svg || !hero || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current = "";
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse" || reduced.matches || !svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * width;
      const y = ((event.clientY - rect.top) / rect.height) * height;
      const offset = Math.round((y - bend(x)) / spacing) * spacing;
      if (!offsets.includes(offset)) return;
      const key = `${offset},${Math.floor(x / 48)}`;
      if (current === key) return;
      current = key;
      const highlight = { x, offset, id: sequence.current++ };
      setHighlights((previous) => [...previous.slice(-7), highlight]);
    }
    function onPointerLeave() {
      current = "";
    }
    hero.addEventListener("pointermove", onPointerMove);
    hero.addEventListener("pointerleave", onPointerLeave);
    return () => {
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [paused]);

  return (
    <svg
      ref={ref}
      className="field-hero-contours"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g className="field-contour-lines">
        {contours.map(({ offset, path }) => (
          <path key={offset} d={path} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {highlights.map((highlight) => (
        <g
          key={highlight.id}
          className="field-contour-trail"
          onAnimationEnd={() =>
            setHighlights((previous) =>
              previous.filter((item) => item.id !== highlight.id),
            )
          }
        >
          <path
            d={contour(highlight.offset, highlight.x - 72, highlight.x + 72)}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={highlight.x}
            cy={highlight.offset + bend(highlight.x)}
            r="2"
          />
        </g>
      ))}
    </svg>
  );
}
