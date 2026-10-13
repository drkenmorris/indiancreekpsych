"use client";

import { useEffect, useState } from "react";
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
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [explicitMotion, setExplicitMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  function toggleMotion() {
    if (prefersReducedMotion && !explicitMotion) {
      // A visitor can deliberately opt in even when system settings limit motion.
      setExplicitMotion(true);
      setPaused(false);
      return;
    }
    setPaused((current) => !current);
  }

  const isMoving = !paused && (!prefersReducedMotion || explicitMotion);

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
          {prefersReducedMotion && !explicitMotion
            ? "Start scrolling ▶"
            : paused ? "Resume scrolling ▶" : "Pause scrolling ❚❚"}
        </button>
      </div>
      <div
        className="scrollingCatalogViewport"
        data-paused={!isMoving}
        data-explicit-motion={explicitMotion}
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
        {prefersReducedMotion && !explicitMotion
          ? "Motion is limited by your device settings. Swipe manually or choose Start scrolling."
          : "Cards move automatically from right to left. Choose Pause to scroll manually, or select a card to learn more."}
      </p>
    </section>
  );
}
