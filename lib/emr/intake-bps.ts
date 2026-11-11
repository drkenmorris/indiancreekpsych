import {intakeSectionsForVersion} from '@/lib/patient/intake';

export type BpsDisposition='clinical'|'separate-review'|'reference';
type SectionClassification={domain:string;disposition:BpsDisposition};
// Every original and directory-era intake section is accounted for. Reference-only legal
// decisions are NOT converted into clinical consent or authorization by this assessment.
export const bpsSectionClassification:Record<string,SectionClassification>={
 'Demographics and contact information':{domain:'Identity and contact (central demographics)',disposition:'reference'},
 'Emergency contact, guardian, and responsible party':{domain:'Family, support and legal decision-making context',disposition:'clinical'},
 'Insurance and benefits information':{domain:'Administrative coverage (not BPS)',disposition:'reference'},
 'Presenting concerns and functional impact':{domain:'Presenting problems, functioning and goals',disposition:'clinical'},
 'Mental health treatment history':{domain:'Prior behavioral-health care',disposition:'clinical'},
 'Medications':{domain:'Medication/allergy reconciliation (separate chart review)',disposition:'separate-review'},
 'Medical & Substance Use History':{domain:'Medical and substance-use reconciliation (separate chart review)',disposition:'separate-review'},
 'Safety and risk screening':{domain:'Patient-reported safety and protective factors',disposition:'clinical'},
 'Trauma, family, social, educational, and occupational history':{domain:'Trauma and social history (separate trauma checklist review)',disposition:'clinical'},
 'Communication and confidential-contact preferences':{domain:'Confidential communications (not BPS)',disposition:'reference'},
 'Legal forms directory and questionnaire':{domain:'Protected legal directory (not clinical authorization)',disposition:'reference'},
 'Consent to Counseling and Informed Treatment':{domain:'Informed treatment consent (legal record only)',disposition:'reference'},
 'Financial Agreement and Good Faith Estimate':{domain:'Financial agreement (not BPS)',disposition:'reference'},
 'Telehealth Informed Consent':{domain:'Telehealth consent (legal record only)',disposition:'reference'},
 'Electronic Communications and Patient Portal':{domain:'Electronic communication consent (legal record only)',disposition:'reference'},
 'Legal Representative and Minor Consent':{domain:'Representative authority (legal record only)',disposition:'reference'},
 'Notice of Privacy Practices acknowledgment':{domain:'Privacy acknowledgment (legal record only)',disposition:'reference'},
 'Authorization to share health information':{domain:'Release-of-information authorization (legal record only)',disposition:'reference'},
 'Optional consent for Part 2 substance-use records':{domain:'Part 2 consent (legal record only)',disposition:'reference'},
 'Separate consent for SUD counseling notes':{domain:'SUD counseling-notes consent (legal record only)',disposition:'reference'},
 'Separate authorization for psychotherapy notes':{domain:'Psychotherapy-notes authorization (legal record only)',disposition:'reference'},
 'Patient attestation and consent to submit':{domain:'Patient attestation (not clinician attestation)',disposition:'reference'},
};
export const bpsNoteDomains={
 presenting:'Presenting concerns and functional impact',
 treatment:'Prior psychiatric/psychotherapy history',
 medical:'Medical conditions, medications and substance-use context (separate reconciliation required)',
 safety:'Safety, risk and protective factors (requires independent assessment)',
 family:'Developmental, family, social, educational and occupational history',
 goals:'Patient goals and recommended next clinical assessment',
 limitations:'Source limitations, unresolved items and clinical follow-up',
} as const;
export type BpsNoteKey=keyof typeof bpsNoteDomains;
export type BpsNotes=Record<BpsNoteKey,string>;
export const emptyBpsNotes=():BpsNotes=>Object.fromEntries(Object.keys(bpsNoteDomains).map(key=>[key,''])) as BpsNotes;
export function mapIntakeToBps(answers:Record<string,string>){
 const sections=intakeSectionsForVersion(answers.legal_packet_version||'').map(section=>{
  const rule=bpsSectionClassification[section.title];
  if(!rule)throw Error('An intake section is not yet approved for biopsychosocial review: '+section.title);
  const fields=section.fields.map(([key,label,type])=>({key,label,type,value:typeof answers[key]==='string'?answers[key]:''}));
  return {title:section.title,domain:rule.domain,disposition:rule.disposition,fields,
   answered:fields.filter(field=>field.value.trim()).length};
 });
 if(sections.length!==21)throw Error('The expected 21-section intake structure has changed. Review the source mapping.');
 const mapped=new Set(sections.flatMap(s=>s.fields.map(f=>f.key)));
 const unmappedKeys=Object.keys(answers).filter(key=>!mapped.has(key)&&typeof answers[key]==='string'&&answers[key].trim());
 return {sections,unmappedKeys};
}

/** Read back only explicitly clinical, patient-reported fields stored in a BPS snapshot.
 * Legal authorizations, insurance and separately reviewed medication data are never
 * presented as BPS clinical findings, including for historical database snapshots.
 */
export function mapSavedBpsReportedFields(answers:Record<string,string>){
 const mapped=mapIntakeToBps(answers);
 return {
  sections:mapped.sections.filter(section=>section.disposition==='clinical'&&section.answered>0)
   .map(section=>({...section,fields:section.fields.filter(field=>field.value.trim())})),
  unmappedKeys:mapped.unmappedKeys
 };
}

/** Mirrors the DB-owned BPS snapshot allowlist in migration 20261110103000.
 * Fail closed on legacy or unexpected review payload fields before data leave
 * the protected server. Sensitive legal, medication, and structured-trauma
 * records remain in their dedicated clinician reconciliation workflows.
 */
export const bpsSnapshotClinicalKeys = new Set<string>([
 "guardian_relationship",
 "custody_notes",
 "counseling_reason",
 "concern_onset",
 "concern_duration",
 "precipitating_events",
 "symptom_frequency",
 "symptom_severity",
 "functional_impact",
 "sleep",
 "appetite",
 "energy",
 "concentration",
 "work_school_impact",
 "relationship_impact",
 "daily_living_impact",
 "counseling_goals",
 "prior_mental_health_treatment",
 "prior_therapists",
 "prior_diagnoses",
 "self_harm_history",
 "suicide_attempt_history",
 "suicidal_thoughts_current",
 "suicidal_plan_current",
 "homicidal_thoughts_current",
 "violence_risk_details",
 "abuse_neglect_current",
 "weapons_access",
 "protective_factors",
 "trauma_history"
]);
export function sanitizeBpsSnapshotAnswers(raw:unknown):{answers:Record<string,string>;excludedCount:number}{
 const answers:Record<string,string>={};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {answers,excludedCount:1};
 let excludedCount=0;
 for(const [key,value] of Object.entries(raw)){
  if(bpsSnapshotClinicalKeys.has(key)&&typeof value==='string'&&value.trim())answers[key]=value;
  else excludedCount++;
 }
 return {answers,excludedCount};
}
