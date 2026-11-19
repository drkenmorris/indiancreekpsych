// @vitest-environment node
import {beforeAll,expect,test} from 'vitest';
import {build} from 'esbuild';
// @ts-expect-error The repository uses jsdom test fixtures without @types/jsdom.
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
let script='';
beforeAll(async()=>{const result=await build({entryPoints:['browser/soap-workspace.tsx'],bundle:true,write:false,outfile:'soap-workspace.js',format:'iife',platform:'browser',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});script=result.outputFiles.find(file=>file.path.endsWith('.js'))!.text;});
const pid='00000000-0000-4000-8000-000000000103',other='00000000-0000-4000-8000-000000000104';
async function until(check:()=>boolean){for(let count=0;count<100;count++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Native SOAP workspace did not finish rendering.');}
test('production browser bundle mounts SOAP in the page, retains drafts across child updates, and remounts on chart replacement',async()=>{
 const dom=new JSDOM(`<div id="content"><div id="patient-soap-page" data-patient-id="${pid}"></div></div>`,{runScripts:'outside-only',url:'https://fictional.example/emr/workspace'});
 const calls:string[]=[];
 dom.window.fetch=async(url:any)=>{calls.push(String(url));const id=new URL(String(url),'https://fictional.example').searchParams.get('patient');return Response.json(String(url).includes('implemented-interventions')?{patient:{id},versions:[],nodes:[]}:{patientId:id,notes:[]});};
 dom.window.eval(script);
 await until(()=>!!dom.window.document.querySelector('select[name=participation]'));
 const doc=dom.window.document,root=doc.querySelector('.soapWorkspacePage');expect(root).not.toBeNull();expect(doc.querySelector('iframe')).toBeNull();expect(doc.querySelectorAll('.soapSection')).toHaveLength(4);
 const checkbox=doc.querySelector<HTMLInputElement>('input[value=Anxiety]')!;checkbox.click();await until(()=>doc.querySelector('[data-soap-dirty=true]')!==null);expect(doc.querySelector('.soapWorkspacePage')).toBe(root);expect(checkbox.checked).toBe(true);
 doc.getElementById('content')!.innerHTML=`<div id="patient-soap-page" data-patient-id="${other}"></div>`;
 await until(()=>calls.some(url=>url.includes(other))&&!!doc.querySelector('input[value=Anxiety]'));
 expect(doc.querySelector('.soapWorkspacePage')).not.toBe(root);expect(doc.querySelector<HTMLInputElement>('input[value=Anxiety]')!.checked).toBe(false);expect(doc.querySelector('[data-soap-dirty=true]')).toBeNull();
 doc.getElementById('content')!.innerHTML='<p>Different module</p>';await until(()=>!doc.querySelector('.soapWorkspacePage'));dom.window.close();
});
test('workspace uses the direct host and self-hosted assets without the old SOAP viewer; normal page scroll and draft protection remain',()=>{
 const directory=readFileSync('public/emr-assets/central-directory.js','utf8'),html=readFileSync('public/emr-assets/index.html','utf8'),css=readFileSync('public/emr-assets/style.css','utf8'),native=readFileSync('browser/soap-workspace.css','utf8');
 expect(directory).toContain('id="patient-soap-page"');expect(directory).not.toContain('patient-soap-editor');expect(html).toContain('src="/emr-assets/soap-workspace.js" defer');expect(html).toContain('href="/emr-assets/soap-workspace.css"');expect(css).not.toContain('#patient-soap-editor');expect(css).toContain('.main{min-height:0;overflow-y:auto;');expect(native).toContain('max-height:none;overflow:visible');expect(readFileSync('public/emr-assets/app.js','utf8')).toContain("document.querySelector('#patient-soap-page [data-soap-dirty=\"true\"]')");
});
test('native session-record directory opens one patient note and clears it on chart replacement',async()=>{
 const dom=new JSDOM(`<div id="content"><div id="patient-amendments-page" data-patient-id="${pid}"></div></div>`,{runScripts:'outside-only',url:'https://fictional.example/emr/workspace'});
 const note={id:'note-a',patient_id:pid,template:'DAP',encounter_at:'2026-11-18T12:00:00Z',encounter_type:'Fictional verification',sections:{data:'Fictional source note',assessment:'Fictional assessment',plan:'Fictional plan'},created_at:'2026-11-18T12:00:00Z'};
 const calls:string[]=[];dom.window.fetch=async(url:any)=>{calls.push(String(url));const id=new URL(String(url),'https://fictional.example').searchParams.get('patient');return Response.json({patientId:id,patientName:'Fictional Native Patient',notes:id===pid?[note]:[],revisions:[],addenda:[],attestations:[],page:0,total:id===pid?1:0,serverNow:'2026-11-19T12:00:00Z'});};dom.window.eval(script);
 const doc=dom.window.document;await until(()=>!!doc.querySelector('.sessionRecordSummary'));expect(doc.body.textContent).not.toContain('Fictional source note');(doc.querySelector('.sessionRecordSummary') as HTMLButtonElement).click();await until(()=>doc.body.textContent!.includes('Fictional source note'));expect(doc.querySelector('iframe')).toBeNull();expect(doc.body.textContent).not.toContain('New individual progress note');
 const button=(Array.from(doc.querySelectorAll('button')) as HTMLButtonElement[]).find(b=>b.textContent==='Edit clinical note')!;button.click();await until(()=>doc.body.textContent!.includes('Reason for correction or addition'));expect(doc.querySelector('textarea')!.value).toBe('Fictional source note');
 doc.getElementById('content')!.innerHTML=`<div id="patient-amendments-page" data-patient-id="${other}"></div>`;await until(()=>calls.some(url=>url.includes(other))&&doc.body.textContent!.includes('No SOAP or DAP session records on this page.'));expect(doc.body.textContent).not.toContain('Fictional source note');expect(doc.querySelector('textarea')).toBeNull();dom.window.close();
});
test('Individual Group Session Notes mounts patient-specific fields without the shared Teams/Groups page',async()=>{
 const dom=new JSDOM(`<div id="content"><div id="patient-group-notes-page" data-patient-id="${pid}"></div></div>`,{runScripts:'outside-only',url:'https://fictional.example/emr/workspace'});
 const calls:string[]=[];dom.window.fetch=async(url:any)=>{calls.push(String(url));return Response.json(String(url).includes('/individual-notes')?{patientId:pid,sessionId:String(url).includes('session=independent')?null:'session-a',notes:[]}:{patientId:pid,timezone:'America/Chicago',sessions:[{id:'session-a',group_name:'Fictional group',scheduled_start:'2026-11-19T12:00:00Z',duration_minutes:60,shared_topic:'Fictional topic',attendance:'Present'}]});};dom.window.eval(script);const doc=dom.window.document;
 await until(()=>doc.body.textContent!.includes('Open individual notes for this attended session'));expect(doc.body.textContent).not.toContain('Document a group session');expect(doc.querySelector('a[href="/emr/groups"]')).toBeNull();(Array.from(doc.querySelectorAll('button')).find((b:any)=>b.textContent==='Open individual notes for this attended session') as HTMLButtonElement).click();await until(()=>doc.querySelectorAll('textarea').length===6);expect(doc.body.textContent).toContain('New patient-specific group note');expect(doc.querySelectorAll('textarea')).toHaveLength(6);expect(doc.body.textContent).toContain('No Treatment Teams/Groups record, shared session or attendance entry is required.');expect(doc.querySelector('input[type=datetime-local]')).not.toBeNull();expect(calls.every(url=>url.includes('/groups/patient?')||url.includes('/groups/individual-notes?'))).toBe(true);dom.window.close();
});
