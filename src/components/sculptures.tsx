export type Direction = "form" | "field";
type SculptureProps = { readonly kind: Direction; readonly compact?: boolean };

function Form() {
  return (
    <g className="sculpture-breathe">
      {Array.from({ length: 40 }, (_, n) => n).map((i) => {
        const offset = i * 5;
        return (
          <path
            key={`fold-${i}`}
            d={`M ${130 + offset} 105 Q ${530 - offset} 180 ${440 - offset * 0.55} 310 Q ${350 - offset * 0.35} 445 ${135 + offset} 495 Q ${30 + offset} 380 ${180 + offset * 0.55} 280 Q ${270 + offset * 0.35} 175 ${130 + offset} 105Z`}
          />
        );
      })}
    </g>
  );
}
function Field() {
  return (
    <g className="sculpture-breathe">
      {Array.from({ length: 36 }, (_, n) => n).map((i) => (
        <ellipse
          key={`petal-${i}`}
          cx="300"
          cy="290"
          rx={95 + i * 1.8}
          ry="213"
          transform={`rotate(${i * 5} 300 300)`}
        />
      ))}
      <circle cx="300" cy="300" r="8" fill="currentColor" />
    </g>
  );
}
const drawings = {
  form: Form,
  field: Field,
} as const;
export function Sculpture({ kind, compact = false }: SculptureProps) {
  const Drawing = drawings[kind];
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      stroke="currentColor"
      strokeWidth={compact ? "1.3" : ".75"}
      className={`sculpture sculpture-${kind}`}
      aria-hidden="true"
    >
      <Drawing />
    </svg>
  );
}

export function WaveLines() {
  return (
    <svg
      viewBox="0 0 600 300"
      className="wave-lines"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      {Array.from({ length: 28 }, (_, n) => n).map((i) => (
        <path
          key={`wave-${i}`}
          d={`M-30 ${55 + i * 8} C120 ${-50 + i * 4} 160 ${340 - i * 7} 300 ${150 + i * 2} S500 ${30 + i * 8} 640 ${160 + i * 4}`}
        />
      ))}
    </svg>
  );
}
