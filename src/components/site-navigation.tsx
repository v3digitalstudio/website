"use client";
import { useState } from "react";
import { BookingLink } from "./booking-link";
import { Logo } from "./primitives";

const links = [
  ["#work", "Work"],
  ["#approach", "Services"],
  ["#studio", "Studio"],
  ["#contact", "Start a project"],
] as const;

export function SiteNavigation() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const visible = open || hovered;
  return (
    <header className="site-navigation navigation-field">
      <Logo />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Hover enhances the adjacent keyboard-operable menu button; all links are available by click or keyboard. */}
      <div
        className={"navigation-menu" + (visible ? " is-open" : "")}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
      >
        <button
          className="navigation-trigger"
          type="button"
          aria-expanded={visible}
          aria-controls="navigation-field"
          onClick={() => {
            setOpen(!open);
            if (open) setHovered(false);
          }}
        >
          {open ? "Close −" : "Explore +"}
        </button>
        <nav id="navigation-field" aria-label="Main navigation">
          {links.map(([href, label], index) =>
            href === "#contact" ? (
              <BookingLink
                key={href}
                className="booking-link"
                onOpen={() => {
                  setOpen(false);
                  setHovered(false);
                }}
              >
                <span className="nav-index mono">0{index + 1}</span>
                {label}
              </BookingLink>
            ) : (
              <a
                key={href}
                href={href}
                onClick={() => {
                  setOpen(false);
                  setHovered(false);
                }}
              >
                <span className="nav-index mono">0{index + 1}</span>
                {label}
              </a>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
