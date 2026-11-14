import {expect,test} from 'vitest';
import {bpsVisibleSourceKeys,mapIntakeToBps} from '@/lib/emr/intake-bps';

test('retired medication and legal records stay in protected source instead of BPS narrative',()=>{
 const secretMedication='PRIVATE_PRIOR_MEDICATION_LIST';
 const secretLegal='PRIVATE_LEGAL_HISTORY';
 const allowedContext='Fictional household supports';
 const report=mapIntakeToBps({
  prior_psychiatric_medications:secretMedication,
  legal_history:secretLegal,
  family_household:allowedContext,
  counseling_reason:'Fictional presenting concern'
 });
 expect(report.sections).toHaveLength(21);
 const fields=report.sections.flatMap(section=>section.fields);
 for(const [key,secret] of [
  ['prior_psychiatric_medications',secretMedication],
  ['legal_history',secretLegal]
 ]){
  const field=fields.find(f=>f.key===key);
  expect(field,key).toBeDefined();
  expect(field?.reported).toBe(true);
  expect(field?.sourceOnly).toBe(true);
  expect(field?.value).toContain('protected source');
  expect(JSON.stringify(report)).not.toContain(secret);
  expect(bpsVisibleSourceKeys.has(key)).toBe(false);
 }
 expect(fields.find(f=>f.key==='family_household')?.value).toBe(allowedContext);
 expect(fields.find(f=>f.key==='counseling_reason')?.value).toBe('Fictional presenting concern');
});
