"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { sleep, useReducedMotion } from "../../use-reduced-motion";
import {
  connectors,
  type DeptId,
  departments,
  type RoleState,
  roles,
  type Step,
} from "./scripts";

type Ev = {
  readonly id: number;
  readonly k: "tool" | "text" | "file" | "you" | "gate";
  readonly a: string;
  readonly b?: string | undefined;
  readonly pending?: boolean;
  readonly verdict?: "approve" | "snooze";
};
type Run = {
  readonly state: RoleState;
  readonly action: string;
  readonly log: readonly Ev[];
  readonly started: number;
};
type State = {
  readonly runs: Readonly<Record<string, Run>>;
  readonly open: string | null;
  /** Events newer than this id animate in; older ones were already there when the window opened. */
  readonly openedAt: number;
};
type Action =
  | { type: "emit"; role: string; ev: Ev }
  | { type: "patch-ev"; role: string; id: number; patch: Partial<Ev> }
  | { type: "patch-run"; role: string; patch: Partial<Run> }
  | { type: "open"; role: string | null; at: number; onlyIfClosed?: boolean };

const LOG_LIMIT = 12;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "emit": {
      const run = state.runs[action.role];
      if (!run) return state;
      const log = [...run.log, action.ev].slice(-LOG_LIMIT);
      return {
        ...state,
        runs: { ...state.runs, [action.role]: { ...run, log } },
      };
    }
    case "patch-ev": {
      const run = state.runs[action.role];
      if (!run) return state;
      const log = run.log.map((ev) =>
        ev.id === action.id ? { ...ev, ...action.patch } : ev,
      );
      return {
        ...state,
        runs: { ...state.runs, [action.role]: { ...run, log } },
      };
    }
    case "patch-run": {
      const run = state.runs[action.role];
      if (!run) return state;
      return {
        ...state,
        runs: { ...state.runs, [action.role]: { ...run, ...action.patch } },
      };
    }
    case "open":
      if (action.onlyIfClosed && state.open) return state;
      return { ...state, open: action.role, openedAt: action.at };
  }
}

let nextId = 0;
const newId = () => {
  nextId += 1;
  return nextId;
};

function initialState(): State {
  const now = Date.now();
  const runs: Record<string, Run> = {};
  for (const [i, spec] of roles.entries()) {
    const log: Ev[] = (spec.history ?? []).map((entry) =>
      entry[0] === "text"
        ? { id: newId(), k: "text", a: entry[1] }
        : { id: newId(), k: entry[0], a: entry[1], b: entry[2] },
    );
    if (spec.gate) {
      log.push({
        id: newId(),
        k: "gate",
        a: spec.gate.title,
        b: spec.gate.body,
      });
    }
    runs[spec.id] = {
      state: spec.state,
      action:
        spec.state === "waiting" && spec.gate
          ? `Waiting on you: ${spec.gate.title}`
          : (spec.script?.[0]?.[0] ?? spec.model),
      log,
      started: now - (24 + i * 9) * 1000,
    };
  }
  return { runs, open: null, openedAt: 0 };
}

const Icon = {
  check: (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  clock: (
    <svg
      viewBox="0 0 24 24"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  terminal: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m5 7 5 5-5 5M12 17h7" />
    </svg>
  ),
  file: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  ),
  shield: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" />
    </svg>
  ),
  plug: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5" />
    </svg>
  ),
  spin: <span className="sd-spin" aria-hidden="true" />,
};

const statusLabel: Record<RoleState, ReactNode> = {
  running: <>{Icon.spin}Running</>,
  waiting: <>{Icon.clock}Needs approval</>,
  done: <>{Icon.check}Done</>,
  idle: "Idle",
};
const pillLabel: Record<RoleState, string> = {
  running: "Running",
  waiting: "Needs you",
  done: "Done",
  idle: "Idle",
};

type Geometry = {
  readonly deptTops: Readonly<Record<string, number>>;
  readonly connTops: readonly number[];
  readonly links: readonly { key: string; role: string; d: string }[];
};

function EvItem({
  ev,
  animate,
  onVerdict,
}: {
  readonly ev: Ev;
  readonly animate: boolean;
  readonly onVerdict: (verdict: "approve" | "snooze") => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  useGSAP(() => {
    if (animate)
      gsap.from(ref.current, {
        opacity: 0,
        y: 8,
        duration: 0.35,
        ease: "power2.out",
      });
  });
  if (ev.k === "tool") {
    return (
      <li ref={ref} className="sd-ev-tool">
        {Icon.terminal}
        <code>{ev.a}</code>
        <span className="sd-ev-detail">{ev.b}</span>
        {ev.pending ? (
          <span className="sd-ev-run">{Icon.spin}</span>
        ) : (
          <span className="sd-ev-ok">{Icon.check}</span>
        )}
      </li>
    );
  }
  if (ev.k === "file") {
    return (
      <li ref={ref} className="sd-ev-file">
        <header>
          {Icon.file}
          <span>{ev.a}</span>
          <span className="sd-ev-ok">{Icon.check}</span>
        </header>
        <pre>{ev.b}</pre>
      </li>
    );
  }
  if (ev.k === "you") {
    return (
      <li ref={ref} className="sd-ev-you">
        {ev.a}
      </li>
    );
  }
  if (ev.k === "gate") {
    return (
      <li ref={ref} className={`sd-gate${ev.verdict ? " is-resolved" : ""}`}>
        <b>
          {Icon.shield}
          <span>{ev.a}</span>
        </b>
        <p>{ev.b}</p>
        <div className="sd-gate-actions">
          {ev.verdict ? (
            <span className="sd-gate-verdict">
              {ev.verdict === "approve"
                ? "Approved by you"
                : "Snoozed for 1 hour"}
            </span>
          ) : (
            <>
              <button
                type="button"
                className="sd-btn is-good"
                onClick={() => onVerdict("approve")}
              >
                Approve
              </button>
              <button
                type="button"
                className="sd-btn is-ghost"
                onClick={() => onVerdict("snooze")}
              >
                Snooze
              </button>
            </>
          )}
        </div>
      </li>
    );
  }
  return (
    <li ref={ref}>
      <p className="sd-ev-text">{ev.a}</p>
    </li>
  );
}

export function Spritedeck({ active }: { readonly active: boolean }) {
  const reduce = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [steer, setSteer] = useState("");
  const graphRef = useRef<HTMLDivElement>(null);
  const deptColRef = useRef<HTMLDivElement>(null);
  const roleColRef = useRef<HTMLDivElement>(null);
  const connColRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const jobRef = useRef<HTMLElement>(null);
  const roleNodes = useRef(new Map<string, HTMLButtonElement>());
  const activeRef = useRef(active);
  const aliveRef = useRef(true);
  const started = useRef(false);
  const autoOpened = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((text: string) => {
    setToast({ text, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const play = useCallback(
    async (role: string, steps: readonly Step[]) => {
      for (const [label, kind, a, b] of steps) {
        dispatch({ type: "patch-run", role, patch: { action: label } });
        await sleep(reduce ? 0 : 1300 + Math.random() * 900);
        if (!aliveRef.current) return;
        const id = newId();
        dispatch({
          type: "emit",
          role,
          ev: { id, k: kind, a, b, pending: kind === "tool" },
        });
        if (kind === "tool") {
          await sleep(reduce ? 0 : 900);
          dispatch({ type: "patch-ev", role, id, patch: { pending: false } });
        }
      }
    },
    [reduce],
  );

  // Running roles loop: run, finish, rest, start over. They pause while the slide is off screen.
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    for (const spec of roles) {
      const script = spec.script;
      if (!script) continue;
      (async () => {
        let first = true;
        while (aliveRef.current) {
          if (!activeRef.current) {
            await sleep(500);
            continue;
          }
          if (!first) {
            dispatch({
              type: "patch-run",
              role: spec.id,
              patch: { state: "running", log: [], started: Date.now() },
            });
          }
          first = false;
          await play(spec.id, script);
          if (!aliveRef.current) return;
          dispatch({
            type: "patch-run",
            role: spec.id,
            patch: { state: "done", action: "Finished" },
          });
          await sleep(6000);
          dispatch({
            type: "patch-run",
            role: spec.id,
            patch: { state: "idle", action: spec.model },
          });
          await sleep(4000);
        }
      })();
    }
  }, [active, play]);

  // Open the PR reviewer once so visitors see an approval without clicking.
  useEffect(() => {
    if (!active || autoOpened.current) return;
    const timer = setTimeout(
      () => {
        autoOpened.current = true;
        dispatch({ type: "open", role: "pr", at: nextId, onlyIfClosed: true });
      },
      reduce ? 0 : 3600,
    );
    return () => clearTimeout(timer);
  }, [active, reduce]);

  const resolveGate = async (
    role: string,
    id: number,
    verdict: "approve" | "snooze",
  ) => {
    const spec = roles.find((r) => r.id === role);
    if (!spec) return;
    dispatch({ type: "patch-ev", role, id, patch: { verdict } });
    if (verdict === "snooze") {
      dispatch({
        type: "patch-run",
        role,
        patch: { state: "idle", action: spec.model },
      });
      showToast("Snoozed for 1 hour");
      return;
    }
    showToast(`Approved. ${spec.name} resumed.`);
    dispatch({ type: "patch-run", role, patch: { state: "running" } });
    await play(role, spec.after ?? []);
    if (aliveRef.current)
      dispatch({
        type: "patch-run",
        role,
        patch: { state: "done", action: "Finished" },
      });
  };

  // Lines between columns follow the nodes; recomputed whenever the graph resizes.
  useEffect(() => {
    const graph = graphRef.current;
    const deptCol = deptColRef.current;
    const roleCol = roleColRef.current;
    const connCol = connColRef.current;
    if (!graph || !deptCol || !roleCol || !connCol) return;
    const measure = () => {
      const g = graph.getBoundingClientRect();
      if (!g.width) return;
      const deptBox = deptCol.getBoundingClientRect();
      const connBox = connCol.getBoundingClientRect();
      const roleBoxes = new Map(
        roles.map((spec) => [
          spec.id,
          roleNodes.current.get(spec.id)?.getBoundingClientRect(),
        ]),
      );
      const centerY = (id: string) => {
        const box = roleBoxes.get(id);
        return box ? box.top + box.height / 2 : 0;
      };
      const deptTops: Record<string, number> = {};
      for (const dept of Object.keys(departments)) {
        const ys = roles
          .filter((r) => r.dept === dept)
          .map((r) => centerY(r.id));
        deptTops[dept] =
          ys.reduce((sum, y) => sum + y, 0) / ys.length - deptBox.top;
      }
      const connTops = connectors.map(
        (_, i) => ((i + 0.5) / connectors.length) * connBox.height,
      );
      const curve = (x1: number, y1: number, x2: number, y2: number) => {
        const mx = (x1 + x2) / 2;
        return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      };
      const showConnectors =
        getComputedStyle(connCol.parentElement as Element).display !== "none";
      const links: { key: string; role: string; d: string }[] = [];
      for (const spec of roles) {
        const box = roleBoxes.get(spec.id);
        if (!box) continue;
        const y = centerY(spec.id) - g.top;
        links.push({
          key: `${spec.dept}-${spec.id}`,
          role: spec.id,
          d: curve(
            deptBox.right - g.left,
            (deptTops[spec.dept] ?? 0) + deptBox.top - g.top,
            box.left - g.left,
            y,
          ),
        });
        if (!showConnectors) continue;
        for (const name of spec.connectors) {
          const i = connectors.indexOf(name as (typeof connectors)[number]);
          links.push({
            key: `${spec.id}-${name}`,
            role: spec.id,
            d: curve(
              box.right - g.left,
              y,
              connBox.left - g.left,
              (connTops[i] ?? 0) + connBox.top - g.top,
            ),
          });
        }
      }
      setGeometry({ deptTops, connTops, links });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(graph);
    return () => observer.disconnect();
  }, []);

  // Traffic dots ride the live links while the slide is on screen.
  const liveRoles = roles
    .filter((spec) => state.runs[spec.id]?.state === "running")
    .map((spec) => spec.id)
    .join(" ");
  useEffect(() => {
    const svg = svgRef.current;
    if (!active || reduce || !svg || !geometry || !liveRoles) return;
    const live = new Set(liveRoles.split(" "));
    const pulses = [
      ...svg.querySelectorAll<SVGCircleElement>("circle[data-link]"),
    ].flatMap((circle, i) => {
      if (!live.has(circle.dataset["role"] ?? "")) return [];
      const path = svg.querySelector<SVGPathElement>(
        `path[data-key="${circle.dataset["link"]}"]`,
      );
      if (!path) return [];
      return [
        {
          circle,
          path,
          length: path.getTotalLength(),
          t: (i % 2) / 2,
          speed: 0.28 + (i % 3) * 0.05,
        },
      ];
    });
    const tick = (_time: number, delta: number) => {
      for (const pulse of pulses) {
        pulse.t = (pulse.t + (delta / 1000) * pulse.speed) % 1;
        const point = pulse.path.getPointAtLength(pulse.t * pulse.length);
        pulse.circle.setAttribute("cx", String(point.x));
        pulse.circle.setAttribute("cy", String(point.y));
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active, reduce, geometry, liveRoles]);

  // Clock in the job window.
  useEffect(() => {
    if (!state.open) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.open]);

  useGSAP(
    () => {
      if (state.open && !reduce)
        gsap.from(jobRef.current, {
          opacity: 0,
          x: 16,
          duration: 0.35,
          ease: "power3.out",
        });
    },
    { dependencies: [state.open === null] },
  );

  const open = state.open ? roles.find((r) => r.id === state.open) : undefined;
  const openRun = open ? state.runs[open.id] : undefined;
  const linkClass = (role: string) => {
    const s = state.runs[role]?.state;
    return s === "running" ? "is-live" : s === "waiting" ? "is-wait" : "";
  };
  const elapsed = openRun
    ? Math.max(0, Math.floor((now - openRun.started) / 1000))
    : 0;

  const submitSteer = async (event: FormEvent) => {
    event.preventDefault();
    const text = steer.trim();
    if (!text || !open) return;
    setSteer("");
    dispatch({
      type: "emit",
      role: open.id,
      ev: { id: newId(), k: "you", a: text },
    });
    await sleep(reduce ? 0 : 900);
    dispatch({
      type: "emit",
      role: open.id,
      ev: {
        id: newId(),
        k: "text",
        a:
          state.runs[open.id]?.state === "running"
            ? "Got it. I'll apply that before the next step."
            : "Noted. I'll use that on the next run.",
      },
    });
  };

  return (
    <div className="labs-frame sd">
      <div className="sd-app">
        <aside className="sd-side" aria-label="Console navigation">
          <div className="sd-org">
            Launch Box Labs
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <span className="sd-nav-item is-active">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Overview
          </span>
          <span className="sd-nav-item">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M10 6h11M10 12h11M10 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
            </svg>
            Runs
            <span className="sd-badge">
              {Object.values(state.runs).filter((r) => r.state === "running")
                .length || ""}
            </span>
          </span>
          <span className="sd-nav-item">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Approvals
            <span className="sd-badge is-warn">
              {Object.values(state.runs).filter((r) => r.state === "waiting")
                .length || ""}
            </span>
          </span>
          <p className="sd-side-label">Departments</p>
          <ul className="sd-depts">
            {(Object.keys(departments) as DeptId[]).map((dept) => {
              const busy = roles.filter(
                (r) =>
                  r.dept === dept &&
                  ["running", "waiting"].includes(
                    state.runs[r.id]?.state ?? "",
                  ),
              ).length;
              return (
                <li key={dept}>
                  <span
                    className="sd-sq"
                    style={{ "--c": departments[dept].color } as CSSProperties}
                  />
                  {departments[dept].name}
                  <span className="sd-badge">{busy || ""}</span>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="sd-main">
          <div className="sd-head">
            <div>
              <h3>Overview</h3>
              <p>
                Live runs, approvals and Sprite health across your organization.
              </p>
            </div>
            <span className="sd-btn is-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New job
            </span>
          </div>
          <div className="sd-tabs">
            <span>Overview</span>
            <span className="is-active">Tower</span>
          </div>
          <div className="sd-tower">
            <div className="sd-legend" aria-hidden="true">
              <span>
                <i />
                Assigned
              </span>
              <span>
                <i className="is-live" />
                Live traffic
              </span>
              <span>
                <i className="is-wait" />
                Waiting on approval
              </span>
            </div>
            <div className="sd-graph" ref={graphRef}>
              <svg className="sd-links" ref={svgRef} aria-hidden="true">
                {geometry?.links.map((link) => (
                  <path
                    key={link.key}
                    data-key={link.key}
                    className={`sd-link ${linkClass(link.role)}`}
                    d={link.d}
                  />
                ))}
                {!reduce &&
                  geometry?.links
                    .filter((link) => linkClass(link.role) === "is-live")
                    .flatMap((link) => [
                      <circle
                        key={`${link.key}-a`}
                        data-link={link.key}
                        data-role={link.role}
                        r="2.4"
                        className="sd-pulse"
                      />,
                      <circle
                        key={`${link.key}-b`}
                        data-link={link.key}
                        data-role={link.role}
                        r="2.4"
                        className="sd-pulse"
                      />,
                    ])}
              </svg>
              <div className="sd-col">
                <p>Departments</p>
                <div className="sd-stack" ref={deptColRef}>
                  {(Object.keys(departments) as DeptId[]).map((dept) => {
                    const mine = roles
                      .filter((r) => r.dept === dept)
                      .map((r) => state.runs[r.id]?.state);
                    const dot = mine.includes("waiting")
                      ? " is-warn"
                      : mine.includes("running")
                        ? " is-good"
                        : "";
                    return (
                      <div
                        key={dept}
                        className="sd-node sd-dept-node"
                        style={{
                          top: geometry?.deptTops[dept] ?? 0,
                          visibility: geometry ? undefined : "hidden",
                        }}
                      >
                        <span
                          className="sd-sq"
                          style={
                            { "--c": departments[dept].color } as CSSProperties
                          }
                        />
                        {departments[dept].name}
                        <span className={`sd-dept-dot${dot}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="sd-col">
                <p>Roles</p>
                <div className="sd-roles" ref={roleColRef}>
                  {roles.map((spec) => {
                    const run = state.runs[spec.id];
                    if (!run) return null;
                    return (
                      <button
                        key={spec.id}
                        ref={(node) => {
                          if (node) roleNodes.current.set(spec.id, node);
                          else roleNodes.current.delete(spec.id);
                        }}
                        type="button"
                        className="sd-node sd-role"
                        data-state={run.state}
                        aria-expanded={state.open === spec.id}
                        onClick={() =>
                          dispatch({
                            type: "open",
                            role: state.open === spec.id ? null : spec.id,
                            at: nextId,
                          })
                        }
                      >
                        <b>{spec.name}</b>
                        <span className="sd-status">
                          {statusLabel[run.state]}
                        </span>
                        <small>
                          {run.state === "idle" ? spec.model : run.action}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sd-col sd-col-connectors">
                <p>Connectors</p>
                <div className="sd-stack" ref={connColRef}>
                  {connectors.map((name, i) => (
                    <div
                      key={name}
                      className="sd-node sd-conn"
                      style={{
                        top: geometry?.connTops[i] ?? 0,
                        visibility: geometry ? undefined : "hidden",
                      }}
                    >
                      {Icon.plug}
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {open && openRun && (
            <section
              ref={jobRef}
              className="sd-job"
              aria-label={`${open.name} job`}
            >
              <div className="sd-job-head">
                <div className="sd-job-title">
                  <span
                    className="sd-sq"
                    style={
                      { "--c": departments[open.dept].color } as CSSProperties
                    }
                  />
                  <b>{open.name}</b>
                  <span className="sd-job-dept">
                    {departments[open.dept].name}
                  </span>
                  <button
                    type="button"
                    aria-label="Close job window"
                    onClick={() =>
                      dispatch({ type: "open", role: null, at: nextId })
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="sd-job-status">
                  <span className="sd-pill" data-state={openRun.state}>
                    {pillLabel[openRun.state]}
                  </span>
                  <span className="sd-job-action">
                    {openRun.state === "idle"
                      ? "No active run"
                      : openRun.action}
                  </span>
                  <span className="sd-timer">{`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}</span>
                </div>
                <div className="sd-job-meta">
                  {`${departments[open.dept].name.toLowerCase()}-${open.name.toLowerCase().replaceAll(" ", "-")} / ${open.model}`}
                </div>
              </div>
              <ol className="sd-feed" aria-live="polite">
                {openRun.log.map((ev) => (
                  <EvItem
                    key={ev.id}
                    ev={ev}
                    animate={!reduce && ev.id > state.openedAt}
                    onVerdict={(verdict) =>
                      resolveGate(open.id, ev.id, verdict)
                    }
                  />
                ))}
              </ol>
              <form className="sd-steer" onSubmit={submitSteer}>
                <label className="sr-only" htmlFor="sd-steer-input">
                  Steer this job
                </label>
                <input
                  id="sd-steer-input"
                  autoComplete="off"
                  placeholder="Steer this job…"
                  value={steer}
                  onChange={(event) => setSteer(event.target.value)}
                />
                <button type="submit" aria-label="Send">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </form>
            </section>
          )}
          <div
            className={`labs-toast${toast ? " is-visible" : ""}`}
            role="status"
          >
            {toast?.text}
          </div>
        </div>
      </div>
    </div>
  );
}
