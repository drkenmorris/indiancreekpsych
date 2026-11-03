import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import Client from '@/app/clinical-tests/ClinicalScreenClient';
import Tracker from '@/app/clinical-tests/TierTwoTracker';
import Report from '@/app/clinical-tests/TierTwoFinalReport';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {TIER_ONE as D,ADULT_PROFILE,HANDOFF_KEY,createHandoff,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
import {activePlan,progressRecords,moduleStatus,TRACKER_KEY} from '@/lib/clinical-tests/dsm/tier-two-progress';
import {SELECTION_KEY,ADOLESCENT_PROFILE} from '@/lib/clinical-tests/dsm/profiles';
const router=vi.hoisted(()=>({push:vi.fn(),back:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>router}));
afterEach(()=>{cleanup();store.clear();vi.restoreAllMocks();router.push.mockClear();router.back.mockClear();});
function seed(ids:string[]){const a:Answers=Object.fromEntries([...D.safety,...D.domains.flatMap(d=>d.questions)].map(q=>[q.id,'No']));ids.forEach(id=>a[D.domains.find(d=>d.id===id)!.questions[0].id]='Yes, currently');const p=createHandoff(a,true);store.setItem(HANDOFF_KEY,JSON.stringify(p));return p;}
async function ratings(){await screen.findByRole('button',{name:'Complete module'});const groups=screen.getAllByRole('group').filter(g=>within(g).queryAllByRole('radio').length>0);expect(groups.length).toBeGreaterThan(2);for(const g of groups)fireEvent.click(within(g).getAllByRole('radio')[0]);return groups.length;}
test('all19 actual modules require explicit ratings, retain labeled answers/findings and produce final completion',async()=>{
 seed(D.domains.map(d=>d.id));for(const [i,d] of D.domains.entries()){
  render(<Client screenKey={d.path}/>);const button=await screen.findByRole('button',{name:'Complete module'});expect((button as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByText(/Why the screener/)).toBeNull();const total=await ratings();expect(moduleStatus(progressRecords()[d.id])).toBe('Ready to complete');fireEvent.click(button);const record=progressRecords()[d.id];expect(moduleStatus(record)).toBe('Completed');expect(record.requiredIds).toHaveLength(total);expect(record.findings?.summary).toBeTruthy();expect(record.definition.items.every(q=>!!q.text)).toBe(true);expect(Object.values(progressRecords()).filter(r=>moduleStatus(r)==='Completed')).toHaveLength(i+1);expect(router.push).toHaveBeenCalledTimes(i+1);cleanup();
 }
 expect(router.push).toHaveBeenCalledWith('/clinical-tests/dev/tier3');
 render(<><Tracker/><Report/></>);expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Final screening report'}));expect(screen.getByText('19 of 19 selected modules completed')).toBeTruthy();expect(screen.getByText('All 19 selected Tier 2 modules completed.')).toBeTruthy();expect(screen.getAllByRole('heading',{name:'Recorded evidence summary'})).toHaveLength(19);expect(document.querySelectorAll('table')).toHaveLength(19);
},90000);
test('partial answers restore on return; editing completed module invalidates only its finding',async()=>{
 seed(['depressive','anxiety']);render(<Client screenKey="level2/depression"/>);await screen.findByRole('button',{name:'Complete module'});const first=screen.getAllByRole('radio',{name:/^0 /})[0];fireEvent.click(first);expect(moduleStatus(progressRecords().depressive)).toBe('In progress');cleanup();
 render(<Client screenKey="level2/depression"/>);await screen.findByRole('button',{name:'Complete module'});expect((screen.getAllByRole('radio',{name:/^0 /})[0] as HTMLInputElement).checked).toBe(true);for(const g of screen.getAllByRole('group').filter(g=>within(g).queryAllByRole('radio').length>0))fireEvent.click(within(g).getAllByRole('radio')[0]);fireEvent.click(screen.getByRole('button',{name:'Complete module'}));expect(moduleStatus(progressRecords().depressive)).toBe('Completed');fireEvent.click(screen.getAllByRole('radio',{name:/^1 /})[0]);expect(moduleStatus(progressRecords().depressive)).toBe('Ready to complete');expect(progressRecords().depressive.findings).toBeNull();expect(progressRecords().anxiety).toBeUndefined();
});
test('tracker updates live, counts only selected modules, reports partial before completion, and reset is scoped',async()=>{
 seed(['depressive','anxiety']);render(<><Tracker/><Client screenKey="level2/depression"/></>);expect(screen.getByText('0 of 2 selected modules completed')).toBeTruthy();await ratings();fireEvent.click(screen.getByRole('button',{name:'Complete module'}));expect(screen.getByText('1 of 2 selected modules completed')).toBeTruthy();cleanup();render(<Report/>);expect(screen.getByText('Partial report: 1 of 2 selected modules completed.')).toBeTruthy();expect(screen.getAllByRole('heading',{name:'Recorded evidence summary'})).toHaveLength(1);cleanup();
 render(<Client screenKey="level2/anxiety"/>);await ratings();fireEvent.click(screen.getByRole('button',{name:'Complete module'}));const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Reset'}));expect(progressRecords().anxiety).toBeUndefined();expect(moduleStatus(progressRecords().depressive)).toBe('Completed');confirm.mockRestore();
},20000);
test('new Tier1 attempt and different respondent cannot inherit completion; youth pending is explicit',async()=>{
 const original=seed(['depressive']);render(<Client screenKey="level2/depression"/>);await ratings();fireEvent.click(screen.getByRole('button',{name:'Complete module'}));cleanup();store.setItem(HANDOFF_KEY,JSON.stringify({...original,completedAt:'different-attempt'}));expect(progressRecords()).toEqual({});
 const p=ADOLESCENT_PROFILE,a:Answers=Object.fromEntries([...p.definition.safety,...p.definition.domains.flatMap(d=>d.questions)].map(q=>[q.id,'No']));a.depressive_1='Yes, currently';store.setItem(p.handoffKey,JSON.stringify(createHandoff(a,true,p)));store.setItem(SELECTION_KEY,JSON.stringify({age:'11-17',respondent:'self'}));expect(activePlan()?.profile.id).toBe('adolescent');render(<Report/>);expect(screen.getByText('Awaiting youth Tier 2 development')).toBeTruthy();expect(screen.queryByRole('link',{name:'Continue module'})).toBeNull();expect(screen.queryByRole('heading',{name:'Recorded evidence summary'})).toBeNull();
});
test('corrupt or old tracker data does not count as completion, and no selected domains remain explicit',()=>{
 seed([]);store.setItem(TRACKER_KEY,'bad');expect(progressRecords()).toEqual({});render(<Report/>);expect(screen.getByText('No automatic Tier 2 modules selected.')).toBeTruthy();expect(screen.queryByRole('heading',{name:'Recorded evidence summary'})).toBeNull();
});


test('summary opens only when the last unfinished selected module completes, regardless of order',async()=>{
 seed(['depressive','anxiety']);render(<Client screenKey="level2/anxiety"/>);await ratings();expect(router.push).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Complete module'}));expect(router.push).toHaveBeenLastCalledWith('/clinical-tests/dev/level2/depression');cleanup();
 render(<Client screenKey="level2/depression"/>);await ratings();expect(router.push).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Complete module'}));expect(router.push).toHaveBeenCalledTimes(2);expect(router.push).toHaveBeenCalledWith('/clinical-tests/dev/tier3');expect(Object.values(progressRecords()).every(r=>moduleStatus(r)==='Completed')).toBe(true);
},20000);
