'use client';
import {useState} from 'react';
import SoapNotes from './SoapNotes';
import PatientProgressNotes from '../PatientProgressNotes';
export default function ProgressNoteFormats({patientId,inWorkspace=false}:{patientId:string;inWorkspace?:boolean}){
 const [format,setFormat]=useState<'SOAP'|'DAP'>('SOAP'),[dapVisited,setDapVisited]=useState(false);
 return <div>
  <div role="group" aria-label="Choose progress-note format" className="noteFormatChoice">
   <button type="button" aria-pressed={format==='SOAP'} onClick={()=>setFormat('SOAP')}>SOAP format</button>
   <button type="button" aria-pressed={format==='DAP'} onClick={()=>{setDapVisited(true);setFormat('DAP');}}>DAP format</button>
  </div>
  <div hidden={format!=='SOAP'}><SoapNotes key={'soap-'+patientId} patientId={patientId} inWorkspace={inWorkspace}/></div>
  {dapVisited&&<div hidden={format!=='DAP'}><PatientProgressNotes key={'dap-'+patientId} patientId={patientId} inWorkspace={inWorkspace} mode="dap"/></div>}
 </div>;
}
