"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { sleep, useReducedMotion } from "../../use-reduced-motion";
import { denoiseRenderer } from "./denoise-renderer";
import {
  nextScenario,
  order,
  preloadImages,
  type Scenario,
  type ScenarioId,
  scenarios,
} from "./scenarios";

const STEPS = 28;
const MESSAGE_LIMIT = 6;

type Message = {
  readonly id: number;
  readonly kind: "user" | "result";
  readonly scenario: ScenarioId;
};

const icons = {
  image: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  ),
  video: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3" />
    </svg>
  ),
};

function Tile({
  scenario,
  index,
  onDone,
}: {
  readonly scenario: Scenario;
  readonly index: number;
  readonly onDone: () => void;
}) {
  const tile = scenario.tiles[index];
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("Queued");
  const [ready, setReady] = useState(false);

  // A tile generates once, when it mounts.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a tile's scenario, index and onDone never change.
  useEffect(() => {
    const target = canvas.current;
    const frame = box.current;
    if (!tile || !target || !frame) return;
    let alive = true;
    let timeline: gsap.core.Timeline | undefined;
    const renderer = denoiseRenderer();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    target.width = Math.min(640, Math.round(frame.clientWidth * ratio)) || 320;
    target.height = Math.round(target.width * (scenario.video ? 9 / 16 : 1));
    const seed = Math.random();
    const draw = (progress: number) =>
      renderer.draw(target, {
        src: tile.src,
        from: scenario.from,
        progress,
        seed,
      });
    Promise.all([
      renderer.load(tile.src),
      scenario.from ? renderer.load(scenario.from) : null,
    ]).then(() => {
      if (!alive) return;
      draw(0);
      const counter = { step: 0 };
      timeline = gsap
        .timeline({
          delay: reduce ? 0 : 0.5 + index * 0.35,
          onComplete: () => {
            setReady(true);
            onDone();
          },
        })
        .add(() => setStatus(`Generating · 0/${STEPS}`))
        .to(counter, {
          step: STEPS,
          duration: reduce
            ? 0
            : scenario.video
              ? 3.6
              : 2.6 + Math.random() * 0.6,
          ease: `steps(${STEPS})`,
          onUpdate: () => {
            const step = Math.round(counter.step);
            setStatus(`Generating · ${step}/${STEPS}`);
            draw(step / STEPS);
          },
        })
        .add(() => setStatus("Finalizing"))
        .to({}, { duration: reduce ? 0 : 0.45 });
    });
    return () => {
      alive = false;
      timeline?.kill();
    };
  }, []);

  if (!tile) return null;
  return (
    <div ref={box} className="op-tile">
      {!ready && <canvas ref={canvas} />}
      {!ready && <span className="op-stat">{status}</span>}
      {ready && scenario.video && (
        <>
          <video
            src={scenario.video.src}
            poster={tile.src}
            aria-label={scenario.video.alt}
            muted
            loop
            playsInline
            autoPlay={!reduce}
            controls={reduce}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (bar.current && video.duration) {
                bar.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
              }
            }}
          />
          {!reduce && (
            <span className="op-vbar">
              <span className="op-vbar-track">
                <i ref={bar} />
              </span>
              0:05
            </span>
          )}
        </>
      )}
      {ready && !scenario.video && <img src={tile.src} alt={tile.alt} />}
    </div>
  );
}

function Result({
  id,
  onComplete,
}: {
  readonly id: ScenarioId;
  readonly onComplete: (id: ScenarioId) => void;
}) {
  const scenario = scenarios[id];
  const done = useRef(0);
  const [finished, setFinished] = useState(false);
  const tileDone = () => {
    done.current += 1;
    if (done.current === scenario.tiles.length) {
      setFinished(true);
      onComplete(id);
    }
  };
  return (
    <div className="op-result">
      <div className="op-result-head">
        <b>{scenario.title}</b>
        <span>
          {finished && scenario.finishedMeta
            ? scenario.finishedMeta
            : scenario.meta}
        </span>
      </div>
      <div className={`op-tiles ${scenario.layout}`}>
        {scenario.tiles.map((tile, i) => (
          <Tile
            key={tile.src}
            scenario={scenario}
            index={i}
            onDone={tileDone}
          />
        ))}
      </div>
    </div>
  );
}

export function Openprexo({
  active,
  warm,
}: {
  readonly active: boolean;
  /** True one slide ahead, so the images are loading before the slide arrives. */
  readonly warm: boolean;
}) {
  const reduce = useReducedMotion();
  const scope = useRef<HTMLDivElement>(null);
  const typingId = useRef(0);
  const messageId = useRef(0);
  const played = useRef(false);
  const alive = useRef(true);
  const [current, setCurrent] = useState<ScenarioId>("image");
  const [typed, setTyped] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const scenario = scenarios[current];

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!warm) return;
    const renderer = denoiseRenderer();
    for (const src of preloadImages) renderer.load(src);
  }, [warm]);

  const type = useCallback(
    async (id: ScenarioId) => {
      const run = ++typingId.current;
      const prompt = scenarios[id].prompt;
      setCurrent(id);
      if (reduce) {
        setTyped(prompt);
        return true;
      }
      setTyping(true);
      for (let i = 1; i <= prompt.length; i += 3) {
        if (run !== typingId.current || !alive.current) return false;
        setTyped(prompt.slice(0, i));
        await sleep(14);
      }
      setTyped(prompt);
      setTyping(false);
      return run === typingId.current;
    },
    [reduce],
  );

  const generate = useCallback((id: ScenarioId) => {
    typingId.current += 1;
    setTyping(false);
    setTyped(null);
    setBusy(true);
    const user = {
      id: ++messageId.current,
      kind: "user",
      scenario: id,
    } as const;
    const result = {
      id: ++messageId.current,
      kind: "result",
      scenario: id,
    } as const;
    setMessages((list) => [...list, user, result].slice(-MESSAGE_LIMIT));
  }, []);

  const complete = useCallback(
    async (id: ScenarioId) => {
      setBusy(false);
      if (id === "image") setBatchDone(true);
      setToast(scenarios[id].toast);
      setTimeout(() => setToast(null), 2200);
      await sleep(reduce ? 0 : 700);
      if (alive.current) type(nextScenario[id]);
    },
    [reduce, type],
  );

  useEffect(() => {
    if (!active || played.current) return;
    played.current = true;
    (async () => {
      if (await type("image")) {
        await sleep(reduce ? 0 : 400);
        if (alive.current) generate("image");
      }
    })();
  }, [active, reduce, type, generate]);

  useGSAP(
    () => {
      if (reduce || messages.length === 0) return;
      gsap.from(".op-msgs > :last-child, .op-msgs > :nth-last-child(2)", {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.12,
      });
    },
    { scope, dependencies: [messages.length] },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || typing || typed === null) return;
    generate(current);
  };

  const empty = typed === null;
  return (
    <div ref={scope} className="labs-frame op">
      <div className="op-chrome" aria-hidden="true">
        <span className="labs-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="op-url">127.0.0.1:4096</span>
        <span className="op-chrome-spacer" />
      </div>
      <div className="op-top">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="op-mark" aria-hidden="true" />
        <span className="op-project">Tokyo nights</span>
      </div>
      <div className="op-feed">
        <div className="op-msgs" aria-live="polite">
          {messages.map((message) =>
            message.kind === "user" ? (
              <div key={message.id} className="op-user">
                {scenarios[message.scenario].from && (
                  <span className="op-user-source">
                    <img src={scenarios[message.scenario].from} alt="" />
                    Edit of image 3
                  </span>
                )}
                {scenarios[message.scenario].prompt}
              </div>
            ) : (
              <Result
                key={message.id}
                id={message.scenario}
                onComplete={complete}
              />
            ),
          )}
        </div>
      </div>
      <div className="op-compose">
        <fieldset className="op-chips">
          <legend className="sr-only">Scenario</legend>
          {order.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={current === id}
              disabled={busy || (id === "edit" && !batchDone)}
              onClick={() => type(id)}
            >
              {scenarios[id].chip}
            </button>
          ))}
        </fieldset>
        <form className="op-composer" onSubmit={submit}>
          {scenario.from && !empty && (
            <div className="op-attach">
              <img src={scenario.from} alt="" />
              Editing image · original file attached
            </div>
          )}
          <div className="op-row">
            <span className="op-mode">{icons[scenario.mode]}</span>
            <span className={`op-text${empty ? " is-empty" : ""}`}>
              {empty
                ? scenario.mode === "video"
                  ? "Describe a video…"
                  : "Describe an image…"
                : typed}
              {typing && <span className="op-caret" />}
            </span>
            <span className="op-meta">
              <span className="op-params">{scenario.params}</span>
              {scenario.batch && <span className="op-count">×4</span>}
              <span className="op-model">
                {scenario.model}
                <small>{scenario.source}</small>
              </span>
            </span>
            <button
              className="op-send"
              type="submit"
              aria-label="Generate"
              disabled={busy || typing || empty}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                aria-hidden="true"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
      <div className={`labs-toast${toast ? " is-visible" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
