'use strict';
const riskPreviousSectionView=moduleSectionView;
const isRiskSection=()=>activeSection?.module==='assessment'&&activeSection.key==='risk_assessment';
moduleSectionView=function(){
 if(!isRiskSection())return riskPreviousSectionView();
 return '<section class="card"><h2>Risk Assessment</h2><p>Saved patient intake answers appear automatically. You can enter or revise clinician answers separately.</p><div id="risk-assessment-source"><p role="status">'+(patientId?'Loading risk assessment…':'Select a patient to open the risk assessment.')+'</p></div></section>';
};

function bindRiskAssessment(panel,id){
 let pending=false,edited=false,sourceSnapshot='';
 const current=()=>panel.isConnected&&patientId===id&&isRiskSection();
 async function refresh(){
  if(!current()){clearInterval(timer);return;}
  if(pending||edited||document.visibilityState==='hidden')return;
  pending=true;
  try{
   const response=await fetch('/api/emr/risk-assessment?patient='+encodeURIComponent(id),{cache:'no-store',credentials:'same-origin'});
   const data=await response.json();
   if(!current()||edited)return;
   if(!response.ok||data.patientId!==id||data.fields?.length!==7)throw Error(data.error||'Risk assessment unavailable.');
   const snapshot=JSON.stringify(data);
   if(snapshot===sourceSnapshot)return;
   sourceSnapshot=snapshot;
   draw(data);
  }catch(error){if(current()&&!edited){sourceSnapshot='';panel.textContent=error.message;}}
  finally{pending=false;}
 }
 function draw(data){
  const saved=latestSection('risk_assessment')?.fields??{};
  const form=document.createElement('form');
  const clinician={...saved};
  const narrativeControls=[];
  const hasPositiveAnswer=()=>data.fields.some(field=>field.type==='yes-no'&&(clinician[field.key]??field.value)==='Yes');
  const updateNarratives=()=>{for(const {key,label,box,input} of narrativeControls){
   label.hidden=key==='violence_risk_details'&&hasPositiveAnswer();
   input.disabled=box.checked&&!label.hidden;
   if(label.hidden&&box.checked)input.value='';
  }};
  const source=document.createElement('p');
  source.textContent=data.source?'Patient-reported · '+data.source.status+' intake · Version '+data.source.version:data.reason;
  for(const field of data.fields){
   const group=document.createElement('fieldset');
   const legend=document.createElement('legend');
   legend.textContent=field.label;
   group.append(legend);
   const original=document.createElement('p');
   original.textContent='Patient report: '+(field.value||'No answer recorded');
   group.append(original);
   const value=saved[field.key]??field.value;
   const edit=next=>{clinician[field.key]=next;edited=true;dirty=true;};
   if(field.type==='yes-no'){
    const choices=document.createElement('div');
    choices.className='riskAssessmentChoices';
    for(const option of ['Yes','No']){
     const label=document.createElement('label'),box=document.createElement('input');
     box.type='checkbox';
     box.checked=value===option;
     box.addEventListener('change',()=>{
      if(box.checked)for(const other of choices.querySelectorAll('input'))if(other!==box)other.checked=false;
      edit(box.checked?option:'');
      updateNarratives();
     });
     label.append(box,document.createTextNode(option));
     choices.append(label);
    }
    group.append(choices);
   }else{
    const input=document.createElement('textarea');
    input.rows=4;
    input.maxLength=8000;
    input.value=value;
    input.setAttribute('aria-label',field.label);
    input.addEventListener('input',()=>edit(input.value));
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='checkbox';
    box.checked=value==='Not applicable';
    if(box.checked)input.value='';
    box.addEventListener('change',()=>{input.value='';edit(box.checked?'Not applicable':'');updateNarratives();});
    input.addEventListener('input',()=>{box.checked=false;});
    label.append(box,document.createTextNode('Not Applicable'));
    narrativeControls.push({key:field.key,label,box,input});
    group.append(input,label);
   }
   if(Object.hasOwn(saved,field.key)){
    const label=document.createElement('p');
    label.textContent='Clinician answer saved';
    group.append(label);
   }
   form.append(group);
  }
  updateNarratives();
  const save=document.createElement('button');
  save.type='submit';
  save.textContent='Save clinician answers';
  const status=document.createElement('p');
  status.setAttribute('role','status');
  form.append(save,status);
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!current()||save.disabled)return;
   if(!edited){status.textContent='No clinician changes to save.';return;}
   if(hasPositiveAnswer()&&clinician.violence_risk_details==='Not applicable'){
    status.textContent='Enter the safety details or clear the clinician’s Not Applicable response.';
    return;
   }
   save.disabled=true;
   const controls=[...form.querySelectorAll('input,textarea')].filter(control=>!control.disabled);
   controls.forEach(control=>control.disabled=true);
   try{
    await api('/api/save',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':boot.csrf},
     body:JSON.stringify({patient_id:id,action:'workspace_section',data:{section:'risk_assessment',fields:clinician}})});
    if(!current())return;
    dirty=false;
    await reload();
    message('Clinician risk assessment answers saved.');
   }catch(error){if(current()){status.textContent=error.message;save.disabled=false;controls.forEach(control=>control.disabled=false);updateNarratives();}}
  });
  panel.replaceChildren(source,form);
 }
 const timer=setInterval(refresh,5000);
 void refresh();
}
const riskPreviousRender=render;
render=function(){
 if(isRiskSection())view='module-section';
 const result=riskPreviousRender();
 const panel=document.querySelector('#risk-assessment-source');
 if(panel&&patientId)bindRiskAssessment(panel,patientId);
 return result;
};
