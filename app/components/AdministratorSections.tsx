"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const sections = [
  { label: "Main website", href: "/" },
  { label: "Psychological testing", href: "/clinical-tests" },
  { label: "EMR billing preview", href: "/emr?module=billing" },
  { label: "Scheduling and calendar", href: "/appointments" },
  { label: "Open EMR", href: "/emr" },
  { label: "Patient questionnaires", href: "/admin/questionnaires" },
  { label: "Newsletter library & calendar", href: "/admin/newsletters" },
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
        {sections.map(section => (
          <Link key={section.href} href={section.href}
            onClick={() => { if (disclosure.current) disclosure.current.open = false; }}>
            {section.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
