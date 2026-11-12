import {intakeSectionsForVersion,retiredMentalHealthFields,retiredContextFields} from '@/lib/patient/intake';

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
/** Accept complete ISO-8601/RFC3339 source timestamps only. Date.parse alone also
 * accepts ambiguous dates (e.g. "1") and silently normalizes impossible days.
 * Do not attach clinical source/review provenance to such values.
 */
export function validBpsTimestamp(value:unknown):value is string {
 if(typeof value!=='string')return false;
 const match=/^(\\d{4})-(\\d{2})-(\\d{2})T(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d{1,9})?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)$/.exec(value);
 if(!match||!Number.isFinite(Date.parse(value)))return false;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate();
}
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
// Previous questionnaire versions retained patient reports that no longer have
// inputs on the current 21-section form. Route every retired clinical-context
// field to an existing BPS domain for explicit clinician inspection. They remain
// patient reports and are NOT added to immutable DB-owned clinical snapshots.
const historicalBpsDomain:Record<string,string>={
 psychiatric_hospitalizations:'Mental health treatment history',
 prior_psychiatric_medications:'Mental health treatment history',
 family_mental_health_history:'Trauma, family, social, educational, and occupational history',
 family_household:'Trauma, family, social, educational, and occupational history',
 social_supports:'Trauma, family, social, educational, and occupational history',
 education_history:'Trauma, family, social, educational, and occupational history',
 employment_history:'Trauma, family, social, educational, and occupational history',
 military_history:'Trauma, family, social, educational, and occupational history',
 legal_history:'Trauma, family, social, educational, and occupational history',
 cultural_spiritual_factors:'Trauma, family, social, educational, and occupational history',
 strengths_interests:'Trauma, family, social, educational, and occupational history',
};
// Older intake versions included medication-list and legal-history free text in
// general context. Both must remain in their dedicated protected source review,
// not in BPS narrative previews, even when the upstream field type is mislabeled.
const protectedHistoricalKeys=new Set(['prior_psychiatric_medications','legal_history']);
const historicalClinicalFields=[...retiredMentalHealthFields,...retiredContextFields];
export function mapIntakeToBps(answers:Record<string,string>){
 const sections=intakeSectionsForVersion(answers.legal_packet_version||'').map(section=>{
  const rule=bpsSectionClassification[section.title];
  if(!rule)throw Error('An intake section is not yet approved for biopsychosocial review: '+section.title);
  // Audit all 21 sections but never transmit raw legal decisions, insurance
  // identifiers or structured records handled by dedicated reconciliation modules.
  const structuredSourceTypes=new Set(['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version']);
  const fields=section.fields.map(([key,label,type])=>{
   const raw=typeof answers[key]==='string'?answers[key]:'';
   const reported=raw.trim().length>0;
   const sourceOnly=reported&&(rule.disposition!=='clinical'||structuredSourceTypes.has(type)||!bpsVisibleSourceKeys.has(key));
   return {key,label,type,value:sourceOnly?'Recorded in protected source; not copied into BPS.':raw,
    sourceOnly,reported};
  });
  // Fail closed at the API boundary, not only in the browser: current and future\n  // intake fields are raw-readable only when explicitly approved for BPS context.\n  // These fields are no longer on the editable intake. Surface nonempty legacy
  // statements in the protected source review, explicitly labeled historical;
  // do not synthesize negatives for missing responses or silently sign a chart.
  for(const [key,label] of historicalClinicalFields){
   if(historicalBpsDomain[key]!==section.title)continue;
   const raw=typeof answers[key]==='string'?answers[key]:'';
   if(raw.trim()){
    const protectedSource=protectedHistoricalKeys.has(key);
    fields.push({key,label:'Historical patient report — '+label,
     type:'historical-patient-report',value:protectedSource?'Recorded in protected source; not copied into BPS.':raw,
     sourceOnly:protectedSource,reported:true});
   }
  }
  return {title:section.title,domain:rule.domain,disposition:rule.disposition,fields,
   answered:fields.filter(field=>field.reported).length};
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
/** A second presentation-layer allowlist. Only specifically approved clinical
 * answers and known retired contextual reports can appear in BPS read-only
 * context. A malformed upstream API must not relabel legal, insurance, or
 * medication keys as innocuous clinical text to expose them in this view.
 * Snapshot storage retains its stricter separate bpsSnapshotClinicalKeys list.
 */
export const bpsVisibleSourceKeys = new Set<string>([
 ...bpsSnapshotClinicalKeys,
 ...Object.keys(historicalBpsDomain).filter(key=>!protectedHistoricalKeys.has(key))
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

/** Fail-closed historical clinician-note readback. A malformed or pre-validation
 * database row must not introduce unknown fields into the protected BPS API or
 * the original clinician review. This does not modify the saved source record.
 */
export function sanitizeBpsClinicianNotes(raw:unknown):{notes:BpsNotes;excludedCount:number}{
 const notes=emptyBpsNotes();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {notes,excludedCount:1};
 let excludedCount=0;
 for(const [key,value] of Object.entries(raw)){
  if(Object.prototype.hasOwnProperty.call(bpsNoteDomains,key)&&typeof value==='string'&&value.length<=4000)
   notes[key as BpsNoteKey]=value;
  else excludedCount++;
 }
 return {notes,excludedCount};
}
