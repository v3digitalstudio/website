"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type CSSProperties, type FormEvent, useRef, useState } from "react";
import { useReducedMotion } from "../use-reduced-motion";

type Comment = {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly hue: number;
  readonly ago: string;
  readonly votes: number;
  readonly text: string;
  readonly you?: boolean;
  readonly fresh?: boolean;
  readonly replies: readonly Comment[];
};

const thread: readonly Comment[] = [
  {
    id: "maya",
    name: "Maya R.",
    initials: "MR",
    hue: 24,
    ago: "2h",
    votes: 12,
    text: "Moved our docs comments over last weekend. One script tag, and it matched our dark theme without any extra CSS.",
    replies: [
      {
        id: "dev",
        name: "Dev K.",
        initials: "DK",
        hue: 205,
        ago: "1h",
        votes: 7,
        text: "Same here. It runs on a small VPS with SQLite and hasn't needed any attention.",
        replies: [],
      },
    ],
  },
  {
    id: "sam",
    name: "Sam O.",
    initials: "SO",
    hue: 140,
    ago: "48m",
    votes: 4,
    text: "Does the widget slow the page down at all?",
    replies: [
      {
        id: "dev-2",
        name: "Dev K.",
        initials: "DK",
        hue: 205,
        ago: "40m",
        votes: 6,
        text: "The loader is a small classic script. Everything else loads lazily.",
        replies: [],
      },
    ],
  },
];

const liveReply: Comment = {
  id: "maya-live",
  name: "Maya R.",
  initials: "MR",
  hue: 24,
  ago: "just now",
  votes: 1,
  text: "We stream backups to object storage with Litestream, too. Set it up once and it just works.",
  fresh: true,
  replies: [],
};

const total = (list: readonly Comment[]): number =>
  list.reduce((sum, comment) => sum + 1 + total(comment.replies), 0);

function CommentItem({
  comment,
  voted,
  typing,
  onVote,
  onReply,
}: {
  readonly comment: Comment;
  readonly voted: Readonly<Record<string, boolean>>;
  readonly typing: string | null;
  readonly onVote: (id: string) => void;
  readonly onReply: (name: string) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  useGSAP(
    () => {
      if (!comment.fresh || reduce) return;
      gsap.from(ref.current, {
        height: 0,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        clearProps: "height,opacity",
      });
      gsap.fromTo(
        ".qt-row",
        { backgroundColor: "rgb(224 127 50 / 0.18)" },
        {
          backgroundColor: "rgb(224 127 50 / 0)",
          duration: 2.2,
          delay: 0.4,
          clearProps: "backgroundColor",
        },
      );
    },
    { scope: ref },
  );
  const pressed = voted[comment.id] === true;
  return (
    <li ref={ref} className={`qt-c${comment.you ? " is-you" : ""}`}>
      <div className="qt-row">
        <span
          className="qt-av"
          style={{ "--h": comment.hue } as CSSProperties}
          aria-hidden="true"
        >
          {comment.initials}
        </span>
        <div className="qt-main">
          <p className="qt-meta">
            <b>{comment.name}</b> · {comment.ago}
          </p>
          <p className="qt-text">{comment.text}</p>
          <div className="qt-actions">
            <button
              type="button"
              aria-pressed={pressed}
              aria-label={`Upvote ${comment.name}`}
              onClick={() => onVote(comment.id)}
            >
              ▲ <span>{comment.votes + (pressed ? 1 : 0)}</span>
            </button>
            <button type="button" onClick={() => onReply(comment.name)}>
              Reply
            </button>
          </div>
        </div>
      </div>
      {(comment.replies.length > 0 || typing === comment.id) && (
        <ol className="qt-children">
          <span className="qt-line" aria-hidden="true" />
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              voted={voted}
              typing={typing}
              onVote={onVote}
              onReply={onReply}
            />
          ))}
          {typing === comment.id && (
            <li className="qt-typing">
              <span className="labs-typing-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {comment.name} is replying
            </li>
          )}
        </ol>
      )}
    </li>
  );
}

export function Quipthread({ active }: { readonly active: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const played = useRef(false);
  const intro = useRef<gsap.core.Timeline | null>(null);
  const reduce = useReducedMotion();
  const [comments, setComments] = useState(thread);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [typing, setTyping] = useState<string | null>(null);
  const [draft, setDraft] = useState(
    "This is exactly the setup I was looking for.",
  );
  const [posted, setPosted] = useState(0);
  const count = total(comments);

  const addLiveReply = () => {
    setTyping(null);
    setComments((list) =>
      list.map((comment) =>
        comment.id === "maya"
          ? { ...comment, replies: [...comment.replies, liveReply] }
          : comment,
      ),
    );
  };

  useGSAP(
    () => {
      if (!active) {
        if (intro.current?.isActive()) intro.current.progress(1);
        return;
      }
      if (played.current) return;
      played.current = true;
      if (reduce) {
        addLiveReply();
        return;
      }
      intro.current = gsap
        .timeline()
        .set(".qt-c", { opacity: 0, y: 14 })
        .set(".qt-line", { scaleY: 0 })
        .to(
          ".qt-c",
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.16,
            ease: "power3.out",
          },
          0.2,
        )
        .to(
          ".qt-line",
          { scaleY: 1, duration: 0.7, stagger: 0.25, ease: "power2.inOut" },
          0.45,
        )
        .add(() => setTyping("maya"), "+=0.5")
        .add(addLiveReply, "+=1.8");
      const timeline = intro.current;
      // A revert before the intro finished (StrictMode remount) lets it play again.
      return () => {
        if (timeline.progress() < 1) played.current = false;
      };
    },
    { scope, dependencies: [active, reduce] },
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      input.current?.focus();
      return;
    }
    const next = posted + 1;
    setPosted(next);
    setComments((list) => [
      {
        id: `you-${next}`,
        name: "You",
        initials: "YO",
        hue: 24,
        ago: "just now",
        votes: 0,
        text,
        you: true,
        fresh: true,
        replies: [],
      },
      ...list,
    ]);
    setDraft("");
  };

  return (
    <div ref={scope} className="labs-frame qt">
      <div className="labs-frame-bar">
        <span className="labs-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>notes.example.com/self-hosting</span>
      </div>
      <div className="qt-body">
        <div className="qt-article" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="qt-head">
          <strong>
            <span
              key={count}
              className={`qt-count${count > 4 ? " is-bumped" : ""}`}
            >
              {count}
            </span>{" "}
            comments
          </strong>
          <span className="qt-sort">
            <b>Top</b> · New
          </span>
        </div>
        <form className="qt-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="qt-input">
            Add a comment
          </label>
          <textarea
            ref={input}
            id="qt-input"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="qt-composer-bar">
            <span>Markdown supported</span>
            <button className="labs-btn is-primary" type="submit">
              Post
            </button>
          </div>
        </form>
        <ol className="qt-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              voted={voted}
              typing={typing}
              onVote={(id) => setVoted((map) => ({ ...map, [id]: !map[id] }))}
              onReply={(name) => {
                const value = `@${name} `;
                setDraft(value);
                requestAnimationFrame(() => {
                  input.current?.focus();
                  input.current?.setSelectionRange(value.length, value.length);
                });
              }}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
