import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('original note form remains and only a selected chart receives a patient-bound central-note link',()=>{
 const source=readFileSync('public/emr-assets/central-directory.js','utf8');
 const bridge=source.slice(source.indexOf('const originalAttestationNotesView='));
 const context=vm.createContext({notesView:()=>'<form id="original-notes"></form>',blankWorkspace:true,patientId:'',encodeURIComponent});
 vm.runInContext(bridge,context);
 assert.equal(vm.runInContext('notesView()',context),'<form id="original-notes"></form>');
 context.blankWorkspace=false;context.patientId='10800000-0000-4000-8000-000000000101';
 const html=vm.runInContext('notesView()',context);
 assert.match(html,/href="\/emr\/patients\?patient=10800000-0000-4000-8000-000000000101"/);
 assert.ok(html.endsWith('<form id="original-notes"></form>'));
 context.patientId='';assert.equal(vm.runInContext('notesView()',context),'<form id="original-notes"></form>');
});
