import {runInContext} from 'node:vm';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {JSDOM} from 'jsdom';
const fixture=JSON.parse(execFileSync('python3',['-c',`import importlib.util,json
s=importlib.util.spec_from_file_location('tests','tests/emr-workflow-engine.test.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=m.Repo();print(json.dumps({'pid':r.pid,'boot':m.m.process({'patientId':r.pid,'path':'/api/bootstrap'},r)['value'],'chart':m.m.process({'patientId':r.pid,'path':'/api/chart'},r)['value']}))`],{encoding:'utf8'}));
const library=JSON.parse(readFileSync('public/emr-assets/strengths-library.js','utf8').split(' = ')[1].trim().slice(0,-1)).items.map(x=>({...x,active:true,kind:x.type==='strength'?'strength':'challenge'}));
await test('actual hosted forms and global navigation render against central patient transport',async()=>{
 const html=readFileSync('public/emr-assets/index.html','utf8').replace(/<script[^>]*><\/script>/g,'');const dom=new JSDOM(html,{url:'https://www.indiancreekpsych.com/emr/workspace?patient='+fixture.pid+'&module=assessment&section=assessment%3Abiopsychosocial',runScripts:'outside-only'}),w=dom.window,errors=[];
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.confirm=()=>false;
 w.addEventListener('error',e=>errors.push(e.message));w.fetch=async(url,options)=>{let value;if(options?.body){const p=JSON.parse(options.body);assert.equal(p.patientId,fixture.pid);assert.equal(p.state,undefined);value={value:p.path==='/api/bootstrap'?fixture.boot:p.path.startsWith('/api/chart')?fixture.chart:{group:{name:'Permission pending',roster:[]},sessions:[]},revision:0};}else if(url==='/api/emr/patients')value={patients:[{id:fixture.pid,demographics:{first_name:'Fictional',last_name:'Example',dob:'1990-01-02'}}]};else if(url==='/api/emr/descriptors')value={items:library};else value={me:{id:'fictional-provider',is_admin:true,profile:{first_name:'Fictional',last_name:'Provider'}}};return {ok:true,status:200,json:async()=>value};};
 for(const f of ['planner.js','navigation.js','patients.js','module-menu.js','providers.js','menu-completion.js','navigation-menus.js','strengths-library.js','strengths-builder.js','app.js','production.js','central-directory.js'])runInContext(readFileSync('public/emr-assets/'+f,'utf8'),dom.getInternalVMContext());
 await new Promise(r=>setTimeout(r,100));assert.equal(errors.length,0,errors.join(';'));assert.match(w.document.querySelector('#chart-header').textContent,/Fictional Example/);assert.match(w.document.querySelector('#main-modules').textContent,/Administration/);assert.match(w.document.querySelector('#content').textContent,/Current Symptom Checklist/,'original BPS initial page must render');assert.ok(w.document.querySelector('#home-quick-menu button[data-quick-action="patients"]'),'original Find/Add Patient menu retained');assert.equal(w.document.querySelector('#provider-login'),null,'no synthetic provider login');
 assert.equal(w.document.querySelector('#navigation-panels').hidden,false,'original left column opens expanded');
 const menuLabels=id=>Array.from(w.document.querySelector(id).querySelectorAll('nav button,nav a')).map(node=>node.textContent.trim());
 assert.deepEqual(menuLabels('#home-quick-menu'),['Logout','Find/Add Patient','Appointment Scheduler','Manage Treatment Planners','Weekly Therapist Schedule']);
 assert.deepEqual(menuLabels('#provider-quick-menu'),['Provider Assignment','Provider Information','Assigned Patients List','Patient Overview','Patient Questionnaire Assignment','Patient Session Check-in','Billing']);
 assert.deepEqual(Array.from(w.document.querySelectorAll('#main-modules button')).map(node=>node.textContent),['Personal Data','Patient Assessments','Treatment Plan','Progress','Prognosis/Utilization Review','Prognosis','Discharge','Appointment Scheduler','Reports','System Settings','Administration']);

 for(const [module,key,text] of [['personal','insurance','Insurance information'],['assessment','biopsychosocial','Current Symptom Checklist'],['notes','record_history','Record history']]){runInContext(`chooseSection(${JSON.stringify(module)},${JSON.stringify(key)});render();`,dom.getInternalVMContext());await new Promise(r=>setTimeout(r,20));assert.match(w.document.querySelector('#content').textContent,new RegExp(text,'i'));}
 assert.equal(w.document.querySelectorAll('[aria-label="Linked 21-section intake biopsychosocial review"]').length,0,'no extra panel added to the original BPS layout');
 await runInContext('refreshRegistry()',dom.getInternalVMContext());
 assert.match(w.document.querySelector('#directory-rows').textContent,/Example, Fictional/);
 assert.ok(Array.from(w.document.querySelectorAll('[data-registry-action]')).every(button=>button.disabled),'unsupported retention operations cannot call demo storage');
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
 assert.equal(errors.length,0,errors.join(';'));assert.equal(w.localStorage.getItem('emr-web-demo-v1'),null);dom.window.close();
});
