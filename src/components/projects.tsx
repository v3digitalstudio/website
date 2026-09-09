"use client";
import { useRef, useState } from "react";
import type { Direction } from "./directions";
import { Arrow, Heading, SectionIntro } from "./primitives";
import { Sculpture, WaveLines } from "./sculptures";

const projects = [
  {
    name: "Thread",
    type: "AI workspace",
    number: "01",
    className: "thread",
    title: "Find the answer. Keep the source.",
    description:
      "An AI workspace concept that brings notes, questions, and sources together. Find an answer and see where it came from.",
    scope: "Product strategy / UX & UI / Design system",
    detail:
      "A source-first assistant that helps people connect ideas without losing the original context. The study explores transparent citations, a focused writing surface, and a visual language that makes complex information easier to follow.",
  },
  {
    name: "Matter",
    type: "Creative intelligence",
    number: "02",
    className: "matter",
    title: "More room for the idea.",
    description:
      "A canvas concept for collecting references and developing ideas with AI. Explore suggestions while keeping control of the creative direction.",
    scope: "Interaction design / Prototyping / Development",
    detail:
      "An open canvas for connecting references, shaping directions, and moving from thought to prototype. The study asks how AI can offer useful starting points while keeping the creative direction in your control.",
  },
] as const;
type Project = (typeof projects)[number];

function ProjectPreview({ project }: { readonly project: Project }) {
  return (
    <div
      className={`project-preview preview-${project.className}`}
      aria-hidden="true"
    >
      {project.className === "thread" ? (
        <div className="product-window">
          <div className="product-sidebar">
            <span className="product-symbol">t.</span>
            <span className="mock-nav active">⌘ Workspace</span>
            <span className="mock-nav">↗ Discover</span>
            <span className="mock-nav">▤ Your library</span>
            <span className="mock-bottom">A space for your thinking.</span>
          </div>
          <div className="product-main">
            <span className="mock-kicker">YOUR WORKSPACE, REIMAGINED</span>
            <strong>Good morning, Alex.</strong>
            <span className="mock-subtitle">
              Where will your curiosity take you?
            </span>
            <div className="mock-input">
              Ask a question. Connect an idea.<span>↗</span>
            </div>
            <div className="mock-docs">
              <div>
                <span>01 / NOTES</span>
                <b>A clearer picture</b>
                <i />
                <i />
                <i />
              </div>
              <div>
                <span>02 / COLLECTIONS</span>
                <b>Room to think</b>
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <span className="matter-wordmark">
            matter<span>®</span>
          </span>
          <div className="matter-canvas">
            <Sculpture kind="form" compact />
          </div>
          <span className="matter-note">Your next idea starts here.</span>
          <div className="matter-toolbar">
            <span>↖</span>
            <span>＋</span>
            <span>◯</span>
            <span>↗</span>
          </div>
        </>
      )}
    </div>
  );
}

export function Projects() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Project>(projects[0]);
  function open(project: Project) {
    setSelected(project);
    dialog.current?.showModal();
  }
  return (
    <section id="work" className="section work-section">
      <div className="section-header">
        <SectionIntro
          label="Explorations"
          title="Ideas for a more useful web."
        />
        <p className="section-aside">
          Two concept studies exploring how AI can help people find information
          and develop ideas.
        </p>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <button
            key={project.name}
            className="project-card"
            type="button"
            onClick={() => open(project)}
            aria-label={`Explore ${project.name} concept`}
          >
            <ProjectPreview project={project} />
            <span className="project-meta">
              <span className="project-title">
                {project.name}
                <span>{project.type}</span>
              </span>
              <span className="project-type">
                Studio exploration
                <Arrow diagonal />
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="work-note mono">
        Self-initiated concepts, not client projects.
      </p>
      <dialog
        ref={dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        aria-label={`${selected.name} concept details`}
        className="project-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-body">
          <button
            type="button"
            className="dialog-close"
            aria-label="Close project details"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
          <p className="eyebrow">Studio exploration / {selected.number}</p>
          <Heading>{selected.name}</Heading>
          <ProjectPreview project={selected} />
          <Heading level={3}>{selected.title}</Heading>
          <p>{selected.description}</p>
          <p>{selected.detail}</p>
          <p className="mono dialog-scope">{selected.scope}</p>
          {/* biome-ignore lint/a11y/useValidAnchor: Native section navigation also dismisses the modal. */}
          <a
            className="action"
            href="#contact"
            onClick={() => dialog.current?.close()}
          >
            Build something like this
            <Arrow diagonal />
          </a>
        </div>
      </dialog>
    </section>
  );
}

export function StudioNote({ design }: { readonly design: Direction }) {
  return (
    <section id="studio" className="studio-note section">
      <div>
        <p className="eyebrow">The studio</p>
        <div className="studio-note-art">
          <WaveLines />
        </div>
      </div>
      <div>
        <Heading>{design.studioTitle}</Heading>
        <p>{design.studioBody}</p>
        <p>
          You work directly with the people designing and developing your
          project, from the first conversation to the final release.
        </p>
        <a className="text-link" href="#contact">
          Discuss your project
          <Arrow diagonal />
        </a>
      </div>
    </section>
  );
}
