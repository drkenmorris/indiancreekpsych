import Link from "next/link";
import { notFound } from "next/navigation";
import { patientAccess } from "@/lib/patient/access";
import ClinicalScreenClient from "../../ClinicalScreenClient";
import { allowedScreenKeys } from "@/lib/clinical-tests/catalog";

export default async function ClinicalDevScreenPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  // Never expose unvalidated clinical prototypes to patients.
  await patientAccess(true);
  const { slug } = await params;
  const key = slug.join("/");
  if (!allowedScreenKeys.includes(key)) notFound();
  return (
    <main className="authPage" style={{ maxWidth: 1040, margin: "0 auto", padding: "24px" }}>
      <Link href="/clinical-tests">← Clinical testing library</Link>
      <h1>Internal clinical screening validation</h1>
      <p role="alert" style={{ padding: 12, background: "#fff7ed", color: "#7c2d12", border: "1px solid #fed7aa" }}>
        Administrator-only synthetic QA. These imported screeners are not validated diagnostic instruments.
        Results are not sent to the patient record or saved to Supabase. Do not enter real patient information.
      </p>
      <ClinicalScreenClient screenKey={key} />
    </main>
  );
}
