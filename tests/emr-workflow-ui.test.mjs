import {runInContext} from 'node:vm';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {JSDOM} from 'jsdom';
const fixture=JSON.parse(execFileSync('python3',['-c',`import importlib.util,json
s=importlib.util.spec_from_file_location('tests','tests/emr-workflow-engine.test.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=m.Repo();print(json.dumps({'pid':r.pid,'boot':m.m.process({'patientId':r.pid,'path':'/api/bootstrap'},r)['value'],'chart':m.m.process({'patientId':r.pid,'path':'/api/chart'},r)['value'],'blank':m.m.process({'patientId':'','path':'/api/blank-workspace','method':'GET'},r)['value']}))`],{encoding:'utf8'}));
const library=JSON.parse(readFileSync('public/emr-assets/strengths-library.js','utf8').split(' = ')[1].trim().slice(0,-1)).items.map(x=>({...x,active:true,kind:x.type==='strength'?'strength':'challenge'}));
await test('actual hosted forms and global navigation render against central patient transport',async()=>{
 const html=readFileSync('public/emr-assets/index.html','utf8').replace(/<script[^>]*><\/script>/g,'');const dom=new JSDOM(html,{url:'https://www.indiancreekpsych.com/emr/workspace?patient='+fixture.pid+'&module=assessment&section=assessment%3Abiopsychosocial',runScripts:'outside-only'}),w=dom.window,errors=[];
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.confirm=()=>false;
 w.addEventListener('error',e=>errors.push(e.message));w.fetch=async(url,options)=>{let value;if(options?.body){const p=JSON.parse(options.body);assert.equal(p.patientId,fixture.pid);assert.equal(p.state,undefined);value={value:p.path==='/api/bootstrap'?fixture.boot:p.path.startsWith('/api/chart')?fixture.chart:{group:{name:'Permission pending',roster:[]},sessions:[]},revision:0};}else if(url==='/api/emr/patients?directory=1')value={patients:[{id:fixture.pid,demographics:{first_name:'Fictional',last_name:'Example',dob:'1990-01-02'}}]};else if(url==='/api/emr/descriptors')value={items:library};else value={me:{id:'fictional-provider',is_admin:true,profile:{first_name:'Fictional',last_name:'Provider'}}};return {ok:true,status:200,json:async()=>value};};
 for(const f of ['planner.js','navigation.js','patients.js','module-menu.js','providers.js','menu-completion.js','navigation-menus.js','strengths-library.js','strengths-builder.js','app.js','production.js','risk-assessment.js','central-directory.js'])runInContext(readFileSync('public/emr-assets/'+f,'utf8'),dom.getInternalVMContext());
 await new Promise(r=>setTimeout(r,100));assert.equal(errors.length,0,errors.join(';'));assert.match(w.document.querySelector('#chart-header').textContent,/Fictional Example/);assert.match(w.document.querySelector('#main-modules').textContent,/Administration/);assert.match(w.document.querySelector('#content').textContent,/Current Symptom Checklist/,'original BPS initial page must render');
 assert.equal(w.document.querySelector('[data-bps-intake-review]')?.getAttribute('href'),'/emr/bps-intake?patient='+fixture.pid+'&bps_page=symptoms','clinician can open the protected 21-section intake and return to the same original BPS tab');assert.ok(w.document.querySelector('#home-quick-menu button[data-quick-action="patients"]'),'original Find/Add Patient menu retained');assert.equal(w.document.querySelector('#provider-login'),null,'no synthetic provider login');
 assert.equal(w.document.querySelector('#navigation-panels').hidden,false,'original left column opens expanded');
 const menuLabels=id=>Array.from(w.document.querySelector(id).querySelectorAll('nav button,nav a')).map(node=>node.textContent.trim());
 assert.deepEqual(menuLabels('#home-quick-menu'),['Logout','Find/Add Patient','Appointment Scheduler','Manage Treatment Planners','Weekly Therapist Schedule']);
 assert.deepEqual(menuLabels('#provider-quick-menu'),['Provider Assignment','Provider Information','Assigned Patients List','Patient Overview','Patient Questionnaire Assignment','Patient Session Check-in','Billing']);
 assert.deepEqual(Array.from(w.document.querySelectorAll('#main-modules button')).map(node=>node.textContent),['Personal Data','Patient Assessments','Treatment Plan','Progress','Prognosis/Utilization Review','Prognosis','Discharge','Appointment Scheduler','Reports','System Settings','Administration']);

 // Linked prototype menu pages must resolve to real protected clinic services,
 // never synthetic appointment/provider data or separately saved demo accounts.
 runInContext("chooseSection('administration','weekly_schedule');render();",dom.getInternalVMContext());
 assert.equal(w.document.querySelector('#content a[href="/appointments"]')?.getAttribute('href'),'/appointments','must use the existing clinic calendar, never sample appointment records');
 assert.equal(w.document.querySelector('#weekly-schedule-date'),null,'no local fictional weekly calendar is mounted');
 runInContext("chooseSection('administration','assigned_patients');render();",dom.getInternalVMContext());
 assert.equal(w.document.querySelector('#content a[href="/emr/patients"]')?.getAttribute('href'),'/emr/patients','central directory replaces synthetic assigned patient list');
 assert.equal(w.document.querySelector('#assigned-patient-results'),null,'no demo chart lookup is rendered');
 runInContext("chooseSection('personal','assigned_provider');render();",dom.getInternalVMContext());
 assert.match(w.document.querySelector('#content').textContent,/Fictional provider accounts are disabled/);
 assert.equal(w.document.querySelector('#module-section-form'),null,'no provider assignment can be saved against a fictitious identity');



 // A real selected chart must never auto-populate clinical assessment or plan fields
 // with example histories, a made-up diagnosis, review date or fabricated outcome.
 fixture.chart.records.push({id:'fictional-checkin-for-form-test',kind:'response',created:'2026-11-10T00:00:00.000Z'});
 runInContext("chooseSection('assessment','summary');render();",dom.getInternalVMContext());
 for(const name of Object.keys(fixture.boot.assessment_fields).concat(['pathway_name','pathway_rationale'])){
  const input=w.document.querySelector('#content [name="'+name+'"]');
  assert.ok(input,'original assessment field '+name+' should render');
  assert.equal(input.value,'',name+' must not contain prewritten synthetic clinical facts');
 }
 fixture.chart.records.push({id:'fictional-assessment-for-form-test',kind:'assessment',created:'2026-11-10T00:00:01.000Z',problems:[]});
 for(const [key,step] of [['problems','Problems'],['definitions','Definitions'],['goals','Goals'],['objectives','Objectives/Interventions']]){
  runInContext(`chooseSection('plan','${key}');render();`,dom.getInternalVMContext());
  const link=w.document.querySelector('#content a[href^="/emr/treatment-plan?"]');
  assert.ok(link);
  const target=new URL(link.href);
  assert.equal(target.searchParams.get('patient'),fixture.pid);
  assert.equal(target.searchParams.get('step'),step);
  assert.equal(w.document.querySelector('#plan-hierarchy'),null);
 }
 runInContext("chooseSection('plan','diagnosis');render();",dom.getInternalVMContext());
 for(const name of ['diagnosis','treatment_approaches','response_to_treatment','homework','review_date']){
  const input=w.document.querySelector('#content [name="'+name+'"]');
  assert.ok(input,'original treatment-plan field '+name+' should render');
  assert.equal(input.value,'',name+' must require explicit clinical entry, not a synthetic default');
 }
 fixture.chart.records.splice(-2,2);
 for(const [module,key,text] of [['personal','insurance','Insurance information'],['assessment','biopsychosocial','Current Symptom Checklist'],['notes','record_history','Record history']]){runInContext(`chooseSection(${JSON.stringify(module)},${JSON.stringify(key)});render();`,dom.getInternalVMContext());await new Promise(r=>setTimeout(r,20));assert.match(w.document.querySelector('#content').textContent,new RegExp(text,'i'));}
 assert.equal(w.document.querySelectorAll('[aria-label="Linked 21-section intake biopsychosocial review"]').length,0,'no extra panel added to the original BPS layout');
 await runInContext('refreshRegistry()',dom.getInternalVMContext());
 assert.match(w.document.querySelector('#directory-rows').textContent,/Example, Fictional/);
 assert.equal(w.document.querySelector('[data-registry-action="delete"]').disabled,false,'central directory deletion is available');
 assert.equal(w.document.querySelector('[data-registry-action="archive"]').disabled,true,'unimplemented archive operations remain disabled');
 runInContext('openDirectory()',dom.getInternalVMContext());await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(w.document.querySelector('#patient-directory').open,true,'original patient dialog opens in the clinical shell');
 w.document.querySelector('#patient-directory').close();
 // The builder runs in the actual hosted form and retains manual narrative.
 runInContext("chooseSection('assessment','strengths');render();",dom.getInternalVMContext());
 await new Promise(r=>setTimeout(r,20));
 const q=s=>w.document.querySelector(s), change=n=>n.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.document.querySelectorAll('input[name="descriptor_choice"]').length,240);
 assert.equal(w.document.querySelectorAll('input[name="descriptor_choice"]:checked').length,0);
 q('[data-section-field="strengths"]').value='Existing individualized narrative';
 const strength=q('input[value="IC-01-S01"]'),need=q('input[value="IC-01-N01"]');
 strength.checked=true;change(strength);need.checked=true;change(need);
 assert.match(q('#descriptor-preview').value,/Recognizes personal strengths/);
 assert.match(q('#descriptor-preview').value,/Difficulty identifying personal strengths/);
 q('#descriptor-search').value='transportation';q('#descriptor-search').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(w.document.querySelectorAll('input[name="descriptor_choice"]').length,2);
 assert.match(q('#descriptor-preview').value,/Recognizes personal strengths/);
 q('#descriptor-insert').click();
 assert.equal(q('[data-section-field="strengths"]').value,'Existing individualized narrative\n• Recognizes personal strengths');
 assert.equal(q('[data-section-field="weaknesses"]').value,'• Difficulty identifying personal strengths');
 q('#descriptor-search').value='';q('#descriptor-search').dispatchEvent(new w.Event('input',{bubbles:true}));
 q('input[value="IC-01-S01"]').checked=true;change(q('input[value="IC-01-S01"]'));q('#descriptor-insert').click();
 assert.equal(q('[data-section-field="strengths"]').value.split('Recognizes personal strengths').length,2,'repeated insert does not duplicate wording');
 q('#descriptor-custom-text').value='<img src=x onerror=alert(1)>\nOriginal custom item\nOriginal custom item';q('#descriptor-add-custom').click();
 assert.equal(w.document.querySelectorAll('input[name="descriptor_choice"]').length,2);
 assert.equal(q('#descriptor-options img'),null,'custom wording is escaped');
 const custom=q('input[value="CUSTOM-241"]');custom.checked=true;change(custom);
 q('#descriptor-copy').click();await new Promise(r=>setTimeout(r,0));
 assert.match(q('#descriptor-status').textContent,/press Command\+C or Ctrl\+C/);
 assert.equal(q('#descriptor-preview').selectionEnd,q('#descriptor-preview').value.length);
 let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});
 q('#descriptor-copy').click();await new Promise(r=>setTimeout(r,0));assert.match(copied,/Original custom item/);
 const field=q('[data-section-field="strengths"]');field.value='x'.repeat(7999);
 q('#descriptor-insert').click();assert.equal(field.value.length,7999);assert.match(q('#descriptor-status').textContent,/field limit/);
 field.value='Existing individualized narrative';
 // Submit includes pending selections using the existing central chart transport.
 let submitted;
 const priorFetch=w.fetch;w.fetch=async(url,options)=>{if(options?.body){const payload=JSON.parse(options.body);if(payload.body?.action==='workspace_section'){submitted=payload;fixture.chart.records.push({...payload.body.data,kind:'workspace_section',id:'fictional-strengths',created:new Date().toISOString()});}}return priorFetch(url,options);};
 q('#module-section-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(r=>setTimeout(r,60));
 assert.ok(submitted,'central workflow save was called');
 assert.match(JSON.stringify(submitted),/Original custom item/);
 assert.match(q('[data-section-field="strengths"]').value,/Original custom item/);
 assert.match(q('#content').textContent,/Saved versions/);
 library.push({id:'permanent-shared-item',kind:'strength',type:'strength',domain:'Shared test domain',label:'New permanently shared wording',active:true});
 q('#descriptor-reload').click();await new Promise(r=>setTimeout(r,20));
 assert.ok(q('input[value="permanent-shared-item"]'),'new central choices appear after refresh');
 library.at(-1).active=false;q('#descriptor-reload').click();await new Promise(r=>setTimeout(r,20));
 assert.equal(q('input[value="permanent-shared-item"]'),null,'inactive central choices are not offered');
 runInContext("document.querySelector('#content').innerHTML=bpsMedicationsView();bindBpsMedications()",dom.getInternalVMContext());
 const medicationForm=q('form[data-action="biopsychosocial_medication"]');
 assert.ok(medicationForm);
 const medicationFetch=w.fetch;
 w.fetch=(url,options)=>url==='/emr-assets/medication-catalog.json'
  ?Promise.resolve({ok:true,json:async()=>JSON.parse(readFileSync('public/emr-assets/medication-catalog.json','utf8'))})
  :medicationFetch(url,options);
 medicationForm.elements.dosage.value='Half a tablet';
 medicationForm.elements.medication.value='Ser';
 medicationForm.elements.medication.dispatchEvent(new w.Event('input',{bubbles:true}));
 await new Promise(r=>setTimeout(r,20));
 const choice=Array.from(medicationForm.querySelectorAll('[data-medication-matches] button')).find(button=>button.textContent==='sertraline 50 MG Oral Tablet [Zoloft]');
 assert.ok(choice,'three generic-name characters surface labeled strengths');
 choice.click();
 const medicationData=new w.FormData(medicationForm);
 assert.equal(medicationData.get('medication'),choice.textContent);
 assert.equal(medicationData.get('dosage'),'Half a tablet');
 assert.equal(medicationForm.dataset.modified,'true');
 assert.equal(errors.length,0,errors.join(';'));assert.equal(w.localStorage.getItem('emr-web-demo-v1'),null);dom.window.close();
});

await test('unselected workspace opens actual empty forms and checkboxes without selecting or saving a patient',async()=>{
 const html=readFileSync('public/emr-assets/index.html','utf8').replace(/<script[^>]*><\/script>/g,'');
 const dom=new JSDOM(html,{url:'https://www.indiancreekpsych.com/emr/workspace',runScripts:'outside-only'}),w=dom.window,errors=[],writes=[];
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.addEventListener('error',event=>errors.push(event.message));
 w.fetch=async(url,options)=>{let value;
  if(url==='/api/emr/workflow'&&options?.body){const body=JSON.parse(options.body);assert.equal(body.patientId,'');assert.equal(body.path,'/api/blank-workspace');assert.equal(body.method,'GET');value={value:fixture.blank,revision:0};}
  else if(url==='/api/emr/descriptors')value={items:library};
  else if(url==='/api/emr/workflow')value={me:{id:'fictional-provider',is_admin:true,profile:{first_name:'Fictional',last_name:'Provider'}}};
  else {writes.push(url);throw Error('Unexpected patient access '+url);}
  return {ok:true,status:200,json:async()=>value};
 };
 for(const f of ['planner.js','navigation.js','patients.js','module-menu.js','providers.js','menu-completion.js','navigation-menus.js','strengths-library.js','strengths-builder.js','app.js','production.js','risk-assessment.js','central-directory.js'])runInContext(readFileSync('public/emr-assets/'+f,'utf8'),dom.getInternalVMContext());
 await new Promise(resolve=>setTimeout(resolve,100));
 assert.equal(errors.length,0,errors.join(';'));assert.equal(w.document.querySelector('#patient-directory').open,false);
 // Opening a central patient retains the original seven-page BPS context.
 runInContext("chooseSection('assessment','biopsychosocial')",dom.getInternalVMContext());
 w.history.replaceState(null,'','/emr/workspace?module=assessment&section=assessment%3Abiopsychosocial&bps_page=family_origin');
 assert.equal(runInContext("selectedPatientWorkspaceUrl("+JSON.stringify(fixture.pid)+")",dom.getInternalVMContext()),'/emr/workspace?patient='+fixture.pid+'&module=assessment&section=assessment%3Abiopsychosocial&bps_page=family_origin');
 runInContext("chooseSection('notes','planner')",dom.getInternalVMContext());
 assert.equal(runInContext("selectedPatientWorkspaceUrl("+JSON.stringify(fixture.pid)+")",dom.getInternalVMContext()),'/emr/workspace?patient='+fixture.pid+'&module=notes&section=notes%3Aplanner','other clinical destinations remain intact');

 assert.ok(w.document.querySelector('input[name="first_name"]'),'demographics fields available without a patient');
 for(const [module,key] of [['assessment','biopsychosocial'],['notes','planner'],['prognosis','prognosis'],['discharge','details']]){
  runInContext(`chooseSection(${JSON.stringify(module)},${JSON.stringify(key)});render();`,dom.getInternalVMContext());
  if(module==='assessment')assert.equal(w.document.querySelector('[data-bps-intake-review]'),null,'unbound blank BPS cannot open linked patient intake');
  assert.ok(w.document.querySelectorAll('#content input,#content textarea,#content select').length>0,module+' has actual form controls');
  for(const field of w.document.querySelectorAll('#content input:not([type="hidden"]):not([type="button"]):not([type="submit"]),#content textarea,#content select')){
   if(['checkbox','radio'].includes(field.type))assert.equal(field.checked,false);else assert.equal(field.value,'',field.name+' has no sample value');
  }
 }
 runInContext("chooseSection('plan','problems');render();",dom.getInternalVMContext());
 assert.ok(w.document.querySelector('[data-open-plan-patient]'));
 await assert.rejects(runInContext("api('/api/save',{method:'POST',body:'{}'})",dom.getInternalVMContext()),/Select a patient/);
 assert.deepEqual(writes,[]);assert.equal(errors.length,0,errors.join(';'));dom.window.close();
});
