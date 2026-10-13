import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import SrrciWorkspace from "./SrrciWorkspace";
export default async function SrrciPage() {
  await patientAccess(true, "/clinical-tests/srrci");
  return <main className="authPage" style={{maxWidth:1100,margin:"auto",padding:24}}>
    <Link href="/clinical-tests">← Clinical testing library</Link>
    <h1>SRRCI-X Relationship Assessment</h1>
    <p role="alert" style={{padding:12,background:"#fff7ed",border:"1px solid #fed7aa"}}>
      Administrator-only synthetic QA; not for real patients or diagnostic use.
      All responses remain in temporary browser memory and are not saved to Supabase.
    </p>
    <SrrciWorkspace />
  </main>;
}
