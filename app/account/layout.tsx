import type { ReactNode } from "react";
import AdministrativeShell from "@/app/components/AdministrativeShell";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AdministrativeShell>{children}</AdministrativeShell>;
}
