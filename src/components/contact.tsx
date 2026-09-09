"use client";
import ky, { HTTPError } from "ky";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import type { Direction } from "./directions";
import { Arrow, Heading } from "./primitives";

export function Contact({ design }: { readonly design: Direction }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const sending = useRef(false);
  const attempt = useRef<{
    readonly payload: string;
    readonly id: string;
  } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
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
          json: { ...fields, requestId: attempt.current.id },
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
