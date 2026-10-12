"use client";

import { useState } from "react";
import Link from "next/link";

export type ScrollingCatalogItem = {
  title: string;
  text: string;
  href: string;
  image: string;
};

type ScrollingCatalogProps = {
  title: string;
  description: string;
  label: string;
  items: ScrollingCatalogItem[];
};

export default function ScrollingCatalog({
  title,
  description,
  label,
  items,
}: ScrollingCatalogProps) {
  const [paused, setPaused] = useState(false);

  if (items.length === 0) return null;

  return (
    <section className="scrollingCatalog" aria-label={label}>
      <div className="scrollingCatalogHeading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button
          className="scrollingCatalogToggle"
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((wasPaused) => !wasPaused)}
        >
          {paused ? "Resume scrolling ▶" : "Pause scrolling ❚❚"}
        </button>
      </div>
      <div className="scrollingCatalogViewport" data-paused={paused}>
        <div
          className="scrollingCatalogTrack"
          style={{ animationDuration: `${items.length * 7}s` }}
        >
          {[false, true].map((duplicate) => (
            <div
              className="scrollingCatalogGroup"
              key={duplicate ? "duplicate" : "original"}
              aria-hidden={duplicate ? true : undefined}
            >
              {items.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="scrollingCatalogCard"
                  tabIndex={duplicate ? -1 : undefined}
                  title={`Learn more about ${item.title}`}
                >
                  <div className="scrollingCatalogImage">
                    {/* Existing photos are intentionally reused, not replaced. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" loading={index < 3 ? "eager" : "lazy"} />
                  </div>
                  <div className="scrollingCatalogCardBody">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <span>Learn more <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="scrollingCatalogHelp">
        Moving right to left · Hover over a card to pause · Click a card to read more
      </p>
    </section>
  );
}
