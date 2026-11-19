import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import ProgressNoteFormats from '@/app/emr/soap-notes/ProgressNoteFormats';
import PatientProgressNotes from '@/app/emr/PatientProgressNotes';
const pid='00000000-0000-4000-8000-000000000103';let notes:any[],posted:any[];
beforeEach(()=>{notes=[];posted=[];vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
 const id=new URL(String(url),'https://fictional.example').searchParams.get('patient');
 if(String(url).includes('implemented-interventions'))return Response.json({patient:{id},versions:[],nodes:[],entries:[]});
 if(options?.method==='POST'){const body=JSON.parse(options.body);posted.push(body);const note={id:'saved-dap',patient_id:body.patient_id,template:body.template,sections:body.sections,encounter_at:body.encounter_at,encounter_type:body.encounter_type,created_at:'2026-11-19T12:00:00Z'};notes.unshift(note);return Response.json({id:note.id,saved:true,unsigned:true,kind:'note'});}
 return Response.json({patientId:id,notes:notes.filter(note=>note.patient_id===id),addenda:[],attestations:[]});
}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('SOAP/DAP buttons preserve separate drafts and DAP saves/reloads as patient-bound DAP sections',async()=>{
 const view=render(<ProgressNoteFormats patientId={pid} inWorkspace/>);await screen.findByRole('button',{name:'Add narrative — Subjective (S)'});fireEvent.click(screen.getByRole('button',{name:'Add narrative — Subjective (S)'}));fireEvent.change(screen.getByLabelText('Subjective (S) narrative (optional)'),{target:{value:'Fictional SOAP draft retained'}});
 fireEvent.click(screen.getByRole('button',{name:'DAP format'}));await screen.findByRole('heading',{name:'DAP Notes'});for(const name of ['Data','Assessment','Plan'])fireEvent.click(screen.getByRole('button',{name:'Add narrative — '+name}));for(const [label,value]of Object.entries({Data:'Fictional DAP observations',Assessment:'Fictional DAP assessment',Plan:'Fictional DAP next steps'}))fireEvent.change(screen.getByLabelText(label+' narrative (optional)',{exact:true}),{target:{value}});
 expect(screen.queryByLabelText('Progress-note format')).toBeNull();expect(document.querySelector('[data-clinical-note-dirty="true"]')).not.toBeNull();fireEvent.click(screen.getByRole('button',{name:'SOAP format'}));expect((screen.getByLabelText('Subjective (S) narrative (optional)') as HTMLTextAreaElement).value).toBe('Fictional SOAP draft retained');expect(document.querySelector('[data-clinical-note-dirty="true"]')).not.toBeNull();fireEvent.click(screen.getByRole('button',{name:'DAP format'}));expect((screen.getByLabelText('Data narrative (optional)',{exact:true}) as HTMLTextAreaElement).value).toBe('Fictional DAP observations');
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed the date, patient identity and note content/}));fireEvent.click(screen.getByRole('button',{name:'Save DAP note'}));await screen.findByText('Reviewed individual progress note saved unsigned. No signature or claim was created.');expect(posted[0]).toMatchObject({patient_id:pid,template:'DAP',reviewed:true,sections:{data:'Fictional DAP observations',assessment:'Fictional DAP assessment',plan:'Fictional DAP next steps'}});expect(posted[0].sections.subjective).toBeUndefined();
 view.unmount();render(<ProgressNoteFormats patientId={pid}/>);await screen.findByRole('button',{name:'DAP format'});fireEvent.click(screen.getByRole('button',{name:'DAP format'}));await screen.findByText('Fictional DAP observations');expect(screen.getByText('Saved DAP notes (1)')).toBeTruthy();
});
test('Amendments retains saved-note correction controls while new-note entry is absent',async()=>{notes=[{id:'source',patient_id:pid,template:'DAP',sections:{data:'Fictional prior observations',assessment:'Fictional prior assessment',plan:'Fictional prior plan'},encounter_at:'2026-11-19T12:00:00Z',created_at:'2026-11-19T12:00:00Z',encounter_type:'Fictional verification'}];render(<PatientProgressNotes patientId={pid} mode="amendments" inWorkspace/>);await screen.findByText('Fictional prior observations');expect(screen.queryByRole('group',{name:'New individual progress note'})).toBeNull();expect(screen.queryByRole('button',{name:'Save unsigned individual note'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Add correction or clarification'}));expect(screen.getByLabelText('Reason for correction')).toBeTruthy();expect(screen.getByRole('button',{name:'Save unsigned addendum'})).toBeTruthy();});

test('DAP quick choices assemble all sections, optional narrative is retained when hidden, and failed saves retain selections',async()=>{
 render(<PatientProgressNotes patientId={pid} mode="dap" inWorkspace/>);await screen.findByRole('checkbox',{name:'Current symptoms'});
 expect((screen.getByRole('checkbox',{name:'Current symptoms'}) as HTMLInputElement).checked).toBe(false);
 expect(screen.getByLabelText('Observed participation').getAttribute('value')).not.toBe('Active');
 fireEvent.click(screen.getByRole('checkbox',{name:'Current symptoms'}));
 fireEvent.change(screen.getByLabelText('Observed participation'),{target:{value:'Active'}});
 fireEvent.click(screen.getByRole('checkbox',{name:'Further assessment needed'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'Continue current treatment plan'}));
 fireEvent.click(screen.getByRole('button',{name:'Add narrative — Assessment'}));
 fireEvent.change(screen.getByLabelText('Assessment narrative (optional)',{exact:true}),{target:{value:'Fictional additional clinical context'}});
 fireEvent.click(screen.getByRole('button',{name:'Hide narrative — Assessment'}));
 expect(screen.getByText('Narrative retained and included in the note.')).toBeTruthy();
 const review=screen.getByRole('checkbox',{name:/I reviewed the date, patient identity and note content/});fireEvent.click(review);
 fireEvent.click(screen.getByRole('checkbox',{name:'Coordinate care'}));expect((review as HTMLInputElement).checked).toBe(false);
 const original=globalThis.fetch;vi.stubGlobal('fetch',vi.fn(async(url,options)=>options?.method==='POST'?Response.json({error:'Fictional save failure'},{status:503}):original(url,options)));
 fireEvent.click(review);fireEvent.click(screen.getByRole('button',{name:'Save DAP note'}));await screen.findByText('Fictional save failure');
 expect((screen.getByRole('checkbox',{name:'Current symptoms'}) as HTMLInputElement).checked).toBe(true);
 vi.stubGlobal('fetch',original);fireEvent.click(screen.getByRole('button',{name:'Save DAP note'}));
 await screen.findByText('Reviewed individual progress note saved unsigned. No signature or claim was created.');
 expect(posted[0].sections).toEqual({data:'Information addressed: Current symptoms.\n\nObserved participation: Active.',assessment:'Clinical assessment: Further assessment needed.\n\nFictional additional clinical context',plan:'Next steps: Continue current treatment plan; Coordinate care.'});
 expect((screen.getByRole('checkbox',{name:'Current symptoms'}) as HTMLInputElement).checked).toBe(false);
});
