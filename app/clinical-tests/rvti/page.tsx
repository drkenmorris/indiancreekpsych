import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import RvtiDevDashboard from "@/lib/clinical-tests/legacy/src/assessments/rvti/dev/RvtiDevDashboard";
export default async function RvtiRoute(){
 await patientAccess(true, "/clinical-tests/rvti");
 return <main className="authPage" style={{maxWidth:1100,margin:"auto",padding:24}}>
  <Link href="/clinical-tests">← Clinical testing library</Link><h1>RVTI Developmental Assessment</h1>
  <p role="alert">Administrator synthetic QA only. Not for diagnostic use. Responses are not saved to patient records.</p>
  <RvtiDevDashboard />
 </main>;
}
