import {expect,test} from 'vitest';
import {intakeSections,intakeSectionsForVersion} from '@/lib/patient/intake';
import {bpsNoteDomains,bpsSectionClassification,mapIntakeToBps,mapSavedBpsReportedFields} from '@/lib/emr/intake-bps';
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
