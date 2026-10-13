import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import RtafiWorkspace from "./RtafiWorkspace";
export default async function RtafiRoute(){
 await patientAccess(true, "/clinical-tests/rtafi");
 return <main className="authPage" style={{maxWidth:1100,margin:"auto",padding:24}}>
  <Link href="/clinical-tests">← Clinical testing library</Link><h1>RTAFI — Relational Trauma and Attachment Functioning</h1>
  <p role="alert">Administrator-only synthetic QA. Not a clinical record, not for patients, and no data are saved to Supabase.</p>
  <RtafiWorkspace/>
 </main>;
}
