import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import SoapNotes from '@/app/emr/soap-notes/SoapNotes';
const pid='00000000-0000-4000-8000-000000000103';let notes:any[],posted:any[],fail:boolean;
beforeEach(()=>{notes=[];posted=[];fail=false;vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{
 if(options?.method==='POST'){const body=JSON.parse(options.body);posted.push(body);if(fail)return Response.json({error:'Fictional save error'},{status:503});notes=[{id:'saved-soap',patient_id:pid,template:'SOAP',encounter_at:body.encounter_at,encounter_type:body.encounter_type,sections:body.sections,created_at:'2026-01-01T12:00:00Z'}];return Response.json({id:'saved-soap',saved:true,unsigned:true,kind:'note'});}
 return Response.json({patientId:pid,notes,addenda:[],attestations:[]});
}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function fill(){await screen.findByLabelText('Subjective (S)');fireEvent.change(screen.getByLabelText('Encounter date and time (your device’s timezone)'),{target:{value:'2026-01-01T12:00'}});for(const field of ['Subjective (S)','Objective (O)','Assessment (A)','Plan (P)'])fireEvent.change(screen.getByLabelText(field),{target:{value:'Fictional '+field}});fireEvent.click(screen.getByRole('checkbox'));}
test('SOAP page has all four sections and saves only SOAP to the existing patient-bound clinical-note backend',async()=>{
 const view=render(<SoapNotes patientId={pid}/>);await fill();expect(screen.queryByLabelText('Progress-note format')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Save SOAP note'}));await screen.findByText('SOAP note saved unsigned in this patient’s clinical record.');expect(posted[0]).toMatchObject({action:'note',patient_id:pid,template:'SOAP',reviewed:true,sections:{subjective:'Fictional Subjective (S)',objective:'Fictional Objective (O)',assessment:'Fictional Assessment (A)',plan:'Fictional Plan (P)'}});expect((screen.getByLabelText('Subjective (S)') as HTMLTextAreaElement).value).toBe('');view.unmount();render(<SoapNotes patientId={pid}/>);await screen.findByText('Fictional Subjective (S)');expect(screen.getByText('Fictional Plan (P)')).toBeTruthy();
});
test('missing content explains required completion without writing; failed saves retain all entered sections',async()=>{
 render(<SoapNotes patientId={pid}/>);await screen.findByLabelText('Subjective (S)');fireEvent.click(screen.getByRole('button',{name:'Save SOAP note'}));await screen.findByText(/Complete the encounter date/);expect(posted).toHaveLength(0);await fill();fail=true;fireEvent.click(screen.getByRole('button',{name:'Save SOAP note'}));await screen.findByText('Fictional save error');expect((screen.getByLabelText('Plan (P)') as HTMLTextAreaElement).value).toBe('Fictional Plan (P)');expect(document.querySelector('[data-soap-dirty="true"]')).not.toBeNull();
});
test('wrong-patient history is rejected before form entry',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({patientId:'another',notes:[]})));render(<SoapNotes patientId={pid}/>);await screen.findByRole('alert');expect(screen.queryByLabelText('Subjective (S)')).toBeNull();});
test('Progress menu routes the former Objective Rating destination to SOAP and guards unsaved embedded drafts',async()=>{
 const {readFileSync}=await import('node:fs');expect(readFileSync('public/emr-assets/module-menu.js','utf8')).toContain("['objective_rating','SOAP Notes','module-section']");expect(readFileSync('public/emr-assets/central-directory.js','utf8')).toContain('/emr/soap-notes?patient=');expect(readFileSync('public/emr-assets/app.js','utf8')).toContain('[data-soap-dirty="true"]');
});
