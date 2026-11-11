import { Fragment, type ReactNode } from "react";
import type { Product } from "./products";

export function ShowcaseSlide({
  product,
  wordmark,
  extra,
  children,
}: {
  readonly product: Product;
  readonly wordmark: ReactNode;
  readonly extra?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="labs-slide-inner">
      <div className="labs-copy" data-par="140">
        <p className="labs-kicker">{product.kicker}</p>
        {wordmark}
        <p className="labs-tagline">{product.tagline}</p>
        <p className="labs-lede">{product.lede}</p>
        <dl className="labs-facts">
          {product.facts.map(([term, value]) => (
            <Fragment key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
        {extra}
        <a
          className="labs-cta"
          href={product.href}
          target="_blank"
          rel="noopener"
        >
          Visit {product.domain} <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="labs-stage" data-par="320">
        {children}
      </div>
    </div>
  );
}
