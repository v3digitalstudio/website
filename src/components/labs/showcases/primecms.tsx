"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { sleep, useReducedMotion } from "../use-reduced-motion";

type Phase =
  | "idle"
  | "thinking"
  | "proposed"
  | "checking"
  | "applied"
  | "discarded";
type Line = {
  readonly id: string;
  readonly text: string;
  readonly frontmatter?: boolean;
  /** "x" is replaced by the changeset, "n" is new in it. */
  readonly flag?: "x" | "n";
};

// Ids differ between versions so rows collapsed during an apply are never reused.
const withIds = (version: string, lines: readonly Omit<Line, "id">[]) =>
  lines.map((line, i): Line => ({ ...line, id: `${version}-${i}` }));

const before = withIds("before", [
  { text: "---", frontmatter: true },
  { text: 'title: "Spring menu"' },
  { text: "date: 2026-03-02" },
  { text: 'description: ""', flag: "x" },
  { text: "---", frontmatter: true },
  { text: "" },
  { text: "We're so excited to announce that our new spring menu", flag: "x" },
  { text: "is finally here, with lots of great new dishes that we", flag: "x" },
  { text: "think you'll really love.", flag: "x" },
  { text: "" },
  { text: "Try the ramp toast, the pea soup and the rhubarb tart." },
]);
const after = withIds("after", [
  { text: "---", frontmatter: true },
  { text: 'title: "Spring menu"' },
  { text: "date: 2026-03-02" },
  {
    text: 'description: "Ramp toast, pea soup, rhubarb tart and three more new dishes."',
    flag: "n",
  },
  { text: "---", frontmatter: true },
  { text: "" },
  { text: "The spring menu starts today: six new dishes built", flag: "n" },
  { text: "around what's in season.", flag: "n" },
  { text: "" },
  { text: "Try the ramp toast, the pea soup and the rhubarb tart." },
]);
const diff = [
  ["ctx", "@@ frontmatter"],
  ["del", 'description: ""'],
  [
    "add",
    'description: "Ramp toast, pea soup, rhubarb tart and three more new dishes."',
  ],
  ["ctx", "@@ body"],
  ["del", "We're so excited to announce that our new spring menu"],
  ["del", "is finally here, with lots of great new dishes that we"],
  ["del", "think you'll really love."],
  ["add", "The spring menu starts today: six new dishes built"],
  ["add", "around what's in season."],
] as const;

export function PrimeInitCommand() {
  const command = useRef<HTMLElement>(null);
  const [label, setLabel] = useState("Copy");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command.current?.textContent ?? "");
      setLabel("Copied");
    } catch {
      if (command.current) getSelection()?.selectAllChildren(command.current);
      setLabel("Selected");
    }
    setTimeout(() => setLabel("Copy"), 1600);
  };
  return (
    <div className="labs-cmd">
      <code ref={command}>bunx @getprimecms/cli init</code>
      <button type="button" onClick={copy}>
        {label}
      </button>
    </div>
  );
}

export function Primecms({ active }: { readonly active: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const run = useRef(0);
  const played = useRef(false);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const { contextSafe } = useGSAP({ scope });

  const propose = () => {
    const id = ++run.current;
    setPhase("thinking");
    sleep(reduce ? 0 : 1400).then(() => {
      if (alive.current && run.current === id) setPhase("proposed");
    });
  };

  useEffect(() => {
    if (!active || played.current) return;
    played.current = true;
    propose();
  });

  // Pending steps stop once the component is gone.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useGSAP(
    () => {
      if (reduce) return;
      if (phase === "proposed") {
        gsap.from(".pc-bot", { opacity: 0, y: 6, duration: 0.4 });
        gsap.from(".pc-cs", {
          opacity: 0,
          y: 12,
          duration: 0.5,
          ease: "power3.out",
        });
        gsap.from(".pc-diff li", {
          opacity: 0,
          x: -8,
          duration: 0.35,
          stagger: 0.06,
          delay: 0.2,
        });
        gsap.from(".pc-lines .is-marked", {
          backgroundColor: "rgb(255 154 145 / 0)",
          duration: 0.6,
          stagger: 0.05,
        });
      }
      if (phase === "applied") {
        const fresh = '.pc-lines [data-flag="n"]';
        gsap.from(fresh, {
          height: 0,
          opacity: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "height,opacity",
        });
        gsap.fromTo(
          fresh,
          { backgroundColor: "rgb(131 217 163 / 0.22)" },
          {
            backgroundColor: "rgb(131 217 163 / 0)",
            duration: 2.4,
            delay: 0.5,
            clearProps: "backgroundColor",
          },
        );
      }
    },
    { scope, dependencies: [phase, reduce] },
  );

  const apply = contextSafe(async () => {
    const id = ++run.current;
    setPhase("checking");
    await sleep(reduce ? 0 : 650);
    if (run.current !== id) return;
    if (!reduce) {
      const old = '.pc-lines [data-flag="x"]';
      await gsap.to(old, {
        backgroundColor: "rgb(255 154 145 / 0.22)",
        duration: 0.2,
      });
      await gsap.to(old, {
        height: 0,
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
      });
    }
    if (alive.current && run.current === id) setPhase("applied");
  });

  const discard = contextSafe(async () => {
    const id = ++run.current;
    if (!reduce) await gsap.to(".pc-cs", { opacity: 0, y: 8, duration: 0.3 });
    if (alive.current && run.current === id) setPhase("discarded");
  });

  const lines = phase === "applied" ? after : before;
  const marked = phase === "proposed" || phase === "checking";
  const answered = phase !== "idle" && phase !== "thinking";

  return (
    <div ref={scope} className="labs-frame pc">
      <div className="labs-frame-bar">
        <span className="pc-logo">prime</span>
        <span className="pc-crumb">
          Posts / <b>spring-menu.md</b>
        </span>
        <span className="pc-ver">{phase === "applied" ? "v8" : "v7"}</span>
      </div>
      <div className="pc-body">
        <div className="pc-editor">
          <ol className="pc-lines" aria-label="spring-menu.md">
            {lines.map((line) => (
              <li
                key={line.id}
                data-flag={line.flag}
                className={
                  marked && line.flag === "x" ? "is-marked" : undefined
                }
              >
                <span className={line.frontmatter ? "is-fm" : undefined}>
                  {line.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="pc-agent">
          <div className="pc-msg pc-user">
            Tighten the intro and fill in the description.
          </div>
          <div className="pc-msg pc-bot">
            {answered ? (
              <>
                Proposed a changeset for <b>spring-menu.md</b>. Review it before
                anything is written.
              </>
            ) : (
              <>
                <span className="sr-only">Thinking</span>
                <span className="labs-typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </>
            )}
          </div>
          {marked && (
            <div className="pc-cs">
              <header>
                <span>Changeset · spring-menu.md</span>
                <span className="is-add">+3</span>
                <span className="is-del">−4</span>
              </header>
              <ol className="pc-diff">
                {diff.map(([kind, text]) => (
                  <li key={`${kind}-${text}`} className={`is-${kind}`}>
                    <i aria-hidden="true">
                      {kind === "add" ? "+" : kind === "del" ? "−" : ""}
                    </i>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <div className="pc-actions">
                <button
                  className="labs-btn"
                  type="button"
                  disabled={phase === "checking"}
                  onClick={discard}
                >
                  Discard
                </button>
                <button
                  className="labs-btn is-primary"
                  type="button"
                  disabled={phase === "checking"}
                  onClick={apply}
                >
                  Apply changeset
                </button>
              </div>
            </div>
          )}
          <p className="pc-status" aria-live="polite">
            {phase === "checking" && "Checking file versions…"}
            {phase === "applied" && (
              <>
                <span className="is-ok">Applied.</span> spring-menu.md v7 → v8
              </>
            )}
            {phase === "discarded" && "Discarded. No files changed."}
            {(phase === "applied" || phase === "discarded") && (
              <button type="button" onClick={propose}>
                Run again
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
