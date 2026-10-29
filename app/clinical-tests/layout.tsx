import type { ReactNode } from "react";
import AdministrativeShell from "@/app/components/AdministrativeShell";
import { patientAccess } from "@/lib/patient/access";
import ClinicalLabNavigation from "./ClinicalLabNavigation";
import "./clinical-test-ui.css";

export default async function ClinicalTestsLayout({ children }: { children: ReactNode }) {
  // Every test route remains administrator-only with verified email and aal2.
  await patientAccess(true, "/clinical-tests");
  return (
    <AdministrativeShell>
    <div className="clinicalLabShell">
      <ClinicalLabNavigation />
      <div className="clinicalLabContent">{children}</div>
    </div>
    </AdministrativeShell>
  );
}
