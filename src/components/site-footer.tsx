"use client";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./primitives";

const animatedDocuments = new WeakSet<Document>();

export function SiteFooter() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const footer = ref.current;
    if (!footer || animatedDocuments.has(document)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2,
          )
        )
          return;
        observer.disconnect();
        animatedDocuments.add(document);
        if (!reduced.matches && !footer.closest(".motion-paused"))
          setActive(true);
      },
      { threshold: 0.2 },
    );
    function onPreferenceChange() {
      if (reduced.matches) setActive(false);
    }
    observer.observe(footer);
    reduced.addEventListener("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", onPreferenceChange);
    };
  }, []);
  return (
    <footer ref={ref} className="site-footer footer-field">
      <svg
        className={"footer-rings" + (active ? " is-active" : "")}
        viewBox="0 0 1200 480"
        aria-hidden="true"
      >
        {[70, 125, 180, 235, 290, 345, 400, 455].map((radius, index) => (
          <circle
            key={radius}
            cx="920"
            cy="240"
            r={radius}
            style={{ animationDelay: index * 65 + "ms" }}
          />
        ))}
      </svg>
      <div className="footer-top">
        <Logo />
        <a href="mailto:contact@v3digital.studio">contact@v3digital.studio</a>
      </div>
      <a className="footer-statement" href="#contact">
        Make your move.
      </a>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} V3 Digital Studio</span>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
