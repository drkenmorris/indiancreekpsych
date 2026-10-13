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
  appearance?: "default" | "immersive";
};

export default function ScrollingCatalog({
  title,
  description,
  label,
  items,
  appearance = "default",
}: ScrollingCatalogProps) {
  // Both catalogs autoplay immediately; the visitor alone controls Pause/Resume.
  const [paused, setPaused] = useState(false);

  function toggleMotion() {
    setPaused((current) => !current);
  }

  if (items.length === 0) return null;

  return (
    <section className={appearance === "immersive" ? "scrollingCatalog scrollingCatalogImmersive" : "scrollingCatalog"} aria-label={label}>
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
          onClick={toggleMotion}
        >
          {paused ? "Resume scrolling ▶" : "Pause scrolling ❚❚"}
        </button>
      </div>
      <div
        className="scrollingCatalogViewport"
        data-paused={paused}
      >
        <div
          className="scrollingCatalogTrack"
          style={{ animationDuration: `${items.length * 5}s` }}
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
        Cards move automatically from right to left. Choose Pause to browse manually or select a card to learn more.
      </p>
    </section>
  );
}
