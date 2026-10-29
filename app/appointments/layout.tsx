import type { ReactNode } from "react";
import AdministrativeShell from "@/app/components/AdministrativeShell";

export default function AppointmentsLayout({ children }: { children: ReactNode }) {
  return <AdministrativeShell>{children}</AdministrativeShell>;
}
