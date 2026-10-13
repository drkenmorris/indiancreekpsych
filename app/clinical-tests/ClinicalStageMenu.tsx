"use client";

import Link from "next/link";

export type ClinicalStage = { key: string; label: string; href?: string };

export default function ClinicalStageMenu({
  label, stages, activeKey, onSelect,
}: {
  label: string;
  stages: readonly ClinicalStage[];
  activeKey: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <nav className="clinicalStageMenu" aria-label={label}>
      <span className="clinicalStageLabel">Sections</span>
      <div className="clinicalStageItems">
        {stages.map((item, index) => {
          const active = item.key === activeKey;
          return item.href
            ? <Link className="clinicalStageButton" key={item.key} href={item.href} aria-current={active ? "page" : undefined}>
                <span className="clinicalStageNumber">{String(index+1).padStart(2,"0")}</span>{item.label}
              </Link>
            : <button key={item.key} type="button" className="clinicalStageButton" aria-pressed={active}
                onClick={() => onSelect?.(item.key)}>
                <span className="clinicalStageNumber">{String(index+1).padStart(2,"0")}</span>{item.label}
              </button>;
        })}
      </div>
    </nav>
  );
}
