import {runInContext} from 'node:vm';import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="content"></div>',{url:'https://clinic.test',runScripts:'outside-only'}),w=dom.window;
w.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');w.settingsSection=()=>'';w.readDemoSettings=()=>({custom_fields:[]});
runInContext(readFileSync('public/emr-assets/menu-completion.js','utf8'),dom.getInternalVMContext());
await test('Session time offers exactly the six requested durations and restores all six saved minute values',()=>{
 const expected=[['15','15 min'],['30','30 min'],['60','60 min'],['90','90 min'],['120','2 hours'],['180','3 hours']];
 for(const [value] of expected){w.saved={fields:{duration:value}};w.document.querySelector('#content').innerHTML=runInContext("structuredSectionFields('session_details',saved)",dom.getInternalVMContext());const select=w.document.querySelector('[data-section-field="duration"]');assert.equal(select.tagName,'SELECT');assert.deepEqual(Array.from(select.options).slice(1).map(o=>[o.value,o.textContent]),expected);assert.equal(select.value,value);}
});
await test('a previously saved duration remains visible without rewriting history',()=>{w.saved={fields:{duration:'45'}};w.document.querySelector('#content').innerHTML=runInContext("structuredSectionFields('session_details',saved)",dom.getInternalVMContext());const select=w.document.querySelector('[data-section-field="duration"]');assert.equal(select.value,'45');assert.match(select.selectedOptions[0].textContent,/Previously recorded: 45 min/);});
dom.window.close();
