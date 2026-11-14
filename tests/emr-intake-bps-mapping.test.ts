import {expect,test} from 'vitest';
import {intakeSections,intakeSectionsForVersion,retiredMentalHealthFields,retiredContextFields} from '@/lib/patient/intake';
import {bpsNoteDomains,bpsSectionClassification,mapIntakeToBps,mapSavedBpsReportedFields,sanitizeBpsSnapshotAnswers,bpsSnapshotClinicalKeys,bpsVisibleSourceKeys,distinctBpsQuestionIdentities,equalBpsTimestampInstants,validBpsSubmissionChronology} from '@/lib/emr/intake-bps';
test('all 21 current and historical sections receive deliberate BPS dispositions',()=>{
 for(const sections of [intakeSections,intakeSectionsForVersion('legacy')]){
  expect(sections).toHaveLength(21);
  expect(new Set(sections.map(section=>section.title)).size).toBe(21);
  const report=mapIntakeToBps({});
  expect(report.sections).toHaveLength(21);
  for(const section of sections)expect(bpsSectionClassification[section.title]).toBeDefined();
 }
});
test('current and historical section mappings retain distinct question identities within each BPS section',()=>{
 for(const version of ['2026-11-02-directory-1', '2026-10-11']){
  const report=mapIntakeToBps({legal_packet_version:version});
  expect(report.sections).toHaveLength(21);
  for(const section of report.sections){
   const keys=section.fields.map(field=>field.key);
   expect(new Set(keys).size,section.title+' ('+version+')').toBe(keys.length);
  }
 }
});
test('BPS never treats unknown explicit questionnaire packet markers as approved historical source versions',()=>{
 for(const packet of ['legacy','2026-11-03-unknown','2030-future-questionnaire'])
  expect(()=>mapIntakeToBps({legal_packet_version:packet,counseling_reason:'PRIVATE_FICTIONAL_REPORT'}))
   .toThrow(/Unrecognized intake questionnaire version/);
 for(const packet of ['', '2026-10-11', '2026-11-02-directory-1'])
  expect(mapIntakeToBps({legal_packet_version:packet,counseling_reason:'Fictional concern'}).sections).toHaveLength(21);
});
test('approved packet-version routing metadata is not reported as an unmapped clinical answer',()=>{
 for(const version of ['2026-10-11','2026-11-02-directory-1']){
  const mapped=mapIntakeToBps({legal_packet_version:version,counseling_reason:'Fictional concern'});
  expect(mapped.sections).toHaveLength(21);
  expect(mapped.unmappedKeys).toEqual([]);
 }
 // Unknown answers still count, but neither schema-shaped nor malformed
 // field identities are returned to the protected BPS review.
 const extra=mapIntakeToBps({legal_packet_version:'2026-11-02-directory-1',
  extra_patient_jane_doe:'fictional report'});
 expect(extra.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
});

test('BPS rejects duplicated source question identities across separate sections',()=>{
 // Each section is individually unique, but the same question is improperly
 // credited to two sections. A clinical review cannot verify this topology.
 const forged=[{fields:[{key:'counseling_reason'}]},{fields:[{key:'counseling_reason'}]}];
 expect(distinctBpsQuestionIdentities(forged)).toBe(false);
 for(const version of ['', '2026-10-11', '2026-11-02-directory-1']){
  const sections=mapIntakeToBps({legal_packet_version:version}).sections;
  expect(distinctBpsQuestionIdentities(sections),version||'legacy blank').toBe(true);
 }
});
test('patient answers are mapped to original question labels without implying clinical verification',()=>{
 const report=mapIntakeToBps({counseling_reason:'Patient says low mood',suicidal_thoughts_current:'Yes',guardian_relationship:'Parent',
  trauma_history_checklist:'{"test":true}',roi_authorize:'Yes',private_extra:'unapproved'});
 const concern=report.sections.find(section=>section.title==='Presenting concerns and functional impact')!;
 expect(concern.disposition).toBe('clinical');
 expect(concern.fields.find(field=>field.key==='counseling_reason')?.value).toBe('Patient says low mood');
 expect(report.sections.find(section=>section.title==='Safety and risk screening')?.domain).toContain('safety');
 expect(report.sections.find(section=>section.title==='Authorization to share health information')?.disposition).toBe('reference');
 expect(report.sections.find(section=>section.title==='Trauma, family, social, educational, and occupational history')?.fields.some(f=>f.key==='trauma_history_checklist')).toBe(true);
 expect(report.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
});
test('separate review for medications and medical/substance use prevents silent BPS chart copying',()=>{
 const report=mapIntakeToBps({medication_entries:'{"sample":"reported"}',medical_substance_history:'{"sample":"reported"}'});
 for(const title of ['Medications','Medical & Substance Use History']){
  expect(report.sections.find(s=>s.title===title)?.disposition).toBe('separate-review');
 }
 expect(Object.keys(bpsNoteDomains)).toEqual(['presenting','treatment','medical','safety','family','goals','limitations']);
});

test('saved BPS read-back groups only permitted patient-reported clinical history, not legal or separately reviewed records',()=>{
 const saved=mapSavedBpsReportedFields({
  counseling_reason:'Reported low mood',suicidal_thoughts_current:'Yes',
  protective_factors:'Family support',medication_entries:'Do not expose a medication record',
  roi_authorize:'Yes',insurance_member:'Private insurance ID',unapproved_history:'Unclassified'
 });
 expect(saved.sections.find(s=>s.title==='Presenting concerns and functional impact')?.fields[0]?.value).toBe('Reported low mood');
 expect(saved.sections.find(s=>s.title==='Safety and risk screening')?.fields.map(f=>f.key)).toEqual(['suicidal_thoughts_current','protective_factors']);
 expect(saved.sections.every(s=>s.disposition==='clinical')).toBe(true);
 const readBack=JSON.stringify(saved.sections);
 expect(readBack).not.toContain('Do not expose a medication record');
 expect(readBack).not.toContain('Private insurance ID');
 expect(readBack).not.toContain('roi_authorize');
 expect(saved.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
});


test('protected historical BPS snapshots never transmit medication, structured trauma, insurance or legal answers',()=>{
 const actual=sanitizeBpsSnapshotAnswers({
  counseling_reason:'Reported concern',suicidal_thoughts_current:'Yes',
  guardian_relationship:'Parent',trauma_history:'Reported life event',
  trauma_history_checklist:'{"selections":{"sensitive":"yes"}}',
  treatment_history:'{"private":"structured"}',medication_entries:'Sensitive medication',
  medication_allergy_notes:'Sensitive allergy',medical_substance_history:'Sensitive medical record',
  roi_signature:'Private signature',insurance_member:'Private policy',
  unapproved_history:'Unknown',functional_impact:37
 });
 expect(actual.answers).toEqual({counseling_reason:'Reported concern',suicidal_thoughts_current:'Yes',
  guardian_relationship:'Parent',trauma_history:'Reported life event'});
 expect(actual.excludedCount).toBe(9);
 expect(bpsSnapshotClinicalKeys.has('trauma_history_checklist')).toBe(false);
 expect(bpsSnapshotClinicalKeys.has('medication_entries')).toBe(false);
});


test('all 21 intake sections audit source presence without exposing separately reviewed or administrative raw answers',()=>{
 const answers:Record<string,string>={};
 const sections=intakeSectionsForVersion('');
 for(const section of sections)for(const [key] of section.fields)answers[key]='PRIVATE_SOURCE_'+key;
 const report=mapIntakeToBps(answers);
 expect(report.sections).toHaveLength(21);
 for(let i=0;i<sections.length;i++){
  const original=sections[i],audited=report.sections[i];
  expect(audited.title).toBe(original.title);
  expect(audited.answered).toBe(original.fields.length);
  expect(audited.fields.map(field=>field.key)).toEqual(original.fields.map(([key])=>key));
  for(const field of audited.fields){
   expect(field.reported).toBe(true);
   if(audited.disposition!=='clinical'||!bpsVisibleSourceKeys.has(field.key)||['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version'].includes(field.type)){
    expect(field.sourceOnly).toBe(true);
    expect(field.value).toBe('Recorded in protected source; not copied into BPS.');
    expect(field.value).not.toContain('PRIVATE_SOURCE_');
   }else{
    expect(field.sourceOnly).toBe(false);
    expect(field.value).toBe('PRIVATE_SOURCE_'+field.key);
   }
  }
 }
 const apiPayload=JSON.stringify(report);
 for(const secret of ['PRIVATE_SOURCE_insurance_member','PRIVATE_SOURCE_medication_entries',
  'PRIVATE_SOURCE_medication_allergy_notes','PRIVATE_SOURCE_treatment_history',
  'PRIVATE_SOURCE_trauma_history_checklist','PRIVATE_SOURCE_roi_signature',
  'PRIVATE_SOURCE_medical_substance_history'])expect(apiPayload).not.toContain(secret);
 expect(apiPayload).toContain('PRIVATE_SOURCE_counseling_reason');
});
test('structured source is never echoed through historical clinical BPS readback',()=>{
 const result=mapSavedBpsReportedFields({counseling_reason:'Reported concern',
  treatment_history:'PRIVATE_STRUCTURED_HISTORY',trauma_history_checklist:'PRIVATE_STRUCTURED_TRAUMA',
  medication_entries:'PRIVATE_STRUCTURED_MEDICATION',insurance_member:'PRIVATE_POLICY'});
 const wire=JSON.stringify(result.sections);
 for(const secret of ['PRIVATE_STRUCTURED_HISTORY','PRIVATE_STRUCTURED_TRAUMA',
  'PRIVATE_STRUCTURED_MEDICATION','PRIVATE_POLICY'])expect(wire).not.toContain(secret);
 expect(wire).toContain('Reported concern');
});


test('directory-era 21-section intake fields receive the same source-only privacy controls',()=>{
 const legal_packet_version='2026-11-02-directory-1';
 const sections=intakeSectionsForVersion(legal_packet_version);
 const answers:Record<string,string>={legal_packet_version};
 for(const section of sections)for(const [key] of section.fields)answers[key]='PRIVATE_DIRECTORY_'+key;
 const report=mapIntakeToBps(answers);
 expect(sections).toHaveLength(21);
 expect(report.sections).toHaveLength(21);
 for(let i=0;i<sections.length;i++){
  expect(report.sections[i].title).toBe(sections[i].title);
  expect(report.sections[i].fields.map(field=>field.key)).toEqual(sections[i].fields.map(([key])=>key));
  expect(report.sections[i].answered).toBe(sections[i].fields.length);
  for(const field of report.sections[i].fields){
   const separate=report.sections[i].disposition!=='clinical'||!bpsVisibleSourceKeys.has(field.key)||
    ['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version'].includes(field.type);
   expect(field.sourceOnly).toBe(separate);
   expect(field.value).toBe(separate?'Recorded in protected source; not copied into BPS.':'PRIVATE_DIRECTORY_'+field.key);
  }
 }
 const wire=JSON.stringify(report);
 for(const secret of ['PRIVATE_DIRECTORY_insurance_member','PRIVATE_DIRECTORY_medication_entries',
  'PRIVATE_DIRECTORY_trauma_history_checklist','PRIVATE_DIRECTORY_treatment_signature'])
  expect(wire).not.toContain(secret);
});


test('ten non-active retired clinical responses stay routed without duplicating active medication history',()=>{
 const retired=[...retiredMentalHealthFields,...retiredContextFields].filter(([key])=>key!=='prior_psychiatric_medications');
 expect(retired).toHaveLength(10);
 const answers:Record<string,string>={counseling_reason:'Current presenting concern',unexpected_code:'Unmapped private answer'};
 for(const [key] of retired)answers[key]='Historical patient report for '+key;
 const report=mapIntakeToBps(answers);
 expect(report.sections).toHaveLength(21);
 const historical=report.sections.flatMap(section=>section.fields.filter(field=>field.type==='historical-patient-report')
  .map(field=>({...field,domain:section.title,disposition:section.disposition})));
 expect(historical).toHaveLength(10);
 for(const [key] of retired){
  const item=historical.find(field=>field.key===key);
  expect(item,'Unrouted retired clinical field: '+key).toBeDefined();
  expect(item?.disposition).toBe('clinical');
  expect(item?.reported).toBe(true);
  const protectedLegacy=key==='prior_psychiatric_medications'||key==='legal_history';
  expect(item?.sourceOnly).toBe(protectedLegacy);
  expect(item?.label).toContain('Historical patient report');
  expect(item?.value).toBe(protectedLegacy?'Recorded in protected source; not copied into BPS.':'Historical patient report for '+key);
  if(protectedLegacy)expect(JSON.stringify(report)).not.toContain('Historical patient report for '+key);
  expect(report.unmappedKeys).not.toContain(key);
 }
 expect(historical.filter(field=>field.domain==='Mental health treatment history')).toHaveLength(1);
 expect(historical.filter(field=>field.domain==='Trauma, family, social, educational, and occupational history')).toHaveLength(9);
 expect(report.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
 // The database snapshot remains explicitly allowlisted: displaying historical
 // patient testimony never silently creates a clinician fact or signed BPS record.
 const snapshot=sanitizeBpsSnapshotAnswers(answers);
 expect(snapshot.answers).toEqual({counseling_reason:'Current presenting concern'});
 for(const [key] of retired)expect(snapshot.answers).not.toHaveProperty(key);
 expect(snapshot.excludedCount).toBe(11);
});
test('retired intake fields stay absent when not reported and blanks cannot imply a negative history',()=>{
 const report=mapIntakeToBps({psychiatric_hospitalizations:' ',legal_history:''});
 expect(report.sections).toHaveLength(21);
 expect(report.sections.flatMap(section=>section.fields).filter(field=>field.type==='historical-patient-report')).toHaveLength(0);
 expect(report.unmappedKeys).toEqual([]);
});


test('the server BPS mapper withholds unexpected emergency contact and administrative raw values even when inside a clinical section',()=>{
 const secretName='CONFIDENTIAL_EMERGENCY_CONTACT_NAME';
 const secretPhone='CONFIDENTIAL_EMERGENCY_CONTACT_PHONE';
 const report=mapIntakeToBps({
  emergency_contact_name:secretName,emergency_contact_phone:secretPhone,
  counseling_reason:'Fictional presenting concern',guardian_relationship:'Parent'
 });
 const fields=report.sections.flatMap(section=>section.fields);
 for(const [key,secret] of [['emergency_contact_name',secretName],['emergency_contact_phone',secretPhone]]){
  const field=fields.find(item=>item.key===key);
  expect(field?.reported).toBe(true);
  expect(field?.sourceOnly).toBe(true);
  expect(field?.value).toContain('protected source');
  expect(JSON.stringify(report)).not.toContain(secret);
 }
 expect(fields.find(field=>field.key==='guardian_relationship')?.value).toBe('Parent');
 expect(fields.find(field=>field.key==='counseling_reason')?.value).toBe('Fictional presenting concern');
});

test('BPS attestation comparisons preserve microseconds and normalize timezone offsets',()=>{
 const receipt='2026-11-10T09:00:00.000001Z';
 const equivalent='2026-11-10T03:00:00.000001-06:00';
 const editedLater='2026-11-10T09:00:00.000002Z';
 expect(equalBpsTimestampInstants(receipt,equivalent)).toBe(true);
 expect(equalBpsTimestampInstants(receipt,editedLater)).toBe(false);
 expect(equalBpsTimestampInstants('not-a-date',receipt)).toBe(false);
 expect(validBpsSubmissionChronology('submitted',equivalent,receipt)).toBe(true);
 expect(validBpsSubmissionChronology('submitted',editedLater,receipt)).toBe(false);
 expect(validBpsSubmissionChronology('submitted',receipt,editedLater)).toBe(true);
 // RFC3339 fractions may contain more than six digits; never truncate a
 // later source edit to the same JavaScript millisecond as its attestation.
 expect(validBpsSubmissionChronology('submitted',
  '2026-11-10T09:00:00.000000001Z','2026-11-10T09:00:00Z')).toBe(false);
 expect(validBpsSubmissionChronology('draft','2026-11-10T09:00:00.000002Z',null)).toBe(true);
});

test('unknown BPS field identities containing fictional private text are counted but never echoed',()=>{
 const malformedName='FICTIONAL_PERSON 123-45-6789 confidential source';
 const report=mapIntakeToBps({counseling_reason:'Reported concern',[malformedName]:'Reported response'});
 expect(report.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
 expect(JSON.stringify(report)).not.toContain(malformedName);
 const history=mapSavedBpsReportedFields({counseling_reason:'Reported concern',[malformedName]:'Historical value'});
 expect(history.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
 expect(JSON.stringify(history)).not.toContain(malformedName);
 // Schema-shaped unknown names can contain a patient's identity or policy
 // number. Neither the current source nor saved-history readback may echo them.
 const shapedName='fictional_patient_jane_doe_birthdate_19800101';
 const shapedPolicy='insurance_member_fictional_policy_1234';
 const shaped=mapIntakeToBps({unknown_form_field_1:'yes',
  [shapedName]:'fictional report',[shapedPolicy]:'fictional report'});
 expect(shaped.unmappedKeys).toEqual(Array(3).fill('[unrecognized source field name withheld]'));
 expect(JSON.stringify(shaped)).not.toContain(shapedName);
 expect(JSON.stringify(shaped)).not.toContain(shapedPolicy);
 const saved=mapSavedBpsReportedFields({[shapedName]:'fictional report'});
 expect(saved.unmappedKeys).toEqual(['[unrecognized source field name withheld]']);
 expect(JSON.stringify(saved)).not.toContain(shapedName);
});
