"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const sections = [
  { label: "Main website", href: "/" },
  { label: "Psychological testing", href: "/clinical-tests" },
  { label: "Billing module — demo", href: "https://emr-workflow-demo.vercel.app/?module=billing", external: true },
  { label: "Scheduling and calendar", href: "/appointments" },
  { label: "EMR workspace — demo", href: "https://emr-workflow-demo.vercel.app/", external: true },
  { label: "Patient questionnaires", href: "/admin/questionnaires" },
  { label: "Account and security", href: "/account" },
];

/** Destination links only. Every clinic destination retains its own access checks. */
export default function AdministratorSections() {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target) && disclosure.current) {
        disclosure.current.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <details className="administratorSections" ref={disclosure}
      onKeyDown={event => {
        if (event.key === "Escape" && disclosure.current?.open) {
          event.preventDefault();
          disclosure.current.open = false;
          trigger.current?.focus();
        }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && disclosure.current) {
          disclosure.current.open = false;
        }
      }}>
      <summary ref={trigger}>Administrator sections <span aria-hidden="true">▴</span></summary>
      <nav className="administratorSectionsPanel" aria-label="Administrator section destinations">
        {sections.map(section => section.external ? (
          <a key={section.href} href={section.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            onClick={() => { if (disclosure.current) disclosure.current.open = false; }}>
            {section.label}<small>Opens in a new tab</small>
          </a>
        ) : (
          <Link key={section.href} href={section.href}
            onClick={() => { if (disclosure.current) disclosure.current.open = false; }}>
            {section.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
