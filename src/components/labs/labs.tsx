"use client";
import type { CSSProperties, ReactNode } from "react";
import { SiteNavigation } from "../site-navigation";
import { GlitchText } from "./glitch";
import { Hud } from "./hud";
import { products, slides } from "./products";
import { ShowcaseSlide } from "./showcase-slide";
import { Openprexo } from "./showcases/openprexo/openprexo";
import { Primecms, PrimeInitCommand } from "./showcases/primecms";
import { Quipthread } from "./showcases/quipthread";
import { Spritedeck } from "./showcases/spritedeck/spritedeck";
import { useCarousel } from "./use-carousel";

const ids = slides.map((slide) => slide.id);

function Slide({
  position,
  current,
  className,
  accent,
  children,
}: {
  readonly position: number;
  readonly current: number;
  readonly className: string;
  readonly accent?: string;
  readonly children: ReactNode;
}) {
  const slide = slides[position];
  return (
    <section
      className={`labs-slide ${className}`}
      data-slide={slide?.id}
      aria-roledescription="slide"
      aria-label={slide?.label}
      inert={position !== current}
      style={accent ? ({ "--acc": accent } as CSSProperties) : undefined}
    >
      {children}
    </section>
  );
}

export function Labs({ fontClassName }: { readonly fontClassName: string }) {
  const { rootRef, trackRef, tearRef, index, settled, go } = useCarousel(ids);
  return (
    <div ref={rootRef} className={`labs ${fontClassName}`}>
      <div className="labs-header">
        <SiteNavigation logoHref="/" />
      </div>
      <main
        className="labs-viewport"
        onScroll={(event) => {
          // Focus and fragment navigation must never scroll the clipped track.
          event.currentTarget.scrollLeft = 0;
        }}
      >
        <div className="labs-track" ref={trackRef}>
          <Slide position={0} current={index} className="labs-hero">
            <GlitchText as="h1" variant="live">
              V3 LABS
            </GlitchText>
          </Slide>
          <Slide
            position={1}
            current={index}
            className="is-showcase"
            accent={products.quipthread.accent}
          >
            <ShowcaseSlide
              product={products.quipthread}
              wordmark={
                <GlitchText as="h2" className="labs-product qt-word">
                  Quipthread
                </GlitchText>
              }
            >
              <Quipthread active={settled === 1} />
            </ShowcaseSlide>
          </Slide>
          <Slide
            position={2}
            current={index}
            className="is-showcase"
            accent={products.spritedeck.accent}
          >
            <ShowcaseSlide
              product={products.spritedeck}
              wordmark={
                <GlitchText as="h2" className="labs-product sd-word">
                  spritedeck
                </GlitchText>
              }
            >
              <Spritedeck active={settled === 2} />
            </ShowcaseSlide>
          </Slide>
          <Slide
            position={3}
            current={index}
            className="is-showcase"
            accent={products.primecms.accent}
          >
            <ShowcaseSlide
              product={products.primecms}
              wordmark={
                <h2 className="labs-product pc-word" aria-label="prime CMS">
                  <GlitchText className="prime">prime</GlitchText>
                  <span className="cms" aria-hidden="true">
                    CMS
                  </span>
                </h2>
              }
              extra={<PrimeInitCommand />}
            >
              <Primecms active={settled === 3} />
            </ShowcaseSlide>
          </Slide>
          <Slide
            position={4}
            current={index}
            className="is-showcase"
            accent={products.openprexo.accent}
          >
            <ShowcaseSlide
              product={products.openprexo}
              wordmark={
                <h2 className="labs-product op-word glitch-img">
                  <img
                    src="/labs/openprexo-wordmark.svg"
                    width="259"
                    height="35"
                    alt="openprexo"
                  />
                </h2>
              }
            >
              <Openprexo active={settled === 4} warm={index >= 3} />
            </ShowcaseSlide>
          </Slide>
          <Slide position={5} current={index} className="labs-end">
            <div className="labs-end-inner">
              <button type="button" className="labs-back" onClick={() => go(0)}>
                <GlitchText>← Back to start</GlitchText>
              </button>
              <a className="labs-end-link" href="/">
                v3digital.studio ↗
              </a>
            </div>
          </Slide>
        </div>
      </main>
      <div className="labs-tear" ref={tearRef} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="labs-scanlines" aria-hidden="true" />
      <Hud slides={slides} index={index} onGo={go} />
    </div>
  );
}
