'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
type Copy={id:string;document_type:string;authority:string;filename:string;mime_type:string;byte_size:number;created_at:string};
type Props={patientId?:string;kioskId?:string;token?:string;preview?:boolean;readOnly?:boolean;disabled?:boolean;onBusy?:(busy:boolean)=>void};
export default function IntakeAssignmentDocuments({patientId,kioskId,token,preview=false,readOnly=false,disabled=false,onBusy}:Props){
 const client=useMemo(()=>preview?null:createClient(),[preview]);
 const [copies,setCopies]=useState<Copy[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [type,setType]=useState(''),[authority,setAuthority]=useState('');
 const fileRef=useRef<HTMLInputElement|null>(null),sectionRef=useRef<HTMLElement|null>(null);
 const scope=useMemo(()=>token?{p_token:token}:kioskId?{p_kiosk_id:kioskId}:{p_patient_id:patientId},[token,kioskId,patientId]);
 useEffect(()=>{let active=true,loaded=false;const container=readOnly?sectionRef.current?.closest('details'):null;
  const load=()=>{if(!client||loaded||(container&&!container.open))return;loaded=true;void client.rpc('intake_assignment_documents',{p_operation:'list',...scope}).then(({data,error})=>{if(!active)return;if(error){loaded=false;setError('Assignment documents could not be loaded. Retry by reopening this section.');}else{setError('');setCopies((data??[]) as Copy[]);}});};
  load();container?.addEventListener('toggle',load);return()=>{active=false;container?.removeEventListener('toggle',load);};
 },[client,scope,readOnly]);

 const working=(value:boolean)=>{setBusy(value);onBusy?.(value);};
 async function upload(){
  if(busy||disabled||readOnly)return;setError('');setMessage('');const file=fileRef.current?.files?.[0];
  if(!type||!authority){setError('Choose the assignment type and issuing authority.');return;}
  if(!file){setError('Choose a PDF, JPEG or PNG copy.');return;}
  if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>2097152||!file.size){setError('Choose a PDF, JPEG or PNG copy no larger than 2 MB.');return;}
  if(preview){setMessage('Preview only: file selected; nothing was uploaded or saved.');return;}
  if(!client)return;working(true);
  try{const content=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(new Error('The file could not be read.'));reader.readAsDataURL(file);});
   const {data,error}=await client.rpc('intake_assignment_documents',{p_operation:'upload',...scope,p_document_type:type,p_authority:authority,p_filename:file.name,p_mime:file.type,p_content:content});
   if(error||!data)throw Error('Upload could not be confirmed. Reopen this section to check saved copies before retrying.');
   setCopies(current=>[...current,data as Copy]);if(fileRef.current)fileRef.current.value='';setMessage('Assignment copy uploaded securely. Save any other questionnaire changes separately.');
  }catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{working(false);}
 }
 async function download(copy:Copy){if(!client||busy)return;setError('');working(true);try{const {data,error}=await client.rpc('intake_assignment_documents',{p_operation:'get',...scope,p_document_id:copy.id});if(error||!data)throw Error('This copy could not be retrieved.');const bytes=Uint8Array.from(atob(String(data.content).replace(/\s/g,'')),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:data.mime_type}));const a=document.createElement('a');a.href=url;a.download=data.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error?e.message:'Download failed.');}finally{working(false);}}
 return <section ref={sectionRef} className="appointmentPanel intakeAssignmentDocuments"><h2>Foster-parent and guardian assignment copies</h2><p>Attach a foster-parent assignment, a guardian assignment, or both. Each copy must be issued by a court or state agency. Uploading a copy does not verify legal authority.</p>
 {!readOnly&&<fieldset disabled={busy||disabled}><legend>Upload assignment copy (optional)</legend><label>Assignment type<select value={type} onChange={e=>setType(e.target.value)}><option value="">Choose assignment type</option><option>Foster parent assignment</option><option>Guardian assignment</option></select></label><label>Issued by<select value={authority} onChange={e=>setAuthority(e.target.value)}><option value="">Choose issuing authority</option><option>Court</option><option>State agency</option></select></label><label>Assignment document<input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png"/></label><p>PDF, JPEG or PNG; up to 2 MB per copy, 8 copies / 8 MB per intake. Copies save when you select Upload.</p><button type="button" onClick={()=>void upload()}>{busy?'Working…':'Upload assignment copy'}</button></fieldset>}
 <h3>Saved assignment copies</h3>{copies.length?<ul>{copies.map(copy=><li key={copy.id}><strong>{copy.document_type}</strong> — {copy.authority} · {copy.filename} · {Math.ceil(copy.byte_size/1024)} KB <button type="button" disabled={busy} onClick={()=>void download(copy)}>Download copy</button></li>)}</ul>:<p>{error?'Saved copies are unavailable.':'No assignment copies saved.'}</p>}
 {preview&&<p>Preview mode does not upload files.</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
