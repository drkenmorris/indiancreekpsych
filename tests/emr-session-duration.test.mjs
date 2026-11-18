import {runInContext} from 'node:vm';import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="content"></div>',{url:'https://clinic.test',runScripts:'outside-only'}),w=dom.window;
w.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');w.settingsSection=()=>'';w.readDemoSettings=()=>({custom_fields:[]});
runInContext(readFileSync('public/emr-assets/menu-completion.js','utf8'),dom.getInternalVMContext());
await test('Session time offers exactly the six requested durations and restores all six saved minute values',()=>{
 const expected=[['15','15 min'],['30','30 min'],['60','60 min'],['90','90 min'],['120','2 hours'],['180','3 hours']];
 for(const [value] of expected){w.saved={fields:{duration:value}};w.document.querySelector('#content').innerHTML=runInContext("structuredSectionFields('session_details',saved)",dom.getInternalVMContext());const select=w.document.querySelector('[data-section-field="duration"]');assert.equal(select.tagName,'SELECT');assert.deepEqual(Array.from(select.options).slice(1).map(o=>[o.value,o.textContent]),expected);assert.equal(select.value,value);}
});
await test('a previously saved duration remains visible without rewriting history',()=>{w.saved={fields:{duration:'45'}};w.document.querySelector('#content').innerHTML=runInContext("structuredSectionFields('session_details',saved)",dom.getInternalVMContext());const select=w.document.querySelector('[data-section-field="duration"]');assert.equal(select.value,'45');assert.match(select.selectedOptions[0].textContent,/Previously recorded: 45 min/);});


await test('date, time and Type of Session share one row with all13 Modality choices; all saved values and legacy free text restore',()=>{
 const source=readFileSync('lib/emr/treatment-modality.ts','utf8');
 const expected=Array.from(source.matchAll(/ '(\d{5})': '([^']+)'/g),match=>match[1]+' · '+match[2]);assert.equal(expected.length,13);
 for(const value of expected){w.saved={fields:{session_date:'2026-11-17',duration:'60',modality:value,location:'Fictional office'}};w.document.querySelector('#content').innerHTML=runInContext("structuredSectionFields('session_details',saved)",dom.getInternalVMContext());
  const row=w.document.querySelector('.session-details-row');assert.deepEqual(Array.from(row.querySelectorAll('[data-section-field]'),el=>el.dataset.sectionField),['session_date','duration','modality']);
  const select=row.querySelector('[data-section-field="modality"]');assert.equal(select.tagName,'SELECT');assert.deepEqual(Array.from(select.options).slice(1).map(option=>option.value),expected);assert.equal(select.value,value);assert.match(select.closest('label').textContent,/Type of Session/);assert.equal(w.document.querySelector('[data-session-field="location"]').closest('.session-details-row'),null);
 }
 w.saved={fields:{modality:'Previously documented fictional modality'}};w.document.querySelector('#content').innerHTML=runInContext("structuredSectionFields('session_details',saved)",dom.getInternalVMContext());assert.equal(w.document.querySelector('[data-section-field="modality"]').value,w.saved.fields.modality);assert.match(w.document.querySelector('[data-section-field="modality"]').selectedOptions[0].textContent,/Previously recorded/);
});

dom.window.close();
