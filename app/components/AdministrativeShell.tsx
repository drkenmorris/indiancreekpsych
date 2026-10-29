import type { ReactNode } from "react";
import PublicFooter from "./PublicFooter";

/** Keep the same site navigation visible while only the workspace scrolls. */
export default function AdministrativeShell({ children }: { children: ReactNode }) {
  return (
    <div className="administrativeShell">
      <div className="administrativeScroll">{children}</div>
      <PublicFooter />
    </div>
  );
}
