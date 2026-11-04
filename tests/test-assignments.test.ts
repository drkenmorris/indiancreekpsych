import {test,expect} from 'vitest';
import {normalizeAssignmentData,assignedTestOptions} from '../lib/clinical-tests/assignments';

const example={firstName:'Test',lastName:'Person',email:'SYNTHETIC@example.com',dob:'1998-06-15',testKey:'cseq',patientId:'00000000-0000-0000-0000-000000000201'};
test('seven retained psychological suites can be selected',()=>{
 expect(assignedTestOptions).toHaveLength(7);
 expect(new Set(assignedTestOptions.map(t=>t.value)).size).toBe(7);
 expect(assignedTestOptions.filter(t=>t.patientReady).length===5).toBe(true);
});
test('assignment sanitizes demographics and rejects invalid fields',()=>{
 const v=normalizeAssignmentData(example);
 expect(v.ok).toBe(true);
 if(v.ok){
  expect(v.data.recipient_email).toBe('synthetic@example.com');
  expect(v.data.test_key).toBe('cseq');
 }
 for(const invalid of [
  {...example,firstName:''},
  {...example,patientId:''},
  {...example,email:'not-an-address'},
  {...example,testKey:'../../admin'},
 ]){
  expect(normalizeAssignmentData(invalid).ok).toBe(false);
 }
});

test('ASQ assignment separates central patient from named respondent and requires exactly one version',()=>{const input={...example,testKey:'asq',patientId:'00000000-0000-0000-0000-000000000201',asqRole:'parent'};const result=normalizeAssignmentData(input);expect(result.ok).toBe(true);if(result.ok){expect(result.data.recipient_dob).toBeNull();expect(result.data.patient_id).toBe(input.patientId);expect(result.data.asq_role).toBe('parent');expect(result.data.recipient_email).toBe('synthetic@example.com');}for(const invalid of [{...input,asqRole:''},{...input,asqRole:'guardian'},{...input,patientId:''},{...input,email:''},{...input,firstName:''},{...input,testKey:'cseq',patientId:'00000000-0000-0000-0000-000000000201'}])expect(normalizeAssignmentData(invalid).ok).toBe(false);});
