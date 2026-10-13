import {test,expect} from 'vitest';
import {normalizeAssignmentData,assignedTestOptions} from '../lib/clinical-tests/assignments';

const example={firstName:'Test',lastName:'Person',email:'SYNTHETIC@example.com',dob:'1998-06-15',testKey:'asq'};
test('all eight relocated psychological suites can be selected',()=>{
 expect(assignedTestOptions).toHaveLength(8);
 expect(new Set(assignedTestOptions.map(t=>t.value)).size).toBe(8);
 expect(assignedTestOptions.every(t=>t.patientReady===false)).toBe(true);
});
test('assignment sanitizes demographics and rejects invalid fields',()=>{
 const v=normalizeAssignmentData(example);
 expect(v.ok).toBe(true);
 if(v.ok){
  expect(v.data.recipient_email).toBe('synthetic@example.com');
  expect(v.data.test_key).toBe('asq');
 }
 for(const invalid of [
  {...example,firstName:''},
  {...example,dob:'2020-02-30'},
  {...example,dob:'2035-12-31'},
  {...example,email:'not-an-address'},
  {...example,testKey:'../../admin'},
 ]){
  expect(normalizeAssignmentData(invalid).ok).toBe(false);
 }
});
