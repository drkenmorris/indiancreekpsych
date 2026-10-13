import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import RdiiWorkspace from "./RdiiWorkspace";
export default async function RdiiRoute() {
  await patientAccess(true, "/clinical-tests/rdii");
  return <main className="authPage" style={{maxWidth:1100,margin:"auto",padding:24}}>
   <Link href="/clinical-tests">← Clinical testing library</Link><h1>RDII</h1>
   <p role="alert">Administrator synthetic QA only. Responses are not persisted to patient records or Supabase.</p>
   <RdiiWorkspace />
  </main>;
}
