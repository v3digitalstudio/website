import { BookingLink } from "./booking-link";
import type { Direction } from "./directions";
import { FieldHeroContours } from "./field-hero-contours";
import { Arrow } from "./primitives";
import { Sculpture } from "./sculptures";

type HeroProps = {
  readonly design: Direction;
  readonly paused: boolean;
  readonly onPause: () => void;
};
export function Hero({ design, paused, onPause }: HeroProps) {
  return (
    <section
      className={`hero design-entrance hero-${design.id}`}
      aria-labelledby="hero-title"
    >
      <FieldHeroContours paused={paused} />
      <div className="hero-layout">
        <div className="hero-copy">
          <h1 id="hero-title">
            {design.headline.map((line, i) => (
              <span
                key={line}
                className={
                  i === design.headline.length - 1 ? "headline-last" : ""
                }
              >
                {line}
              </span>
            ))}
          </h1>
          <div className="hero-description">
            <p>{design.body}</p>
            <BookingLink className="action">Start a project</BookingLink>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-corner art-corner-a" />
          <div className="art-corner art-corner-b" />
          <div className="art-stage">
            <Sculpture kind={design.id} />
          </div>
          <div className="art-caption">
            <button
              type="button"
              className="motion-toggle"
              onClick={onPause}
              aria-label={paused ? "Play motion" : "Pause motion"}
              aria-pressed={paused}
            >
              {paused ? "Play motion" : "Pause motion"}
              <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="hero-foot">
        <a href="#work">
          Explore our concepts <Arrow />
        </a>
      </div>
    </section>
  );
}
