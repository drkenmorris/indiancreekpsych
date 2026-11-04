'use client';
import {useEffect,useRef,useState} from 'react';
import './asq-recipient.css';
import type {AsqDefinition} from '@/lib/clinical-tests/asq-forms';
export type AsqAnswers=Record<string,number>;
export type AsqSaveRequest={answers:AsqAnswers;page:number;submit:boolean};
type Props={definition:AsqDefinition;initialAnswers?:AsqAnswers;initialPage?:number;readOnly?:boolean;onSave:(request:AsqSaveRequest)=>Promise<void>;preview?:boolean;onAnswersChange?:(answers:AsqAnswers)=>void};
export default function SevenQuestionForm({definition,initialAnswers={},initialPage=0,readOnly=false,onSave,preview=false,onAnswersChange}:Props){
 const clean=(value:AsqAnswers)=>Object.fromEntries(definition.items.filter(i=>Number.isInteger(value[i.id])&&value[i.id]>=0&&value[i.id]<=4).map(i=>[i.id,value[i.id]]));
 const [answers,setAnswers]=useState<AsqAnswers>(()=>clean(initialAnswers)),[page,setPage]=useState(initialPage),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[complete,setComplete]=useState(readOnly),[dirty,setDirty]=useState(false);
 const imported=useRef(JSON.stringify(initialAnswers));
 useEffect(()=>{const source=JSON.stringify(initialAnswers);if(!dirty&&!busy&&source!==imported.current){imported.current=source;setAnswers(clean(initialAnswers));}},[initialAnswers,dirty,busy]);
 const heading=useRef<HTMLHeadingElement>(null),saving=useRef(false),alive=useRef(true);
 const count=definition.items.length,pages=Math.ceil(count/7),visible=definition.items.slice(page*7,page*7+7),answered=definition.items.filter(i=>answers[i.id]!==undefined).length;
 useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
 useEffect(()=>{heading.current?.focus();},[page]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function change(id:string,value:number){const next={...answers,[id]:value};setAnswers(next);setDirty(true);setMessage('Changes on this page have not been saved.');onAnswersChange?.(next);}
 async function save(nextPage:number,submit=false,requireCurrent=false){
  if(saving.current||complete)return;
  if(requireCurrent&&visible.some(i=>answers[i.id]===undefined)){setError('Please answer each question on this page before continuing.');return;}
  if(submit&&answered!==count){setError('Answer every question before submitting. You can return to earlier pages to review.');return;}
  saving.current=true;setBusy(true);setError('');setMessage('Saving…');
  const captured={...answers};
  try{await onSave({answers:captured,page:nextPage,submit});if(!alive.current)return;setDirty(false);setPage(nextPage);setComplete(submit);setMessage(submit?(preview?'Preview complete. No patient response was submitted.':'Your questionnaire has been submitted for clinician review.'):preview?'Preview answers retained in this open workspace. No patient response was submitted.':'Your answers and place in the questionnaire are saved.');}
  catch(e){if(alive.current){setError(e instanceof Error?e.message:'Saving was not confirmed. Your answers remain on this page.');setMessage('Saving was not confirmed. Please keep this page open and retry.');}}
  finally{saving.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="asqPagedForm" aria-label="ASQ questionnaire">
  <h2 ref={heading} tabIndex={-1}>{complete?(preview?'Preview complete':'Questionnaire submitted'):`Questions ${page*7+1}–${Math.min(page*7+7,count)} of ${count}`}</h2>
  <p>Page {page+1} of {pages} · {answered} of {count} questions answered</p>
  <progress max={count} value={answered} aria-label="Questions answered"/>
  {preview&&<p>This preview does not submit answers for a patient.</p>}
  <p role="status">{message}</p>{error&&<p role="alert">{error}</p>}
  {!complete&&<form onSubmit={e=>{e.preventDefault();void save(page===pages-1?page:page+1,page===pages-1,true);}}>
   <fieldset disabled={busy}><legend className="asqSrOnly">Questionnaire page {page+1}</legend>
   {visible.map((item,index)=><fieldset key={item.id} className="asqQuestion"><legend><strong>{page*7+index+1}.</strong> {item.text}</legend><div className="asqResponseChoices">{definition.options.map(option=><label key={option.value}><input type="radio" name={'asq-'+item.id} value={option.value} checked={answers[item.id]===option.value} onChange={()=>change(item.id,option.value)}/>{option.label}</label>)}</div></fieldset>)}
   </fieldset>
   <div className="asqPageActions"><button type="button" disabled={busy||page===0} onClick={()=>void save(page-1)}>Previous</button><button type="button" disabled={busy} onClick={()=>void save(page)}>Save progress</button><button type="submit" disabled={busy}>{busy?'Saving…':page===pages-1?'Save and submit questionnaire':'Save and next 7 questions'}</button></div>
  </form>}
  {complete&&<p>{preview?'This fictional preview is complete; no patient response was submitted.':'Your responses are recorded. Contact the office if a correction is needed.'}</p>}
 </section>;
}
