import type { ElementType, ReactNode } from "react";

export function GlitchText({
  as: Element = "span",
  children,
  className = "",
  variant,
}: {
  readonly as?: ElementType;
  readonly children: string;
  readonly className?: string;
  /** "live" glitches continuously, "small" in short bursts; omitted only on hover or when triggered. */
  readonly variant?: "live" | "small";
}): ReactNode {
  const modifier = variant ? ` is-${variant}` : "";
  return (
    <Element className={`glitch${modifier} ${className}`} data-text={children}>
      {children}
    </Element>
  );
}

/** Replays the one-shot glitch on an element; used when a slide becomes active. */
export function burstGlitch(element: Element | null) {
  if (!element) return;
  element.classList.remove("is-burst");
  // Force a reflow so the animation restarts.
  void (element as HTMLElement).offsetWidth;
  element.classList.add("is-burst");
  element.addEventListener(
    "animationend",
    () => element.classList.remove("is-burst"),
    { once: true },
  );
}
