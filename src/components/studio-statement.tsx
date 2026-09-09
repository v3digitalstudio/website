import { FieldHeroContours } from "./field-hero-contours";

export function StudioStatement() {
  return (
    <section
      className="field-testimonial"
      aria-labelledby="studio-statement-title"
    >
      <h2 id="studio-statement-title" className="sr-only">
        Our approach
      </h2>
      <div className="field-testimonial-background" aria-hidden="true">
        <FieldHeroContours paused />
      </div>
      <figure>
        <blockquote>
          <p>
            Your next chapter deserves more than a new website. We bring design,
            development, and AI together to turn your ambition into something
            people can see, use, and choose.
          </p>
        </blockquote>
        <figcaption>
          <span>V3 Digital Studio</span>
        </figcaption>
      </figure>
    </section>
  );
}
