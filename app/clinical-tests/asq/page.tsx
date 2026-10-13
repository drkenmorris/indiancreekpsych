import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import AsqWorkspace from "./AsqWorkspace";
export default async function AsqPage() {
  await patientAccess(true, "/clinical-tests/asq");
  return <main className="authPage" style={{maxWidth:1150,margin:"auto",padding:24}}>
    <Link href="/clinical-tests">← Clinical testing library</Link>
    <h1>ASQ / ASEQ Autism Questionnaire Suite</h1>
    <p role="alert" style={{padding:12,background:"#fff7ed",border:"1px solid #fed7aa"}}>
      Administrator-only synthetic QA. Not validated for diagnosis. Do not enter real patient, child,
      parent, teacher or school information. Responses are held temporarily in browser memory only,
      are not transmitted to Supabase, and disappear when the page is reloaded.
    </p>
    <AsqWorkspace />
  </main>;
}
