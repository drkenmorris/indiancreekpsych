import React from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {connectedKeys,connectedDefinition,validateSave,type Answers} from '@/lib/clinical-tests/connected/definition';
import {checkedSource,hash} from '@/lib/clinical-tests/connected/source';
import {buildClinicalReport} from '@/lib/clinical-tests/connected/report';
import {scoreCseq} from '@/lib/clinical-tests/legacy/selfesteem/cseqScoring';
import {scoreSRRCI} from '@/lib/clinical-tests/legacy/src/features/assessments/srrci/engine/srrciScoring';
import {scoreRtafiAssessment} from '@/lib/clinical-tests/legacy/src/features/psychometrics/rtafi/engine/rtafiScoring';
import {buildRDIIReport} from '@/lib/clinical-tests/legacy/src/assessments/rdii/rdiiScoring';
import {rdiiItemsFormA} from '@/lib/clinical-tests/legacy/src/assessments/rdii/rdiiItemsFormA';
import {scoreRvtiIndividual} from '@/lib/clinical-tests/legacy/src/assessments/rvti/rvtiScoring';
import ConnectedQuestionnaire from '@/app/components/connected/ConnectedQuestionnaire';
import {normalizeAssignmentData} from '@/lib/clinical-tests/assignments';
import {clinicalTestSuites} from '@/lib/clinical-tests/menu-catalog';
const all=(d:ReturnType<typeof connectedDefinition>):Answers=>Object.fromEntries(d.items.map((q,n)=>[q.id,q.options[n%q.options.length].value]));
afterEach(cleanup);
describe.each(connectedKeys)('%s connected test',key=>{
 it('has a unique fixed source, meaningful introduction and typed choices; rejects altered definitions',()=>{const d=connectedDefinition(key);expect(d.introduction.length).toBe(2);expect(d.items.length).toBeGreaterThan(30);expect(new Set(d.items.map(i=>i.id)).size).toBe(d.items.length);expect(checkedSource(d,hash(d))).toEqual(d);expect(()=>checkedSource({...d,title:'forged'},hash(d))).toThrow();});
 it('enforces valid choices, sequential pages, complete submission and identity confirmation',()=>{const d=connectedDefinition(key),answers=all(d);expect(validateSave({answers,page:1,submit:true,expectedRevision:0,identityConfirmed:true},d).submit).toBe(true);for(const b of [{answers:{},page:1},{answers:{},submit:true},{answers:{...answers,forged:1}},{answers:{...answers,[d.items[0].id]:'invalid'}},{identityConfirmed:false},{page:999}])expect(()=>validateSave({answers,page:0,submit:false,expectedRevision:0,identityConfirmed:true,...b},d)).toThrow();});
 it('renders at most seven questions and saves before navigation; preserves saved answers on resume',async()=>{const d=connectedDefinition(key),answers=all(d),save=vi.fn().mockResolvedValue(undefined);const view=render(<ConnectedQuestionnaire definition={d} initialAnswers={answers} onSave={save}/>);expect(document.querySelectorAll('.asqQuestion')).toHaveLength(7);expect(document.querySelector('input[type=date]')).toBeNull();fireEvent.click(screen.getByText('Save and next'));await waitFor(()=>expect(screen.getByText(/Questions 8–14/)).toBeTruthy());expect(save.mock.calls[0][0].page).toBe(1);view.unmount();render(<ConnectedQuestionnaire definition={d} initialPage={1} initialAnswers={answers} onSave={save}/>);expect(document.querySelectorAll('.asqQuestion')).toHaveLength(7);expect(document.querySelectorAll('input:checked')).toHaveLength(7);fireEvent.click(screen.getByText('Previous'));await waitFor(()=>expect(screen.getByText(/Questions 1–7/)).toBeTruthy());});
 it('refuses incomplete scoring and produces finite, bounded source scores with review material',()=>{const d=connectedDefinition(key);expect(()=>buildClinicalReport(d,{})).toThrow();const r=buildClinicalReport(d,all(d));expect(r.answered).toBe(r.total);expect(r.rows.length).toBeGreaterThan(3);for(const s of r.rows){expect(s.score).not.toBeNull();expect(Number.isFinite(s.score)).toBe(true);expect(s.score).toBeGreaterThanOrEqual(0);expect(s.score).toBeLessThanOrEqual(100);}expect(r.discussion.length).toBeGreaterThanOrEqual(3);expect(r.limitations.join(' ')).toContain('No automated diagnosis');});
 it('binds assignment to a central patient without respondent demographic inputs',()=>{const input={firstName:'Fictional',lastName:'Person',email:'fictional@example.invalid',testKey:key,patientId:'00000000-0000-0000-0000-000000000201'};const v=normalizeAssignmentData(input);expect(v.ok).toBe(true);if(v.ok){expect(v.data.patient_id).toBe(input.patientId);expect(v.data.recipient_dob).toBeNull();}expect(normalizeAssignmentData({...input,patientId:''}).ok).toBe(false);});
});
it('adapters exactly preserve the original engine calculations',()=>{
 for(const key of connectedKeys){const d=connectedDefinition(key),a=all(d),r=buildClinicalReport(d,a);let original:unknown;
 if(key==='cseq')original=scoreCseq({likert:Object.fromEntries(Object.entries(a).filter(([id])=>!id.startsWith('FC-'))) as never,forcedChoice:Object.fromEntries(Object.entries(a).filter(([id])=>id.startsWith('FC-'))) as never});
 if(key==='srrci')original=scoreSRRCI('assigned-individual',Object.entries(a).map(([itemId,value])=>({itemId,value})) as never);
 if(key==='rtafi')original=scoreRtafiAssessment(Object.entries(a).map(([itemId,value])=>({itemId,value})) as never);
 if(key==='rdii')original=buildRDIIReport(rdiiItemsFormA,a as never);
 if(key==='rvti')original=scoreRvtiIndividual(a as never);
 const strip=(v:unknown)=>JSON.parse(JSON.stringify(v,(k,v)=>['scoredAtISO','completedAt','createdAtISO'].includes(k)?undefined:v));expect(strip(r.raw)).toEqual(strip(original));
 }
});
it('removes CogSwitch from all assignable catalogs',()=>expect(clinicalTestSuites.some(s=>(s.key as string)==='cogswitch')).toBe(false));
it('keeps the current page and answers when saving fails',async()=>{const d=connectedDefinition('rvti');render(<ConnectedQuestionnaire definition={d} initialAnswers={all(d)} onSave={async()=>{throw Error('Offline');}}/>);fireEvent.click(screen.getByText('Save and next'));await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Offline'));expect(screen.getByText(/Questions 1–7/)).toBeTruthy();expect(document.querySelectorAll('input:checked')).toHaveLength(7);});
