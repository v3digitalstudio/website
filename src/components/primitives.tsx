import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function Container({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`container ${className}`} {...props}>
      {children}
    </div>
  );
}

type HeadingProps = ComponentPropsWithoutRef<"h2"> & {
  readonly level?: 1 | 2 | 3 | 4;
};
export function Heading({ level = 2, className = "", ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`;
  return <Element className={`heading ${className}`} {...props} />;
}

export function SectionIntro({
  label,
  title,
  children,
}: {
  readonly label: string;
  readonly title: string;
  readonly children?: ReactNode;
}) {
  return (
    <div className="section-intro">
      <p className="eyebrow">{label}</p>
      <Heading>{title}</Heading>
      {children && <p className="section-description">{children}</p>}
    </div>
  );
}

export function Arrow({ diagonal = false }: { readonly diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="arrow">
      <path
        d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-7-7 7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ActionLink({
  children,
  href,
  secondary = false,
}: {
  readonly children: ReactNode;
  readonly href: string;
  readonly secondary?: boolean;
}) {
  return (
    <a className={`action ${secondary ? "action-secondary" : ""}`} href={href}>
      {children}
      <Arrow diagonal />
    </a>
  );
}

export function Logo() {
  return (
    <a className="brand" href="#top" aria-label="V3 Digital Studio home">
      <span className="brand-mark">
        <picture className="logo-system">
          <source
            media="(prefers-color-scheme: dark)"
            srcSet="/company/v3-logo-dark.webp"
          />
          <img
            src="/company/v3-logo-light.webp"
            width="48"
            height="48"
            alt=""
          />
        </picture>
        <img
          className="logo-light"
          src="/company/v3-logo-light.webp"
          width="48"
          height="48"
          alt=""
        />
        <img
          className="logo-dark"
          src="/company/v3-logo-dark.webp"
          width="48"
          height="48"
          alt=""
        />
      </span>
    </a>
  );
}
