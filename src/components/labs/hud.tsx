const pad = (n: number) => String(n).padStart(2, "0");

export function Hud({
  slides,
  index,
  onGo,
}: {
  readonly slides: readonly { readonly id: string; readonly label: string }[];
  readonly index: number;
  readonly onGo: (index: number) => void;
}) {
  const current = slides[index];
  return (
    <>
      <nav className="labs-hud" aria-label="Labs sections">
        <p className="labs-hud-count">
          <span>
            <b>{pad(index + 1)}</b> / {pad(slides.length)}
          </span>
          <span className="labs-hud-label">{current?.label}</span>
        </p>
        <ol className="labs-hud-ticks">
          {slides.map((slide, k) => (
            <li key={slide.id}>
              <button
                type="button"
                aria-label={slide.label}
                aria-current={k === index ? "step" : undefined}
                onClick={() => onGo(k)}
              >
                <i />
              </button>
            </li>
          ))}
        </ol>
        <div className="labs-hud-arrows">
          <button
            type="button"
            aria-label="Previous section"
            disabled={index === 0}
            onClick={() => onGo(index - 1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next section"
            disabled={index === slides.length - 1}
            onClick={() => onGo(index + 1)}
          >
            →
          </button>
        </div>
      </nav>
      <p className="sr-only" aria-live="polite">
        {`${index + 1} of ${slides.length}: ${current?.label}`}
      </p>
    </>
  );
}
