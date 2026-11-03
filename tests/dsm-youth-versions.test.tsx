import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import {createHash} from 'node:crypto';
import Selector,{TierOneQuestionnaire} from '@/app/clinical-tests/TierOneScreen';
import {ADULT_PROFILE,HANDOFF_KEY,createHandoff,readHandoff,evaluateTierOne,type ScreenProfile,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
import {ADOLESCENT_PROFILE as A,parentProfile,appropriateProfile,SELECTION_KEY} from '@/lib/clinical-tests/dsm/profiles';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(()=>{cleanup();store.clear();});
const all=(p:ScreenProfile):Answers=>Object.fromEntries([...p.definition.safety,...p.definition.domains.flatMap(d=>d.questions)].map(q=>[q.id,'No']));
function saved(p:ScreenProfile,a:Answers){store.setItem(p.draftKey,JSON.stringify({version:p.definition.version,definitionHash:p.hash,populationConfirmed:true,answers:a,step:20}));store.setItem(p.handoffKey,JSON.stringify(createHandoff(a,true,p)));}
async function choose(age:string,respondent:string){fireEvent.change(await screen.findByLabelText('Patient age group'),{target:{value:age}});fireEvent.click(screen.getByRole('radio',{name:respondent}));fireEvent.click(screen.getByRole('button',{name:'Open recommended version'}));}
test('age/respondent matrix recommends only appropriate versions, keeping under6 and adult informant out',()=>{
 expect(appropriateProfile('18+','self')?.id).toBe('adult');expect(appropriateProfile('11-17','self')?.id).toBe('adolescent');
 for(const age of ['6-10','11-17'])expect(appropriateProfile(age,'parent')?.ageBand).toBe(age);
 for(const [age,r] of [['under6','self'],['under6','parent'],['6-10','self'],['18+','parent'],['bad','self']])expect(appropriateProfile(age,r)).toBeNull();
});
test('both original youth versions have19domains/60questions, distinct identities/hashes and review unknown caregiver observations',()=>{
 for(const p of [A,parentProfile('6-10'),parentProfile('11-17')]){
  expect(p.definition.domains).toHaveLength(19);expect(p.definition.domains.flatMap(d=>d.questions)).toHaveLength(57);expect(createHash('sha256').update(JSON.stringify(p.definition)).digest('hex')).toBe(p.hash);
  const a=all(p);expect(evaluateTierOne(a,true,p).complete).toBe(true);
  for(const d of p.definition.domains){const b={...a,[d.questions[0].id]:'Yes, currently'};expect(evaluateTierOne(b,true,p).routedDomains).toEqual([d.id]);}
  expect(readHandoff(JSON.stringify(createHandoff(a,true,p)))).toBeNull();
 }
 const p=parentProfile('6-10'),a=all(p);a.neurodev_1='Not observed / do not know';a.safety_self='Not observed / do not know';const r=evaluateTierOne(a,true,p);expect(r.reviewDomains).toEqual(['neurodev']);expect(r.safetyReview).toBe(true);expect(r.routedDomains).toEqual([]);
 const raw=JSON.stringify(createHandoff(a,true,p));expect(readHandoff(raw,parentProfile('11-17'))).toBeNull();expect(readHandoff(raw,A)).toBeNull();
});
test('initial selector blocks unsupported combinations and shows adolescent-specific wording',async()=>{
 render(<Selector/>);await choose('6-10','Patient / self-report');expect(screen.getByRole('alert').textContent).toContain('supported');
 fireEvent.change(screen.getByLabelText('Patient age group'),{target:{value:'11-17'}});fireEvent.click(screen.getByRole('button',{name:'Open recommended version'}));
 await screen.findByRole('heading',{name:'Adolescent self-report · 19-domain screening'});expect(screen.queryByRole('checkbox')).toBeNull();expect(screen.getByText('Version confirmed:')).toBeTruthy();
 expect(screen.getByText(A.definition.safety[0].text)).toBeTruthy();expect(JSON.parse(store.getItem(SELECTION_KEY)!).age).toBe('11-17');
});
test('switching versions keeps drafts/results separate and restores adult bridge only for adult selection',async()=>{
 const aa=all(ADULT_PROFILE);aa.depressive_1='Yes, currently';saved(ADULT_PROFILE,aa);saved(A,all(A));
 render(<Selector/>);await choose('18+','Patient / self-report');await screen.findByRole('button',{name:'Tier 2 plan prepared'});expect(readHandoff(store.getItem(HANDOFF_KEY))?.routedDomains).toEqual(['depressive']);
 fireEvent.click(screen.getByRole('button',{name:'Change age group or respondent'}));expect(store.getItem(HANDOFF_KEY)).toBeNull();await choose('11-17','Patient / self-report');await screen.findByRole('button',{name:'Tier 2 plan prepared'});expect(screen.queryByRole('link',{name:/Open Tier 2/})).toBeNull();expect(store.getItem(HANDOFF_KEY)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Change age group or respondent'}));await choose('18+','Patient / self-report');await screen.findByRole('button',{name:'Tier 2 plan prepared'});expect(readHandoff(store.getItem(HANDOFF_KEY))?.routedDomains).toEqual(['depressive']);
 expect(JSON.parse(store.getItem(A.draftKey)!).answers.depressive_1).toBe('No');
});
test('parent completed plan carries respondent/age provenance, no adult link, independent clear and edit invalidation',async()=>{
 const p=parentProfile('6-10'),a=all(p);a.anxiety_1='Yes, in the past';saved(p,a);saved(parentProfile('11-17'),all(parentProfile('11-17')));
 render(<TierOneQuestionnaire profile={p}/>);await screen.findByRole('button',{name:'Tier 2 plan prepared'});expect(screen.getByText(/Youth follow-up selected/)).toBeTruthy();expect(screen.queryByRole('link',{name:/Open Tier 2/})).toBeNull();
 const payload=readHandoff(store.getItem(p.handoffKey),p)!;expect(payload.respondent).toBe('parent');expect(payload.ageBand).toBe('6-10');expect(payload.adultConfirmed).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:/5. Worry/}));fireEvent.click(within(screen.getByRole('group',{name:p.definition.domains[4].questions[0].text})).getByRole('radio',{name:'Not observed / do not know'}));expect(store.getItem(p.handoffKey)).toBeNull();
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Clear fictional screening session'}));expect(store.getItem(p.draftKey)).toBeNull();expect(store.getItem(parentProfile('11-17').draftKey)).toBeTruthy();confirm.mockRestore();
});
test('actual youth wizard completes60answers, records reasons and does not send youth to adult Tier2',async()=>{
 render(<TierOneQuestionnaire profile={A}/>);await screen.findByRole('checkbox');fireEvent.click(screen.getByRole('checkbox'));
 for(const q of A.definition.safety)fireEvent.click(within(screen.getByRole('group',{name:q.text})).getByRole('radio',{name:'No'}));fireEvent.click(screen.getByRole('button',{name:'Next section'}));
 for(const [i,d] of A.definition.domains.entries()){for(const [j,q] of d.questions.entries())fireEvent.click(within(screen.getByRole('group',{name:q.text})).getByRole('radio',{name:i===0&&j===0?'Yes, currently':'No'}));fireEvent.click(screen.getByRole('button',{name:i===18?'Continue to selected Tier 2 questions':'Next section'}));}
 await waitFor(()=>expect(readHandoff(store.getItem(A.handoffKey),A)?.routedDomains).toEqual(['neurodev']));expect(store.getItem(HANDOFF_KEY)).toBeNull();expect(screen.queryByRole('link',{name:/Open Tier 2/})).toBeNull();
},20000);
