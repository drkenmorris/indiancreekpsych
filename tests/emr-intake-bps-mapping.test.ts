import {expect,test} from 'vitest';
import {intakeSections,intakeSectionsForVersion} from '@/lib/patient/intake';
import {bpsNoteDomains,bpsSectionClassification,mapIntakeToBps,mapSavedBpsReportedFields,sanitizeBpsSnapshotAnswers,bpsSnapshotClinicalKeys} from '@/lib/emr/intake-bps';
test('all 21 current and historical sections receive deliberate BPS dispositions',()=>{
 for(const sections of [intakeSections,intakeSectionsForVersion('legacy')]){
  expect(sections).toHaveLength(21);
  const report=mapIntakeToBps({});
  expect(report.sections).toHaveLength(21);
  for(const section of sections)expect(bpsSectionClassification[section.title]).toBeDefined();
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
 expect(report.unmappedKeys).toContain('private_extra');
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
 expect(saved.unmappedKeys).toContain('unapproved_history');
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
   if(audited.disposition!=='clinical'||['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version'].includes(field.type)){
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
   const separate=report.sections[i].disposition!=='clinical'||
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
