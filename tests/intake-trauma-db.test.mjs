import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
const db=new PGlite();await db.exec('create role anon;create role authenticated;create schema private;');
for(const name of ['20261102171825_intake_treatment_history.sql','20261102173531_intake_medications.sql','20261102182635_intake_medical_substance.sql','20261102212246_legal_forms_revision.sql','20261102233010_intake_legal_directory.sql','20261103025453_intake_trauma_history.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
const valid={
 full_name:'Synthetic Patient',date_of_birth:'1990-01-01',address:'1 Example',city:'Olathe',state:'KS',postal_code:'66062',phone:'555-0100',email:'synthetic@example.com',
 emergency_contact_name:'Synthetic Contact',emergency_contact_relationship:'Friend',emergency_contact_phone:'555-0101',emergency_contact_permission:'Yes',
 insurance_coverage:'self-pay',counseling_reason:'Synthetic',functional_impact:'Synthetic',counseling_goals:'Synthetic',prior_mental_health_treatment:'No',medical_conditions:'None',medications_current:'None',
 suicidal_thoughts_current:'No',suicidal_plan_current:'No',homicidal_thoughts_current:'No',abuse_neglect_current:'No',
 comm_phone_calls:'No',comm_voicemail:'No',comm_text:'No',comm_email:'No',comm_portal:'Yes',comm_mail:'No',
 npp_received:'Yes',npp_signature:'Synthetic Patient',npp_signature_date:'2026-10-11',
 roi_authorize:'No',psych_notes_authorize:'No',part2_authorize:'No',sud_notes_authorize:'No',information_accuracy:'Yes',electronic_signature_consent:'Yes',patient_signature:'Synthetic Patient',patient_signature_date:'2026-10-11',
 legal_packet_version:'2026-10-11',treatment_consent:'Yes, I consent to outpatient counseling',treatment_signature:'Synthetic Patient',treatment_signature_date:'2026-10-11',
 financial_review:'I reviewed this information',financial_signature:'Synthetic Patient',financial_signature_date:'2026-10-11',
 telehealth_choice:'No, in-person care only',electronic_choice:'I agree to electronic intake and portal use',electronic_signature:'Synthetic Patient',electronic_signature_date:'2026-10-11',
 representative_signer:'Patient signing for myself'
};
const D=JSON.parse(readFileSync(new URL('../lib/patient/trauma-history-definition.json',import.meta.url),'utf8'));const checklist={definition_version:D.version,selections:Object.fromEntries(D.groups.map(g=>[g.key,g.choices]))};const check=(c,submit=false)=>db.query('select private.validate_intake_answers($1,$2)',[{...valid,trauma_history:'Retained first narrative',family_household:'Retained earlier answer',trauma_history_checklist:c},submit]);
await test('all54 choices accepted with retained first narrative and legacy context',async()=>{await check(JSON.stringify(checklist),true);});
await test('blank and partial unanswered groups allowed',async()=>{await check('');await check(JSON.stringify({definition_version:D.version,selections:{}}));});
await test('removed/unknown/duplicate/non-array choices and invalid structures rejected',async()=>{for(const c of ['bad','{}',JSON.stringify({...checklist,definition_version:'old'}),JSON.stringify({...checklist,selections:{bad:[]}}),JSON.stringify({...checklist,selections:{experiences:['None reported']}}),JSON.stringify({...checklist,selections:{experiences:['Physical assault or abuse','Physical assault or abuse']}}),JSON.stringify({...checklist,selections:{experiences:'wrong'}}),JSON.stringify({...checklist,selections:{experiences:[1]}})])await assert.rejects(check(c));});
await test('version null, unrecognized fields and overlong input rejected',async()=>{for(const c of [JSON.stringify({...checklist,definition_version:null}),JSON.stringify({...checklist,extra:1}),' '.repeat(12001)])await assert.rejects(check(c));});
await test('existing legal/medical validation and private helper protection retained',async()=>{await assert.rejects(db.query('select private.validate_intake_answers($1,false)',[{...valid,medical_substance_history:'bad'}]));await db.exec('set role authenticated');await assert.rejects(db.query('select private.validate_intake_trauma_history($1)',[JSON.stringify(checklist)]));await db.exec('reset role');});await db.close();
