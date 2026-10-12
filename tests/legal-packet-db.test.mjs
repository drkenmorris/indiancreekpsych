import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';

const db=new PGlite();
await db.exec('create schema private;');
const migration=readFileSync(new URL('../supabase/migrations/20261011200000_expand_patient_legal_packet.sql',import.meta.url),'utf8');
await db.exec(migration);
const valid={
 full_name:'Synthetic Patient',date_of_birth:'1990-01-01',address:'1 Example',city:'Olathe',state:'KS',postal_code:'66062',phone:'555-0100',email:'synthetic@example.com',
 emergency_contact_name:'Synthetic Contact',emergency_contact_relationship:'Friend',emergency_contact_phone:'555-0101',emergency_contact_permission:'Yes',
 insurance_coverage:'self-pay',counseling_reason:'Synthetic',functional_impact:'Synthetic',counseling_goals:'Synthetic',prior_mental_health_treatment:'No',medical_conditions:'None',medications_current:'None',
 suicidal_thoughts_current:'No',suicidal_plan_current:'No',homicidal_thoughts_current:'No',abuse_neglect_current:'No',
 comm_phone_calls:'No',comm_voicemail:'No',comm_text:'No',comm_email:'No',comm_portal:'Yes',comm_mail:'No',
 npp_received:'Yes',npp_signature:'Synthetic Patient',npp_signature_date:'2026-10-11',
 roi_authorize:'No',psych_notes_authorize:'No',information_accuracy:'Yes',electronic_signature_consent:'Yes',patient_signature:'Synthetic Patient',patient_signature_date:'2026-10-11',
 legal_packet_version:'2026-10-11',treatment_consent:'Yes, I consent to outpatient counseling',treatment_signature:'Synthetic Patient',treatment_signature_date:'2026-10-11',
 financial_review:'I reviewed this information',financial_signature:'Synthetic Patient',financial_signature_date:'2026-10-11',
 telehealth_choice:'No, in-person care only',electronic_choice:'I agree to electronic intake and portal use',electronic_signature:'Synthetic Patient',electronic_signature_date:'2026-10-11',
 representative_signer:'Patient signing for myself'
};
async function check(answers,submit=true){return db.query('select private.validate_intake_answers($1::jsonb,$2::boolean)',[answers,submit]);}
await test('valid separately signed intake accepts; optional authorizations can be No',async()=>{await check(valid);});
await test('patient may decline NPP acknowledgment without denying care',async()=>{
 await check({...valid,npp_received:'Decline acknowledgment',npp_signature:'',npp_signature_date:''});
});
await test('version and signed treatment cannot be forged or omitted',async()=>{
 await assert.rejects(check({...valid,legal_packet_version:'wrong'}),/revision/);
 await assert.rejects(check({...valid,treatment_signature:''}),/Sign treatment/);
 await assert.rejects(check({...valid,electronic_signature:''}),/electronic services/);
});
await test('telehealth refusal needs no telehealth signature but consent does',async()=>{
 await check({...valid,telehealth_choice:'No, in-person care only',telehealth_signature:''});
 await assert.rejects(check({...valid,telehealth_choice:'Yes, I consent to telehealth',telehealth_signature:''}),/telehealth consent/);
});
await test('authorizations remain separate and require disclosure details',async()=>{
 await assert.rejects(check({...valid,roi_authorize:'Yes'}),/release authorization/);
 await assert.rejects(check({...valid,psych_notes_authorize:'Yes'}),/psychotherapy-notes authorization/);
});
await test('representative requires legal capacity and signature',async()=>{
 await assert.rejects(check({...valid,representative_signer:'Parent\/guardian\/authorized representative'}),/representative capacity/);
});
await test('drafts may be saved while forms are incomplete',async()=>{await check({treatment_consent:'',financial_review:''},false);});
await db.close();
