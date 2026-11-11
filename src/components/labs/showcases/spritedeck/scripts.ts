// Sample org, roles and runs, modeled on the Tower in Spritedeck's own site demo (apps/site).

export type DeptId = "eng" | "growth" | "support";
export type RoleState = "running" | "waiting" | "done" | "idle";
/** [step label shown on the role, kind, first value, second value] */
export type Step = readonly [string, "tool" | "text", string, string?];
export type Entry =
  | readonly ["tool", string, string]
  | readonly ["text", string]
  | readonly ["file", string, string];

export type RoleSpec = {
  readonly id: string;
  readonly name: string;
  readonly dept: DeptId;
  readonly model: string;
  readonly connectors: readonly string[];
  readonly state: RoleState;
  /** Running roles loop over these steps. */
  readonly script?: readonly Step[];
  /** What a waiting or idle role already did. */
  readonly history?: readonly Entry[];
  readonly gate?: { readonly title: string; readonly body: string };
  /** Steps that run after the gate is approved. */
  readonly after?: readonly Step[];
};

export const departments: Record<DeptId, { name: string; color: string }> = {
  eng: { name: "Engineering", color: "#3987e5" },
  growth: { name: "Growth", color: "#c98500" },
  support: { name: "Support", color: "#199e70" },
};

export const connectors = ["GitHub", "Sentry", "Linear", "Notion"] as const;

export const roles: readonly RoleSpec[] = [
  {
    id: "bug",
    name: "Bug diagnoser",
    dept: "eng",
    model: "GPT-5.3 Codex",
    connectors: ["Sentry", "GitHub"],
    state: "running",
    script: [
      ["Querying sentry", "tool", "sentry issues", "--since 24h · 3 new"],
      [
        "Reading session-stream.ts",
        "text",
        "TimeoutError spiked in session-stream right after the 14:02 deploy.",
      ],
      ["Running bun test", "tool", "bun test", "session-stream · 1 failing"],
      [
        "Drafting a fix",
        "text",
        "Root cause: the reconnect loop retries without backoff. The fix is on fix/stream-backoff.",
      ],
    ],
  },
  {
    id: "pr",
    name: "PR reviewer",
    dept: "eng",
    model: "Claude Sonnet 5.5",
    connectors: ["GitHub", "Linear"],
    state: "waiting",
    history: [
      ["tool", "git diff", "main...pr/482 · 12 files"],
      ["tool", "read", "apps/web/src/hooks/use-session-run.ts"],
      [
        "text",
        "Spec asks for resume from the last acknowledged event id; the PR resumes from the last received id, which can skip events that arrived but were not rendered.",
      ],
      [
        "file",
        "review/482.md",
        "+ Spec: resume must use lastAckedEventId (LIN-219).\n+ Standards: session-stream.ts exceeds the 300-line module guideline.",
      ],
    ],
    gate: {
      title: "Post review comments to PR #482",
      body: "Comments will be posted as a draft review authored by the PR reviewer role.",
    },
    after: [
      ["Posting review", "tool", "gh pr review", "482 --comment · 2 comments"],
      ["Finished", "text", "Posted 2 comments as a draft review on #482."],
    ],
  },
  {
    id: "launch",
    name: "Launch captain",
    dept: "growth",
    model: "GPT-5 Mini",
    connectors: ["Notion", "Linear"],
    state: "running",
    script: [
      [
        "Reading the launch plan",
        "tool",
        "notion read",
        "Approvals launch plan",
      ],
      [
        "Writing launch checklist",
        "text",
        "Writing the checklist for Thursday's Approvals launch: 14 items across 3 owners.",
      ],
      ["Filing issues", "tool", "linear create", "9 issues · LAUNCH"],
      [
        "Wrapping up",
        "text",
        "The checklist is in Notion and every item has an owner and a Linear issue.",
      ],
    ],
  },
  {
    id: "triage",
    name: "Ticket triager",
    dept: "support",
    model: "Claude Haiku 5.5",
    connectors: ["Linear"],
    state: "waiting",
    history: [
      ["tool", "linear search", 'team:SUP "export timeout" · 9 results'],
      ["text", "Six of these describe the same CSV export timeout as SUP-901."],
    ],
    gate: {
      title: "Close 6 duplicate tickets and link to SUP-901",
      body: "Each ticket gets a closing note that points the customer to SUP-901.",
    },
    after: [
      ["Closing duplicates", "tool", "linear close", "6 tickets"],
      [
        "Finished",
        "text",
        "Closed 6 duplicates and linked each one to SUP-901.",
      ],
    ],
  },
  {
    id: "esc",
    name: "Escalation packager",
    dept: "support",
    model: "Claude Sonnet 5.5",
    connectors: ["Notion"],
    state: "idle",
    history: [
      [
        "text",
        "Idle. Last run 2h ago: packaged 2 escalations for Legal with timelines and transcripts.",
      ],
    ],
  },
];
