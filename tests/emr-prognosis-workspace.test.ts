// @vitest-environment node
import {expect,test} from 'vitest';
import {build} from 'esbuild';
// @ts-expect-error jsdom fixtures use untyped package
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
async function until(check:()=>boolean){for(let i=0;i<100;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Prognosis did not render');}
test('lazy native prognosis bundle mounts without plan and remounts for a different patient',async()=>{
 const built=await build({entryPoints:['browser/prognosis-workspace.tsx'],bundle:true,write:false,outfile:'prognosis.js',format:'iife',platform:'browser',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
 const pid='00000000-0000-4000-8000-000000000103',other='00000000-0000-4000-8000-000000000104';
 const dom=new JSDOM(`<div id="content"><div id="patient-prognosis-page" data-patient-id="${pid}"></div></div>`,{runScripts:'outside-only',url:'https://fictional.example/emr/workspace'}),calls:string[]=[];
 dom.window.fetch=async(_url:any,options:any)=>{const b=JSON.parse(options.body);calls.push(b.patientId);return Response.json({value:{patient:{id:b.patientId},records:[]},revision:0});};dom.window.eval(built.outputFiles.find(f=>f.path.endsWith('.js'))!.text);const doc=dom.window.document;
 await until(()=>!!doc.querySelector('input[type=date]'));expect(doc.querySelector('iframe')).toBeNull();expect(doc.body.textContent).not.toContain('Create an assessment & plan first');expect(Array.from(doc.querySelector('select')!.querySelectorAll('option')).map((o:any)=>o.value)).toEqual(['','10','20','30','40','50','60','70','80','90','100']);
 const original=doc.querySelector('.prognosisPage');doc.getElementById('content')!.innerHTML=`<div id="patient-prognosis-page" data-patient-id="${other}"></div>`;await until(()=>calls.includes(other)&&!!doc.querySelector('input[type=date]'));expect(doc.querySelector('.prognosisPage')).not.toBe(original);dom.window.close();
 const loader=readFileSync('public/emr-assets/prognosis-loader.js','utf8');expect(loader).toContain("script.src='/emr-assets/prognosis-workspace.js'");expect(loader).not.toContain('plan_id');expect(readFileSync('public/emr-assets/app.js','utf8')).toContain('[data-prognosis-dirty="true"]');
});
