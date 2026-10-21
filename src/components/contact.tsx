"use client";
import ky, { HTTPError } from "ky";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Direction } from "./directions";
import { Arrow, Heading } from "./primitives";

const turnstileSiteKey =
  process.env.NODE_ENV === "development"
    ? "1x00000000000000000000AA"
    : "0x4AAAAAACnGWpZ1l53Ku5Z9";

type Turnstile = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let turnstileScript: Promise<Turnstile> | undefined;
function loadTurnstile() {
  turnstileScript ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile unavailable"));
    script.onerror = () => {
      turnstileScript = undefined;
      script.remove();
      reject(new Error("Turnstile failed to load"));
    };
    document.head.append(script);
  });
  return turnstileScript;
}

export function Contact({ design }: { readonly design: Direction }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const sending = useRef(false);
  const verifier = useRef<HTMLDivElement>(null);
  const widget = useRef<{ readonly api: Turnstile; readonly id: string }>(null);
  const attempt = useRef<{
    readonly payload: string;
    readonly id: string;
  } | null>(null);
  useEffect(() => {
    const container = verifier.current;
    if (!container) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        loadTurnstile()
          .then((api) => {
            if (cancelled) return;
            const id = api.render(container, {
              sitekey: turnstileSiteKey,
              action: "contact",
              appearance: "interaction-only",
              callback: setToken,
              "expired-callback": () => setToken(null),
              "error-callback": () => setToken(null),
            });
            if (id) widget.current = { api, id };
          })
          .catch(() => {
            if (!cancelled)
              setMessage(
                "Verification couldn’t load. Please email us directly.",
              );
          });
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (widget.current) widget.current.api.remove(widget.current.id);
      widget.current = null;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    if (!token) {
      setStatus("idle");
      setMessage("Verifying you’re human. Please try again in a moment.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      project: String(data.get("project") ?? "").trim(),
      website: String(data.get("website") ?? ""),
    };
    const payload = JSON.stringify(fields);
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, id: crypto.randomUUID() };
    sending.current = true;
    setStatus("sending");
    setMessage("");
    try {
      const result = await ky
        .post("/api/contact", {
          json: {
            ...fields,
            requestId: attempt.current.id,
            turnstileToken: token,
          },
          retry: 0,
          timeout: 15000,
        })
        .json<unknown>();
      if (
        typeof result !== "object" ||
        result === null ||
        !("ok" in result) ||
        result.ok !== true
      ) {
        setStatus("error");
        setMessage(
          "We couldn’t send your message. Please try again or email us directly.",
        );
        return;
      }
      form.reset();
      attempt.current = null;
      setStatus("sent");
      setMessage("Thanks for getting in touch. Your message has been sent.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof HTTPError && error.response.status === 429
          ? "Please wait a minute before trying again, or email us directly."
          : "We couldn’t send your message. Please try again or email us directly.",
      );
    } finally {
      sending.current = false;
      setToken(null);
      if (widget.current) widget.current.api.reset(widget.current.id);
    }
  }
  return (
    <section id="contact" className="section contact-section">
      <div className="contact-copy">
        <Heading>{design.contactTitle}</Heading>
        <p>{design.contactBody}</p>
        <a className="contact-email" href="mailto:contact@v3digital.studio">
          contact@v3digital.studio
          <Arrow diagonal />
        </a>
      </div>
      <form
        onSubmit={submit}
        className="contact-form"
        aria-busy={status === "sending"}
      >
        <label className="form-trap" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <div className="form-row">
          <label>
            Your name
            <input
              disabled={status === "sending"}
              name="name"
              placeholder="Alex Morgan"
              autoComplete="name"
              required
              maxLength={120}
            />
          </label>
          <label>
            Your email
            <input
              disabled={status === "sending"}
              name="email"
              type="email"
              placeholder="alex@company.com"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
        </div>
        <label>
          About your project
          <textarea
            disabled={status === "sending"}
            name="project"
            placeholder="We’re building a website for…"
            required
            minLength={10}
            maxLength={4000}
            rows={3}
          />
        </label>
        <div ref={verifier} className="form-verify" />
        <div className="form-bottom">
          <button
            className="action"
            type={status === "sent" ? "button" : "submit"}
            disabled={status === "sending"}
            onClick={(event) => {
              if (status === "sent") {
                setStatus("idle");
                setMessage("");
                event.currentTarget.form
                  ?.querySelector<HTMLInputElement>('[name="name"]')
                  ?.focus();
              }
            }}
          >
            {status === "sending"
              ? "Sending…"
              : status === "sent"
                ? "Send another message"
                : "Send message"}
            <Arrow diagonal />
          </button>
        </div>
        <p className="form-help" role="status" aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  );
}
