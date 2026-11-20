'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {menus,workspaceLink,emrPageLink,routeSection} from './links';
import {uuid} from '@/lib/emr/demographics';
import './navigation.css';
function QuickMenu({label,children}:{label:string;children:ReactNode}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))ref.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 return <details ref={ref} className="emrQuickMenu" onKeyDown={event=>{if(event.key==='Escape'&&ref.current){ref.current.open=false;ref.current.querySelector('summary')?.focus();}}}><summary>{label}</summary><nav aria-label={label==='Administrator sections'?'Administrator section destinations':label+' quick links'} onClick={()=>{if(ref.current)ref.current.open=false;}}>{children}</nav></details>;
}
export default function EmrNavigationShell({children,providerName}:{children:ReactNode;providerName:string}){
 const pathname=usePathname(),params=useSearchParams();
 const [initialModule,activeKey]=routeSection(pathname,params.get('section')??undefined);
 const [module,setModule]=useState(initialModule),[expanded,setExpanded]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const rawPatient=params.get('patient'),patient=uuid(rawPatient)?rawPatient:undefined;
 useEffect(()=>{setModule(initialModule);},[initialModule]);
 // Internal iframe pages inherit the complete surrounding workspace navigation.
 // Direct EMR pages always receive this common shell, including future routes.
 if(params.get('embedded')==='1')return <>{children}</>;
 const link=(group:string,key?:string)=>workspaceLink(group,key,patient);
 const findPatient=link('personal','patient_directory');
 async function logout(){
  if(document.querySelector('[data-soap-dirty="true"],[data-implemented-dirty="true"],[data-group-dirty="true"]')&&!window.confirm('Sign out and discard unsaved changes?'))return;
  setBusy(true);setError('');
  try{const response=await fetch('/api/emr/logout',{method:'POST'});if(!response.ok)throw Error('Sign out could not be completed. Please try again.');window.location.assign('/login?next=%2Femr');}
  catch(e){setError(e instanceof Error?e.message:'Sign out failed.');setBusy(false);}
 }
 return <div className="emrPageShell">
  <a className="emrPageSkip" href="#emr-page-content">Skip to workspace</a>
  <header className="emrPageTopbar"><div className="emrPageQuickMenus">
   <QuickMenu label="Home"><button type="button" disabled={busy} onClick={()=>void logout()}>Logout</button><a href={findPatient}>Find/Add Patient</a><a href={link('schedule')}>Appointment Scheduler</a><a href={emrPageLink('/emr/treatment-planners',patient)}>Manage Treatment Planners</a><a href={link('administration','weekly_schedule')}>Weekly Therapist Schedule</a></QuickMenu>
   <QuickMenu label="Provider Menu"><a href={link('personal','assigned_provider')}>Provider Assignment</a><a href={link('administration','provider_information')}>Provider Information</a><a href={link('administration','assigned_patients')}>Assigned Patients List</a><a href={'/emr/workspace?'+new URLSearchParams({module:'overview',...(patient?{patient}:{})})}>Patient Overview</a><a href={link('assessment','assigned_assessments')}>Patient Questionnaire Assignment</a><a href={'/emr/workspace?'+new URLSearchParams({module:'session-checkin',...(patient?{patient}:{})})}>Patient Session Check-in</a><a href={'/emr/workspace?'+new URLSearchParams({module:'billing',...(patient?{patient}:{})})}>Billing</a></QuickMenu>
  </div><span>CENTRAL PATIENT RECORD · Developmental forms require clinician review · Claims and signatures remain previews</span></header>
  <div className="emrPageBody"><aside className="emrPageSidebar" aria-label="EMR navigation">
   <a className="emrPageBrand" href={link('assessment','biopsychosocial')}><img src="/images/indian-creek-full-color-logo.png" width="84" height="56" alt="Indian Creek Psychological Services"/><span>Indian Creek<small>Clinical workspace</small></span></a>
   <div className="emrProviderBadge"><p>Active Provider</p><strong>{providerName}</strong></div>
   <button type="button" className="emrMenuSwitch" role="switch" aria-checked={expanded} aria-expanded={expanded} aria-controls="emr-page-navigation" onClick={()=>setExpanded(value=>!value)}><span aria-hidden="true"/>Workspace Menu/{expanded?'On':'Off'}</button>
   <div id="emr-page-navigation" hidden={!expanded}><section><h2>Module Options</h2><h3>{menus.modules[module]?.[0]}</h3><nav aria-label="Current module options">{(menus.sections[module]??[]).map(([key,label])=><a key={key} href={workspaceLink(module,key,patient)} aria-current={module===initialModule&&key===activeKey?'page':undefined}>{label}</a>)}{module==='schedule'&&<a href={link('schedule')}>Appointment Scheduler</a>}</nav></section>
   <section className="emrMainModules"><h2>Main Modules</h2><nav aria-label="Main EMR modules">{Object.entries(menus.modules).map(([key,[label]])=><button type="button" key={key} aria-pressed={key===module} onClick={()=>setModule(key)}>{label}</button>)}</nav></section></div>
  </aside><div className="emrPageContent" id="emr-page-content" tabIndex={0} aria-label="EMR page content">{error&&<p role="alert">{error}</p>}{children}</div></div>
  <footer className="emrPageFooter"><nav aria-label="Workspace navigation"><a href="/">Home</a><a href="/account">Account</a><QuickMenu label="Administrator sections"><a href="/">Main website</a><a href="/clinical-tests">Psychological testing</a><a href={'/emr/workspace?module=billing'+(patient?'&patient='+encodeURIComponent(patient):'')}>Billing module</a><a href="/appointments">Scheduling and calendar</a><a href={link('assessment','biopsychosocial')}>EMR workspace</a><a href="/admin/questionnaires">Patient questionnaires</a><a href="/account">Account and security</a></QuickMenu><a href="/privacy">HIPAA Privacy Notice</a></nav><div><span>15022 W. 128th St., Olathe, KS 66062</span><span>(913) 353-6116</span></div></footer>
 </div>;
}
