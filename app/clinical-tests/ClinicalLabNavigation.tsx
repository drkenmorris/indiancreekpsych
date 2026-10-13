"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinicalTestSuites } from "@/lib/clinical-tests/menu-catalog";

export default function ClinicalLabNavigation() {
  const pathname = usePathname() ?? "/clinical-tests";
  return (
    <header className="clinicalLabHeader">
      <div className="clinicalLabHeaderTop">
        <Link href="/clinical-tests" className="clinicalLabBrand">
          <span className="clinicalLabMark" aria-hidden="true">IC</span>
          <span><strong>Psychological Testing</strong><small>Administrator QA workspace</small></span>
        </Link>
        <div className="clinicalLabHeaderActions">
          <Link href="/clinical-tests" className="clinicalLabDirectoryLink">All tests</Link>
          <Link href="/admin/assign-test" className="clinicalLabDirectoryLink">Assign a Test</Link>
          <Link href="/account" className="clinicalLabDirectoryLink">Account</Link>
          <Link href="/" className="clinicalLabDirectoryLink">Main site</Link>
        </div>
      </div>
      <nav className="clinicalLabSuiteNav" aria-label="Psychological test suite navigation">
        <Link href="/clinical-tests" className="clinicalLabSuiteLink" aria-current={pathname === "/clinical-tests" ? "page" : undefined}>Overview</Link>
        {clinicalTestSuites.map(suite => {
          const active = pathname === suite.href || pathname.startsWith(suite.href.split("/").slice(0,3).join("/") + "/");
          return <Link key={suite.key} href={suite.href} className="clinicalLabSuiteLink" aria-current={active ? "page" : undefined}>{suite.short}</Link>;
        })}
      </nav>
    </header>
  );
}
