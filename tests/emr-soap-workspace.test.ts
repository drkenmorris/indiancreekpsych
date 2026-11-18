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
