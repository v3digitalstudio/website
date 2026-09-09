"use client";

import type { MouseEvent, ReactNode } from "react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const Cal = lazy(() => import("@calcom/embed-react"));
const bookingLink = "https://cal.com/v3digitalstudio/20min";

function BookingDialog({ onClose }: { readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const explicit = document.documentElement.dataset["theme"];
    setTheme(
      explicit === "dark" ||
        (explicit !== "light" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light",
    );
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="booking-dialog"
      aria-labelledby="booking-title"
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          ref.current?.close();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
    >
      <div className="booking-dialog-content">
        <div className="booking-dialog-header">
          <h2 id="booking-title">Let’s talk about your project.</h2>
          <button
            type="button"
            aria-label="Close booking dialog"
            onClick={() => ref.current?.close()}
          >
            Close
          </button>
        </div>
        <div className="booking-calendar">
          <Suspense fallback={<p role="status">Loading available times…</p>}>
            <Cal
              calLink="v3digitalstudio/20min"
              config={{ theme, layout: "month_view" }}
              style={{ width: "100%", height: "100%", overflow: "auto" }}
            />
          </Suspense>
        </div>
        <a
          className="booking-fallback"
          href={bookingLink}
          target="_blank"
          rel="noreferrer"
        >
          Open booking page in a new tab
        </a>
      </div>
    </dialog>,
    document.body,
  );
}

export function BookingLink({
  children,
  className,
  onOpen,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly onOpen?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  function show(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    focusTarget.current =
      ref.current
        ?.closest(".navigation-menu")
        ?.querySelector<HTMLButtonElement>(".navigation-trigger") ??
      ref.current;
    setOpen(true);
    onOpen?.();
  }
  return (
    <>
      <a
        ref={ref}
        href={bookingLink}
        className={className}
        aria-haspopup="dialog"
        onClick={show}
      >
        {children}
      </a>
      {open && (
        <BookingDialog
          onClose={() => {
            setOpen(false);
            focusTarget.current?.focus();
          }}
        />
      )}
    </>
  );
}
