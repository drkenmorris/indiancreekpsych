import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {TIER_ONE as D,HANDOFF_KEY,createHandoff,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
import {saveModule,moduleSourceHash,progressRecords,activePlan} from '@/lib/clinical-tests/dsm/tier-two-progress';
import {differentialState,differentialReport,saveFollowup,differentialDefinition as bank,DIFFERENTIAL_KEY,type Stage} from '@/lib/clinical-tests/dsm/differential';
import {prepareReportCopies} from '@/lib/clinical-tests/dsm/report-copies';
import Client from '@/app/clinical-tests/ClinicalScreenClient';
const router=vi.hoisted(()=>({push:vi.fn()}));vi.mock('next/navigation',()=>({useRouter:()=>router}));
afterEach(()=>{cleanup();store.clear();router.push.mockReset();});
function seed(ids=D.domains.map(d=>d.id)){
 const answers:Answers=Object.fromEntries([...D.safety,...D.domains.flatMap(d=>d.questions)].map(q=>[q.id,'No']));for(const id of ids)answers[D.domains.find(d=>d.id===id)!.questions[0].id]='Yes, currently';
 store.setItem(HANDOFF_KEY,JSON.stringify(createHandoff(answers,true)));
 for(const id of ids)saveModule(id,{answers:{symptom:4},requiredIds:['symptom'],definition:{items:[{id:'symptom',text:'Fictional positive symptom'}],responseLabels:{4:'Very much'}},definitionHash:moduleSourceHash(id),updatedAt:'2026-11-03',completedAt:'2026-11-03',findings:{summary:'Fictional finding',notes:[]}});
}
function completeStage(stage:Stage,value='Yes'){
 for(const u of differentialState().stages[stage])expect(saveFollowup(stage,u.id,Object.fromEntries(u.questions.map(q=>[q.id,q.choices.includes(value)?value:q.choices[0]])),true)).toBe(true);
}
test('all-positive routing covers all19 domains and every candidate through tiers3,4,conditional5 with immutable definition provenance',()=>{
 seed();let state=differentialState();expect(state.ready).toBe(true);expect(state.stages[3]).toHaveLength(19);expect(state.stages[3].flatMap(u=>u.questions)).toHaveLength(65);expect(state.stages[4]).toHaveLength(0);
 completeStage(3);state=differentialState();expect(state.nextStage).toBe(4);expect(state.stages[4]).toHaveLength(19);expect(state.stages[4].flatMap(u=>u.questions)).toHaveLength(65+19*7);
 completeStage(4);expect(differentialState().nextStage).toBe(5);expect(differentialState().stages[5]).toHaveLength(19);completeStage(5);expect(differentialState().complete).toBe(true);
 const report=differentialReport();expect(report.candidates).toHaveLength(65);expect(report.diagnosesConfirmed).toBe(false);expect(report.clinicalReviewRequired).toBe(true);expect(report.stages[5].every(u=>u.reasons.length>0&&u.complete)).toBe(true);
 expect(createHash('sha256').update(readFileSync('lib/clinical-tests/dsm/differential-definition.json')).digest('hex')).toBe(report.definitionHash);
 expect(createHash('sha256').update(readFileSync('lib/clinical-tests/dsm/differential.ts')).digest('hex')).toBe(report.routingHash);
 const copies=prepareReportCopies(activePlan()!);expect(copies.emr.report).toEqual(copies.user.report);expect(copies.provider.report).toEqual(copies.user.report);expect(copies.emr.liveTransferEnabled).toBe(false);copies.emr.report.differential.candidates[0].label='changed';expect(copies.user.report.differential.candidates[0].label).not.toBe('changed');
});
test('negative, unknown and private answers are retained without declaring conditions absent; fifth tier reconciles mismatch',()=>{
 seed(['depressive']);completeStage(3,'No');expect(differentialState().stages[4]).toHaveLength(0);expect(differentialState().stages[5]).toHaveLength(1);expect(differentialReport().candidates.every(c=>c.status.includes('not ruled out'))).toBe(true);completeStage(5,'Unsure');expect(differentialState().complete).toBe(true);
 const u=differentialState().stages[3][0];saveFollowup(3,u.id,Object.fromEntries(u.questions.map(q=>[q.id,'Prefer to discuss privately'])),true);expect(differentialState().complete).toBe(false);expect(differentialState().stages[4][0].questions).toHaveLength(11);expect(differentialReport().candidates.every(c=>c.status==='Unresolved / not assessed')).toBe(true);
});
test('one coherent candidate skips conditional5; context contributors and conflicting answers select it',()=>{
 seed(['depressive']);const u=differentialState().stages[3][0];saveFollowup(3,u.id,Object.fromEntries(u.questions.map((q,i)=>[q.id,i===0?'Yes':'No'])),true);let v=differentialState().stages[4][0];const answers=Object.fromEntries(v.questions.map(q=>[q.id,q.id==='context:course'?'Distinct recurring episodes':q.choices.includes('No')&&q.id.startsWith('context:')&&q.id!=='context:impact'?'No':q.choices.includes('Yes')?'Yes':q.choices[0]]));saveFollowup(4,v.id,answers,true);expect(differentialState().stages[5]).toHaveLength(0);expect(differentialState().complete).toBe(true);
 saveFollowup(4,v.id,{...answers,'context:medical':'Yes'},true);expect(differentialState().stages[5][0].reasons.join(' ')).toContain('contributing factors');expect(differentialState().complete).toBe(false);
});
test('edits, incomplete responses, corrupt data, changed source and new attempt cannot carry forward stale completion',()=>{
 seed(['anxiety']);expect(saveFollowup(4,'anxiety',{},true)).toBe(false);expect(saveFollowup(3,'anxiety',{},true)).toBe(false);expect(saveFollowup(3,'anxiety',{garbage:'Yes'})).toBe(false);completeStage(3);completeStage(4);completeStage(5);expect(differentialState().complete).toBe(true);
 const u=differentialState().stages[3][0];saveFollowup(3,u.id,u.record.answers,false);expect(differentialState().stages[4]).toHaveLength(0);expect(differentialState().complete).toBe(false);saveFollowup(3,u.id,u.record.answers,true);
 const r=progressRecords().anxiety;saveModule('anxiety',{...r,answers:{symptom:0},updatedAt:'new'});expect(differentialState().stages[3][0].complete).toBe(false);
 store.setItem(DIFFERENTIAL_KEY,'bad');expect(differentialState().complete).toBe(false);store.removeItem(HANDOFF_KEY);expect(differentialState().ready).toBe(false);
});
test('real UI advances tiers3→4→5→summary, retains drafts on return and lets user revise completed evidence',async()=>{
 seed(['depressive']);let view=render(<Client screenKey="tier3"/>);expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Tier 3: Candidate patterns'}));
 fireEvent.click(screen.getByRole('button',{name:'Complete this area and continue'}));expect(screen.getByRole('alert').textContent).toContain('Choose an answer');
 for(const group of screen.getAllByRole('group'))fireEvent.click(within(group).getByRole('radio',{name:'Yes'}));view.unmount();view=render(<Client screenKey="tier3"/>);expect(screen.getAllByRole('radio',{name:'Yes'}).every(r=>(r as HTMLInputElement).checked)).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Complete this area and continue'}));expect(router.push).toHaveBeenLastCalledWith('/clinical-tests/dev/tier4');
 view.unmount();view=render(<Client screenKey="tier4"/>);for(const group of screen.getAllByRole('group'))fireEvent.click(within(group).getAllByRole('radio')[0]);fireEvent.click(screen.getByRole('button',{name:'Complete this area and continue'}));expect(router.push).toHaveBeenLastCalledWith('/clinical-tests/dev/tier5');
 view.unmount();view=render(<Client screenKey="tier5"/>);for(const group of screen.getAllByRole('group'))fireEvent.click(within(group).getByRole('radio',{name:'Unsure'}));fireEvent.click(screen.getByRole('button',{name:'Complete this area and continue'}));expect(router.push).toHaveBeenLastCalledWith('/clinical-tests/dev/summary');expect(differentialState().complete).toBe(true);
 view.unmount();render(<Client screenKey="summary"/>);expect(screen.getByText('Follow-up completed; clinician review required')).toBeTruthy();expect(screen.getByRole('heading',{name:'Major depressive disorder'})).toBeTruthy();expect(screen.getAllByText('Unsure').length).toBeGreaterThan(0);
});
test('adult prerequisites protect direct follow-up URLs without silently entering youth assessment',()=>{render(<Client screenKey="tier5"/>);expect(screen.queryByRole('radio')).toBeNull();expect(screen.getByText(/Complete every selected adult Tier 2/)).toBeTruthy();});
