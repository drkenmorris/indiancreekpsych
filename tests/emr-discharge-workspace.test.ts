// @vitest-environment node
import {expect,test} from 'vitest';
import {build} from 'esbuild';
// @ts-expect-error jsdom fixtures use untyped package
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
async function until(check:()=>boolean){for(let i=0;i<100;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Prognosis did not render');}
test('lazy native discharge bundle mounts with toolbar and remounts for a different patient',async()=>{
 const built=await build({entryPoints:['browser/prognosis-workspace.tsx'],bundle:true,write:false,outfile:'prognosis.js',format:'iife',platform:'browser',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
 const pid='00000000-0000-4000-8000-000000000103',other='00000000-0000-4000-8000-000000000104';
 const dom=new JSDOM(`<div id="content"><div id="patient-discharge-page" data-patient-id="${pid}"></div></div>`,{runScripts:'outside-only',url:'https://fictional.example/emr/workspace'}),calls:string[]=[];
 dom.window.fetch=async(_url:any,options:any)=>{if(_url==='/api/emr/discharge-criteria')return Response.json({revision:0,items:[]});const b=JSON.parse(options.body);calls.push(b.patientId);return Response.json({value:{patient:{id:b.patientId},records:[]},revision:0});};dom.window.eval(built.outputFiles.find(f=>f.path.endsWith('.js'))!.text);const doc=dom.window.document;
 await until(()=>!!doc.querySelector('input[type=date]'));expect(doc.querySelector('iframe')).toBeNull();expect(doc.body.textContent).not.toContain('Create an assessment & plan first');await until(()=>!!doc.querySelector('[contenteditable=true]'));expect(doc.querySelector('[contenteditable=true]')).toBeTruthy();expect(doc.body.textContent).toContain('Aftercare Plan/Discharge Summary');expect(doc.body.textContent).toContain('Competency to Manage Self-Care');
 const original=doc.querySelector('.dischargePage');doc.getElementById('content')!.innerHTML=`<div id="patient-discharge-page" data-patient-id="${other}"></div>`;await until(()=>calls.includes(other)&&!!doc.querySelector('input[type=date]'));expect(doc.querySelector('.dischargePage')).not.toBe(original);dom.window.close();
 const loader=readFileSync('public/emr-assets/prognosis-loader.js','utf8');expect(loader).toContain("script.src='/emr-assets/prognosis-workspace.js'");expect(loader).not.toContain('plan_id');expect(readFileSync('public/emr-assets/app.js','utf8')).toContain('[data-discharge-dirty="true"]');
});

test('both menus remove only the duplicate main prognosis and preserve old bookmarks',()=>{const data=JSON.parse(readFileSync('app/emr/navigation/menu-data.json','utf8'));expect(JSON.stringify(data.modules)).not.toContain('prognosis_details');expect(JSON.stringify(data)).toContain('Scheduled Review');const raw=readFileSync('public/emr-assets/providers.js','utf8');expect(raw).not.toContain("prognosis_details:['Prognosis'");const links=readFileSync('app/emr/navigation/links.ts','utf8');expect(links).toContain("prognosis_details");});
