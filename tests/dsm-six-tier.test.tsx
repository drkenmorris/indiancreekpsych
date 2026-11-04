import {test,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {dsmAssignmentSource,dsmSourceForProfile,assignedQuestions,dsmRecipientState,validateDsmSave} from '../lib/clinical-tests/dsm/assignment';
import {checkedDsmSource,recipientSnapshot} from '../lib/clinical-tests/dsm/assignment-server';
import {snapshotHash,stableJson} from '../lib/emr/dsm-snapshot';
import {createClinicalSessionStore} from '../lib/clinical-tests/clinicalSessionStore';
import {activePlan,progressRecords} from '../lib/clinical-tests/dsm/tier-two-progress';
import {reviewState} from '../lib/clinical-tests/dsm/review';
import {differentialState} from '../lib/clinical-tests/dsm/differential';
import DsmRecipient from '../app/components/dsm/DsmRecipient';
const source=dsmAssignmentSource('adult','1990-01-02','2026-11-04');
function answers(all=false){const one=Object.fromEntries(source.questions.filter(q=>q.tier===1).map(q=>[q.id,q.domain==='safety'?'No':all?'Yes, currently':'No']));if(!all)one[source.profile.definition.domains[3].questions[0].id]='Yes, currently';return Object.fromEntries(assignedQuestions(source,one).filter(q=>!q.optional).map(q=>[q.id,one[q.id]??q.choices[0]]));}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('all 19 adult domains have six-tier source coverage and complete canonical clinician evidence',()=>{
 expect(source.format).toBe('icps-dsm-recipient/2');expect(source.questions.length).toBeLessThan(2000);
 const a=answers(true);for(const d of source.profile.definition.domains)expect(new Set(assignedQuestions(source,a).filter(q=>q.domain===d.id).map(q=>q.tier))).toEqual(new Set([1,2,3,4,5,6]));
 const store=createClinicalSessionStore();store.importDsm(dsmRecipientState(source,a,'2026-11-04T10:00:00Z'));const plan=activePlan(store),records=progressRecords(plan,store);
 expect(differentialState(plan,records,store).complete).toBe(true);expect(reviewState(plan,records,store).complete).toBe(true);expect(reviewState(plan,records,store).domains).toHaveLength(19);
 const snapshot=recipientSnapshot(source,a,'2026-11-04T10:00:00Z');if(!('clarification' in snapshot.report))throw Error('Missing full report');expect(snapshot.report.clarification.status).toBe('Clarification completed; clinician disposition remains separate');
 expect(snapshot.report.clarification.clinicianDrafts).toEqual({});
});
test('six-tier state retains Tier 6 examples/dates and gives repeat administrations independent content',()=>{
 const a=answers(),d=assignedQuestions(source,a).find(q=>q.tier===6)!.domain;a[`t6:${d}:example`]='Fictional first administration';a[`t6:${d}:onsetDate`]='2020-01-01';
 const first=recipientSnapshot(source,a,'2026-11-04T10:00:00Z');const second=recipientSnapshot(source,{...a,[`t6:${d}:example`]:'Fictional repeat'},'2026-11-04T11:00:00Z');
 if(!('clarification' in first.report))throw Error('Missing full report');expect(first.report.clarification.domains[0].record.example).toBe('Fictional first administration');expect(first.report.clarification.domains[0].record.onsetDate).toBe('2020-01-01');expect(first.contentHash).not.toBe(second.contentHash);
 expect(stableJson(first)).toContain('Fictional first administration');
});
test('earlier Tier 1–2 assignments remain pinned and open without silent upgrades',()=>{
 const old=dsmSourceForProfile(source.profile,true);expect(old.format).toBe('icps-dsm-recipient/1');expect(old.questions.every(q=>q.tier<=2)).toBe(true);expect(checkedDsmSource(old,snapshotHash(old))).toEqual(old);
 const tampered={...source,provenance:{}};expect(()=>checkedDsmSource(tampered,snapshotHash(tampered))).toThrow();
});
test('required later-tier omissions, invalid dates and oversized text cannot submit',()=>{
 const a=answers(),q=assignedQuestions(source,a).find(q=>q.tier===6&&!q.optional)!;const missing={...a};delete missing[q.id];
 const save=(answers:Record<string,string>)=>validateDsmSave({answers,page:0,expectedRevision:0,submit:true,confirmed:true},source);
 expect(()=>save(missing)).toThrow();expect(()=>save({...a,[`t6:${q.domain}:onsetDate`]:'2026-02-30'})).toThrow();expect(()=>save({...a,[`t6:${q.domain}:onsetDate`]:'2099-01-01'})).toThrow();expect(()=>save({...a,[`t6:${q.domain}:example`]:'x'.repeat(2001)})).toThrow();expect(()=>save(a)).not.toThrow();
});
test('recipient displays and saves Tier 6 optional text and dates with all original answers',async()=>{
 const a=answers(),questions=assignedQuestions(source,a),page=Math.floor((questions.length-1)/7),last=questions.slice(page*7),text=last.find(q=>q.kind==='text')!;
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({source,assignment:{id:'fictional',recipientName:'Fictional Recipient'},response:{answers:a,page,revision:3,status:'draft',identity_confirmed:true}})}).mockResolvedValueOnce({ok:true,json:async()=>({revision:4,status:'submitted'})});vi.stubGlobal('fetch',fetch);
 render(<DsmRecipient id="fictional"/>);await screen.findByRole('heading',{name:/Tier 6 clarification/});
 const field=document.querySelector(`textarea[name="${text.id}"]`)!;fireEvent.change(field,{target:{value:'Fictional saved context'}});fireEvent.click(screen.getByRole('checkbox',{name:/I am ready to submit/}));fireEvent.click(screen.getByRole('button',{name:'Submit questionnaire'}));await screen.findByRole('heading',{name:'Questionnaire submitted'});
 expect(JSON.parse(fetch.mock.calls[1][1].body).answers[text.id]).toBe('Fictional saved context');
});


test('native date blur commits a displayed date to the saved response',async()=>{
 const a=answers(),questions=assignedQuestions(source,a),date=questions.find(q=>q.kind==='date')!,page=Math.floor(questions.indexOf(date)/7);
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({source,assignment:{id:'fictional',recipientName:'Fictional Recipient'},response:{answers:a,page,revision:2,status:'draft',identity_confirmed:true}})}).mockResolvedValueOnce({ok:true,json:async()=>({revision:3,status:'draft'})});vi.stubGlobal('fetch',fetch);render(<DsmRecipient id="fictional"/>);
 const field=await screen.findByLabelText(date.text);fireEvent.blur(field,{target:{value:'2020-01-02'}});fireEvent.click(screen.getByRole('button',{name:'Save and pause'}));await screen.findByText(/Progress saved/);expect(JSON.parse(fetch.mock.calls[1][1].body).answers[date.id]).toBe('2020-01-02');
});
