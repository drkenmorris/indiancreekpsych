'use client';
import IntakeLegalDirectory from './IntakeLegalDirectory';
import {useEffect,useRef,useState} from 'react';
import {formsForVersion} from '@/lib/patient/legal-documents';
import LegalSectionDocument from './LegalSectionDocument';
import LegalFormCopy from './LegalFormCopy';
export default function SubmittedLegalForms({answers,reference,submittedAt}:{answers:Record<string,string>;reference:string;submittedAt:string|null}){
 const ref=useRef<HTMLElement|null>(null),[open,setOpen]=useState(false),[selected,setSelected]=useState('');
 useEffect(()=>{const parent=ref.current?.closest('details');const update=()=>setOpen(!parent||parent.open);update();parent?.addEventListener('toggle',update);return()=>parent?.removeEventListener('toggle',update);},[]);
 const version=answers.legal_packet_version||'legacy-unversioned',legalForms=formsForVersion(version),form=legalForms.find(f=>f.id===selected);
 return <section ref={ref} className="intakeStaffReviewSection"><h2>Legal forms guide and individual PDF copies</h2>{open&&<>{answers.legal_routing_answers&&<IntakeLegalDirectory value={answers.legal_routing_answers} readOnly/>}<label>Choose a submitted form<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose page 11–21</option>{legalForms.map(f=><option key={f.id} value={f.id}>Page {f.page}: {f.section}</option>)}</select></label>{form&&<><LegalSectionDocument sectionTitle={form.section} version={version}/><LegalFormCopy sectionTitle={form.section} answers={answers} submitted version={version} reference={reference} submittedAt={submittedAt}/></>}</>}</section>;
}
