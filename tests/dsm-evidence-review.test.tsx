import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {TIER_ONE as D,HANDOFF_KEY,createHandoff,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
import {activePlan,progressRecords,moduleSourceHash} from '@/lib/clinical-tests/dsm/tier-two-progress';
import {evidenceDefinition,evidenceItems,saveEvidence,answerLabel} from '@/lib/clinical-tests/dsm/evidence';
import {differentialState,saveFollowup,type Stage} from '@/lib/clinical-tests/dsm/differential';
import {reviewState,saveReview,saveDisposition,preparedReview,REVIEW_KEY} from '@/lib/clinical-tests/dsm/review';
import {reconcileCandidate,type CandidateEvidence} from '@/lib/clinical-tests/dsm/formulation';
import {prepareReportCopies} from '@/lib/clinical-tests/dsm/report-copies';
import Client from '@/app/clinical-tests/ClinicalScreenClient';
const router=vi.hoisted(()=>({push:vi.fn()}));vi.mock('next/navigation',()=>({useRouter:()=>router}));
afterEach(()=>{cleanup();store.clear();router.push.mockReset();});
function seed(ids=['depressive']){const a:Answers=Object.fromEntries([...D.safety,...D.domains.flatMap(d=>d.questions)].map(q=>[q.id,'No']));for(const id of ids)a[D.domains.find(d=>d.id===id)!.questions[0].id]='Yes, currently';store.setItem(HANDOFF_KEY,JSON.stringify(createHandoff(a,true)));for(const id of ids)saveEvidence(id,Object.fromEntries(evidenceItems(id).map(q=>[q.id,0])),true);}
function complete(stage:Stage){for(const u of differentialState().stages[stage])saveFollowup(stage,u.id,Object.fromEntries(u.questions.map(q=>[q.id,q.choices.includes('Yes')?'Yes':q.choices[0]])),true);}
function ready(ids=['depressive']){seed(ids);complete(3);complete(4);complete(5);}
function c(id:string,a='Yes',b='Yes',d='Yes'):CandidateEvidence{return {domain:id.split('-')[0],id,label:'Fictional area',tier3Question:'Initial pattern',tier3Answer:a,tier4Question:'Distinguishing context',tier4Answer:b,tier5Question:'Further context',tier5Answer:d,status:''};}
test('19 domains retain160 original symptom items; event, duration and impact have appropriate response types without diagnostic cutoffs',()=>{
 expect(evidenceDefinition.domains).toHaveLength(19);expect(evidenceDefinition.domains.flatMap(d=>d.items)).toHaveLength(160);
 for(const d of evidenceDefinition.domains){seed([d.id]);const items=evidenceItems(d.id);expect(saveEvidence(d.id,{},true)).toBe(false);expect(saveEvidence(d.id,{bad:0})).toBe(false);expect(saveEvidence(d.id,{[items[0].id]:99})).toBe(false);expect(saveEvidence(d.id,Object.fromEntries(items.map(q=>[q.id,q.choices.length-1])),true)).toBe(true);const r=progressRecords()[d.id];expect(r.findings?.summary).toContain('without a diagnostic cutoff');expect(r.findings?.summary).not.toMatch(/strong|likely|consistent with/);expect(answerLabel(r,'evidence:duration')).toBe('Prefer to discuss privately');}
 expect(evidenceItems('trauma')[0].choices).toEqual(['0 — No','1 — Yes','2 — Unsure','3 — Prefer to discuss privately']);
 expect(evidenceItems('depressive').find(q=>q.id==='evidence:duration')!.choices).toContain('6 months to less than 2 years');
});
test('explicit evidence rules reconcile sample-like uncertainty, contextual alternatives, contradictions and missing evaluation without diagnosis',()=>{
 expect(reconcileCandidate(c('anxiety-1','Unsure')).status).toContain('Later follow-up reported');
 expect(reconcileCandidate(c('anxiety-5','Yes','Yes','No')).status).toBe('Contextual explanation needs review');
 expect(reconcileCandidate(c('anxiety-2','Yes','Yes','No')).issues.join(' ')).toContain('Medical/substance evaluation');
 expect(reconcileCandidate(c('ocd_related-2','Yes','No','Yes')).status).toContain('Conflicting descriptions');
 expect(reconcileCandidate(c('trauma-2','Yes','Yes','No')).issues.join(' ')).toContain('dates remain unavailable');
 expect(reconcileCandidate(c('depressive-4')).issues.join(' ')).toContain('stress alone');
 expect(reconcileCandidate(c('depressive-1','Yes','No','No')).issues.join(' ')).toContain('same period');
 expect(reconcileCandidate(c('anxiety-1','No','No','No')).status).toContain('not excluded');
});
test('Tier6 preserves all19 areas and their tailored questions; upstream edits invalidate clarification and clinician drafts',()=>{
 ready(D.domains.map(d=>d.id));let s=reviewState();expect(s.ready).toBe(true);expect(s.domains).toHaveLength(19);expect(s.domains.every(d=>d.questions.length>=10)).toBe(true);expect(saveReview(s.domains[0].id,s.domains[0].record,true)).toBe(false);expect(saveReview(s.domains[0].id,{...s.domains[0].record,onsetDate:'2026-02-30'})).toBe(false);
 for(const d of s.domains)expect(saveReview(d.id,{...d.record,answers:Object.fromEntries(d.questions.map(q=>[q.id,q.choices[0]])),example:'A fictional example',notes:''},true)).toBe(true);
 s=reviewState();expect(s.complete).toBe(true);expect(saveDisposition(s.candidates[0].id,'Working hypothesis for clinician review','Fictional clinician rationale')).toBe(true);expect(preparedReview().clinicianDrafts[s.candidates[0].id]).toBeTruthy();
 const d=s.domains[0];saveReview(d.id,d.record,false);expect(reviewState().complete).toBe(false);expect(Object.keys(reviewState().reviews)).toHaveLength(0);
 const r=progressRecords()[d.id];saveEvidence(d.id,{...r.answers,'evidence:duration':7} as Record<string,number>,true);expect(reviewState().ready).toBe(false);expect(preparedReview().domains).toHaveLength(0);
},20000);
test('integrated copies include Tier2 context and Tier6 evidence/issues, with separate independent clinician drafts and immutable provenance',()=>{
 ready(['anxiety']);let d=reviewState().domains[0];const answers=Object.fromEntries(d.questions.map(q=>[q.id,q.choices.includes('Unsure')?'Unsure':q.choices[1]]));answers.function='Interference in one important area';answers.contributors='Reviewed; no contributor identified so far';saveReview(d.id,{...d.record,answers,onsetDate:'2025-01-01',eventDate:'2025-02-01',example:'Fictional avoidance example',notes:'Interview needed'},true);let s=reviewState();expect(s.candidates[0].evidence.some(e=>e.tier===2)).toBe(true);expect(s.candidates[0].evidence.some(e=>e.tier===6)).toBe(true);expect(s.candidates[0].issues.join(' ')).toContain('Tier 6');expect(s.candidates[0].issues.join(' ')).toContain('Impact descriptions differ');expect(s.candidates[0].issues.join(' ')).toContain('onset precedes');expect(s.candidates[0].issues.join(' ')).toContain('now reports review');
 expect(saveDisposition(s.candidates[0].id,'Not a real option','rationale')).toBe(false);expect(saveDisposition(s.candidates[0].id,'Needs further interview','')).toBe(false);expect(saveDisposition(s.candidates[0].id,'Needs further interview','Resolve timing and overlap')).toBe(true);
 const copies=prepareReportCopies(activePlan()!);expect(copies.provider.report).toEqual(copies.user.report);expect(copies.emr.report).toEqual(copies.user.report);expect(copies.emr.liveTransferEnabled).toBe(false);expect(copies.user.report.clarification.diagnosesConfirmed).toBe(false);copies.emr.report.clarification.candidates[0].label='changed';expect(copies.user.report.clarification.candidates[0].label).not.toBe('changed');
 const p=s.provenance;for(const [file,hash] of [['review-definition.json',p.definitionHash],['review.ts',p.engineHash],['formulation.ts',p.formulationHash]])expect(createHash('sha256').update(readFileSync('lib/clinical-tests/dsm/'+file)).digest('hex')).toBe(hash);
 store.setItem(REVIEW_KEY,'bad');expect(reviewState().complete).toBe(false);
});
test('rendered Tier6 completes area→integrated report and clinician working disposition remains distinct',()=>{
 ready();const view=render(<Client screenKey="tier6"/>);expect(screen.getByRole('heading',{name:'Tier 6 — Clarification and clinical formulation'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Complete clarification for this area'}));expect(screen.getByRole('alert').textContent).toContain('Choose a response');
 for(const group of screen.getAllByRole('group').filter(g=>within(g).queryAllByRole('radio').length>0))fireEvent.click(within(group).getAllByRole('radio')[0]);fireEvent.change(screen.getByLabelText(/A brief example/),{target:{value:'Fictional example only'}});fireEvent.click(screen.getByRole('button',{name:'Complete clarification for this area'}));expect(router.push).toHaveBeenLastCalledWith('/clinical-tests/dev/summary');expect(reviewState().complete).toBe(true);view.unmount();render(<Client screenKey="summary"/>);expect(screen.getByText('Clarification completed; clinician disposition remains separate')).toBeTruthy();expect(screen.getByText(/Fictional example only/)).toBeTruthy();expect(screen.getByText('Major depressive disorder')).toBeTruthy();
});
test('ongoing threat remains prominent on the integrated report regardless of diagnostic tier completion',()=>{seed();const r=progressRecords().depressive;saveEvidence('depressive',{...r.answers,'evidence:threat':1} as Record<string,number>,true);render(<Client screenKey="summary"/>);expect(screen.getByText('Direct safety review needed.')).toBeTruthy();expect(screen.getByText(/ongoing-threat concern/)).toBeTruthy();});

test('safety uncertainty and sudden cognitive change require review without being interpreted as confirmed risk or diagnosis',()=>{seed(['neurocognitive']);let r=progressRecords().neurocognitive;saveEvidence('neurocognitive',{...r.answers,'evidence:threat':2} as Record<string,number>,true);expect(progressRecords().neurocognitive.findings?.safetyFlag).toBe(true);complete(3);complete(4);complete(5);const d=reviewState().domains[0];saveReview(d.id,{...d.record,answers:Object.fromEntries(d.questions.map(q=>[q.id,q.choices[0]]))},true);expect(preparedReview().directReviewFlags.join(' ')).toContain('medical assessment');expect(preparedReview().diagnosesConfirmed).toBe(false);});
