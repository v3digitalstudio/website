"use client";
import { useState } from "react";
import { Contact } from "./contact";
import { direction } from "./directions";
import { FieldMotion } from "./field-motion";
import { FieldServices } from "./field-services";
import { Hero } from "./hero";
import { Projects, StudioNote } from "./projects";
import { SiteFooter } from "./site-footer";
import { SiteNavigation } from "./site-navigation";
import { StudioStatement } from "./studio-statement";

export function Studio() {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className={`site direction-field${paused ? " motion-paused" : ""}`}
      id="top"
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <FieldMotion paused={paused}>
        <SiteNavigation />
        <main id="main">
          <Hero
            design={direction}
            paused={paused}
            onPause={() => setPaused(!paused)}
          />
          <StudioNote design={direction} />
          <Projects />
          <FieldServices />
          <StudioStatement />
          <Contact design={direction} />
        </main>
        <SiteFooter />
      </FieldMotion>
    </div>
  );
}
