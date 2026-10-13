import { clinicalTestSuites } from "@/lib/clinical-tests/menu-catalog";

export type AssignedTestKey = (typeof clinicalTestSuites)[number]["key"];
export const assignedTestOptions = clinicalTestSuites.map(s => ({
  value: s.key,
  label: s.label,
  // The imported test modules have not yet been released for patient use.
  patientReady: false,
}));
export function assignedTestLabel(key: string): string {
  return assignedTestOptions.find(t => t.value === key)?.label ?? "Psychological assessment";
}
export function validAssignedTest(key: unknown): key is AssignedTestKey {
  return typeof key === "string" && assignedTestOptions.some(t => t.value === key);
}

export function normalizeAssignmentData(value: unknown):
 { ok: true; data: { recipient_first_name:string; recipient_last_name:string; recipient_email:string; recipient_dob:string; test_key:AssignedTestKey } } | {ok:false;message:string} {
 if (!value || typeof value !== "object") return {ok:false,message:"Invalid request."};
 const v=value as Record<string,unknown>;
 const first=typeof v.firstName==="string"?v.firstName.trim():"";
 const last=typeof v.lastName==="string"?v.lastName.trim():"";
 const email=typeof v.email==="string"?v.email.trim().toLowerCase():"";
 const dob=typeof v.dob==="string"?v.dob.trim():"";
 if (!first || first.length>100 || !last || last.length>100)
  return {ok:false,message:"Enter the patient's first and last names."};
 if (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return {ok:false,message:"Enter a valid patient email address."};
 if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return {ok:false,message:"Enter a valid date of birth."};
 const date=new Date(dob+"T00:00:00Z");
 if (Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==dob||
     date>new Date() || dob<"1900-01-01")
  return {ok:false,message:"Enter a real date of birth in the past."};
 if (!validAssignedTest(v.testKey)) return {ok:false,message:"Select a psychological test."};
 return {ok:true,data:{recipient_first_name:first,recipient_last_name:last,
   recipient_email:email,recipient_dob:dob,test_key:v.testKey}};
}
