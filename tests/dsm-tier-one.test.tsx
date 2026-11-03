import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import {createHash} from 'node:crypto';
import {TierOneQuestionnaire as TierOneScreen} from '@/app/clinical-tests/TierOneScreen';
import {TIER_ONE as D,DEFINITION_SHA256,HANDOFF_KEY,DRAFT_KEY,domainResults,evaluateTierOne,createHandoff,readHandoff,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(()=>{cleanup();store.clear();});
const all=(value='No'):Answers=>Object.fromEntries([...D.safety,...D.domains.flatMap(d=>d.questions)].map(q=>[q.id,value]));
test('original immutable 19-domain/60-question definition and hash remain consistent',()=>{
 expect(D.domains).toHaveLength(19);expect(D.domains.flatMap(d=>d.questions)).toHaveLength(57);
 expect(new Set(D.domains.flatMap(d=>d.questions.map(q=>q.id))).size).toBe(57);
 expect(createHash('sha256').update(JSON.stringify(D)).digest('hex')).toBe(DEFINITION_SHA256);
});
test('blank, uncertain and private answers never become negative; incomplete answers cannot launch Tier 2',()=>{
 expect(domainResults({}).every(d=>d.status==='unanswered')).toBe(true);
 expect(evaluateTierOne({},true).complete).toBe(false);
 for(const choice of ['Unsure','Prefer to discuss privately']){const a=all();a.neurodev_1=choice;expect(domainResults(a)[0].status).toBe('review');expect(evaluateTierOne(a,true).routedDomains).toEqual([]);expect(evaluateTierOne(a,true).reviewDomains).toEqual(['neurodev']);}
 expect(()=>createHandoff({},true)).toThrow();expect(()=>createHandoff(all(),false)).toThrow();
});
test('any current or past item in every domain selects its own Tier 2 without duration or impairment gates',()=>{
 for(const d of D.domains)for(const choice of ['Yes, currently','Yes, in the past']){const a=all();a[d.questions[0].id]=choice;const r=evaluateTierOne(a,true);expect(r.complete).toBe(true);expect(r.routedDomains).toEqual([d.id]);}
 const a=all();D.domains.forEach(d=>{a[d.questions[0].id]='Yes, currently';});expect(evaluateTierOne(a,true).routedDomains).toHaveLength(19);
 expect(evaluateTierOne(all(),true).domains.every(d=>d.status==='no-concern')).toBe(true);
 const mixed=all();mixed.depressive_1='Yes, currently';mixed.depressive_2='Unsure';expect(evaluateTierOne(mixed,true).routedDomains).toEqual(['depressive']);expect(evaluateTierOne(mixed,true).reviewDomains).toEqual(['depressive']);
});
test('any safety Yes flags independently; uncertainty remains review; corrupt or forged routes fail closed',()=>{
 for(const q of D.safety){const a=all();a[q.id]='Yes';expect(evaluateTierOne(a,true).safetyFlag).toBe(true);expect(evaluateTierOne(a,true).routedDomains).toEqual([]);a[q.id]='Unsure';expect(evaluateTierOne(a,true).safetyReview).toBe(true);}
 const invalid:Answers[]=[{x:'No'},{neurodev_1:'Maybe'},{safety_self:'Yes, in the past'}];
 for(const a of invalid)expect(()=>evaluateTierOne(a,true)).toThrow();
 const p=createHandoff(all(),true);expect(readHandoff(JSON.stringify({...p,routedDomains:['depressive']}))?.routedDomains).toEqual([]);
 expect(readHandoff(JSON.stringify({...p,definitionHash:'bad'}))).toBeNull();expect(readHandoff(JSON.stringify({...p,answers:{}}))).toBeNull();expect(readHandoff('bad')).toBeNull();
});
test('complete the actual wizard, prepare selected Tier 2 only, resume, then edit invalidates stale routing',async()=>{
 render(<TierOneScreen/>);await screen.findByText('Start and safety check',{selector:'h3'});
 fireEvent.click(screen.getByRole('button',{name:'Next section'}));expect(screen.getByRole('alert').textContent).toContain('Confirm');
 fireEvent.click(screen.getByRole('checkbox'));
 for(const q of D.safety)fireEvent.click(within(screen.getByRole('group',{name:q.text})).getByRole('radio',{name:'No'}));
 fireEvent.click(screen.getByRole('button',{name:'Next section'}));
 for(const [i,d] of D.domains.entries()){
  for(const [j,q] of d.questions.entries())fireEvent.click(within(screen.getByRole('group',{name:q.text})).getByRole('radio',{name:i===3&&j===0?'Yes, currently':i===4&&j===0?'Prefer to discuss privately':'No'}));
  fireEvent.click(screen.getByRole('button',{name:i===18?'Continue to selected Tier 2 questions':'Next section'}));
 }
 expect(screen.getByText('60 of 60 responses recorded')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Tier 2 plan prepared'})).toBeTruthy();
 expect(screen.getAllByRole('link',{name:/Open Tier 2/})).toHaveLength(1);
 expect(screen.getByRole('link',{name:/Open Tier 2/}).getAttribute('href')).toBe('/clinical-tests/dev/level2/depression');
 expect(readHandoff(store.getItem(HANDOFF_KEY))?.reviewDomains).toEqual(['anxiety']);
 cleanup();render(<TierOneScreen/>);await screen.findByRole('button',{name:'Tier 2 plan prepared'});
 fireEvent.click(screen.getByRole('button',{name:/4. Low mood/}));
 fireEvent.click(within(screen.getByRole('group',{name:D.domains[3].questions[0].text})).getByRole('radio',{name:'No'}));
 expect(store.getItem(HANDOFF_KEY)).toBeNull();expect(JSON.parse(store.getItem(DRAFT_KEY)!).answers.depressive_1).toBe('No');
},20000);
test('safety message appears immediately and routing cannot be prepared while incomplete',async()=>{
 render(<TierOneScreen/>);await screen.findByRole('checkbox');
 fireEvent.click(within(screen.getByRole('group',{name:D.safety[0].text})).getByRole('radio',{name:'Yes'}));
 expect(screen.getByRole('alert').textContent).toContain('direct clinical review');
 fireEvent.click(screen.getByRole('button',{name:'Review and Tier 2 plan'}));
 fireEvent.click(screen.getByRole('button',{name:'Continue to selected Tier 2 questions'}));expect(screen.getByRole('heading',{name:'Start and safety check'})).toBeTruthy();expect(screen.getAllByRole('alert').some(a=>a.textContent?.includes('Confirm'))).toBe(true);
});
test('direct Tier 2 navigation is gated by recomputed completed Tier 1 selection',async()=>{
 const {default:Client}=await import('@/app/clinical-tests/ClinicalScreenClient');
 render(<Client screenKey="level2/depression"/>);expect(screen.getByText('Start with Tier 1')).toBeTruthy();cleanup();
 const a=all();a.depressive_1='Yes, currently';store.setItem(HANDOFF_KEY,JSON.stringify(createHandoff(a,true)));
 render(<Client screenKey="level2/depression"/>);await waitFor(()=>expect(screen.queryByText('Start with Tier 1')).toBeNull());cleanup();
 render(<Client screenKey="level2/anxiety"/>);expect(screen.getByText('Start with Tier 1')).toBeTruthy();
});
