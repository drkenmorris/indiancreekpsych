import { afterEach, expect, test } from "vitest";
import { clinicalSessionStore } from "../lib/clinical-tests/clinicalSessionStore";
import { asqDocuments, importAsqSnapshot, readAsqSnapshot } from "../lib/clinical-tests/asq-persistence";

afterEach(() => clinicalSessionStore.clear());

test("ASQ snapshots include all supported legacy sections and exclude unrelated tests", () => {
  clinicalSessionStore.setItem("asq_self_responses_v1",JSON.stringify({S001:2,S179:4}));
  clinicalSessionStore.setItem("asq_parent_responses_v1",JSON.stringify({"1":3}));
  clinicalSessionStore.setItem("asq_teacher_responses_v1",JSON.stringify({T001:1}));
  clinicalSessionStore.setItem("asq_current_student_id_v1","stu_synthetic_01");
  clinicalSessionStore.setItem("asq_profile_student_stu_synthetic_01_v1",JSON.stringify({informant:"Student",answeredCount:2}));
  clinicalSessionStore.setItem("asq_combined_report_stu_synthetic_01_v1","Synthetic combined narrative");
  clinicalSessionStore.setItem("sentinel_student_demo_stu_synthetic_01_v1",JSON.stringify({firstName:"Synthetic",school:"Example"}));
  clinicalSessionStore.setItem("asq_app_data_v1",JSON.stringify({children:[{profile:{name:"Test"},incidents:[]}]}));
  clinicalSessionStore.setItem("unrelated_conscienceos_assessment","must-not-export");
  const snapshot=readAsqSnapshot();
  expect(Object.keys(snapshot)).toHaveLength(8);
  expect(snapshot.unrelated_conscienceos_assessment).toBeUndefined();
  const docs=asqDocuments(snapshot);
  expect(docs.map(x=>x.document_kind)).toEqual(["student","parent","teacher","legacy_parent","student_demographics","combined_report","support_incidents"]);
  expect(docs[0].responses.S179).toBe(4);
  expect(docs[1].responses["1"]).toBe(3);
  expect(docs[2].responses.T001).toBe(1);
  expect(docs[4].responses.firstName).toBe("Synthetic");
  expect(docs[5].narrative).toBe("Synthetic combined narrative");
  expect(docs[6].responses.children).toHaveLength(1);

  // Restore only ASQ/ASEQ memory, leaving unrelated test state intact.
  clinicalSessionStore.setItem("asq_self_responses_v1",JSON.stringify({S001:0}));
  importAsqSnapshot(snapshot);
  expect(JSON.parse(clinicalSessionStore.getItem("asq_self_responses_v1")??"{}").S179).toBe(4);
  expect(clinicalSessionStore.getItem("unrelated_conscienceos_assessment")).toBe("must-not-export");
});

test("import removes previous ASQ data so different case records do not mix", () => {
  clinicalSessionStore.setItem("asq_student_legacy","previous");
  clinicalSessionStore.setItem("sentinel_student_demo_prior","prior");
  clinicalSessionStore.setItem("other_test","remain");
  importAsqSnapshot({asq_self_responses_v1:"{}"});
  expect(clinicalSessionStore.getItem("asq_student_legacy")).toBeNull();
  expect(clinicalSessionStore.getItem("sentinel_student_demo_prior")).toBeNull();
  expect(clinicalSessionStore.getItem("other_test")).toBe("remain");
});
