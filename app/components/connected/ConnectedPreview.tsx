'use client';
import {useState} from 'react';
import {connectedDefinition,type ConnectedKey,type Answers} from '@/lib/clinical-tests/connected/definition';
import {buildClinicalReport} from '@/lib/clinical-tests/connected/report';
import ConnectedQuestionnaire from './ConnectedQuestionnaire';
import ClinicalReport from './ClinicalReport';
export default function ConnectedPreview({testKey,sourceHash}:{testKey:ConnectedKey;sourceHash:string}){
 const d=connectedDefinition(testKey),[answers,setAnswers]=useState<Answers>({}),[report,setReport]=useState(false);
 function synthetic(){const a=Object.fromEntries(d.items.map((i,n)=>[i.id,i.options[n%i.options.length].value]));setAnswers(a);setReport(true);}
 return <><h1>{d.title} — Synthetic preview</h1>{d.introduction.map(p=><p key={p}>{p}</p>)}<p>No patient records are saved in this preview.</p><button type="button" onClick={synthetic}>Show synthetic complete report</button>{report?<ClinicalReport synthetic report={buildClinicalReport(d,answers)} definition={d} answers={answers} recipient="Fictional Respondent" assignmentId="synthetic-preview" patientId="synthetic-patient" submittedAt="2026-11-04T12:00:00Z" sourceHash={sourceHash} revision={1}/>:<ConnectedQuestionnaire definition={d} preview onSave={async v=>{setAnswers(v.answers);if(v.submit)setReport(true);}}/>}</>;
}
