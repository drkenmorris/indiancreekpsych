"""Exhaustive original form-choice and field serialization through the real adapter.
Repository transport is mocked here; hosted SQL and browser checks are separate.
"""
import unittest,importlib.util,json,base64
from pathlib import Path
spec=importlib.util.spec_from_file_location('workflow_tests',Path(__file__).with_name('emr-workflow-engine.test.py'))
existing=importlib.util.module_from_spec(spec);spec.loader.exec_module(existing)
from modules import patients,biopsychosocial,family_origin,medical_substance,developmental_personal,trauma_history,workspaces

class FieldRoundTrip(unittest.TestCase):
 def save_read(self,action,data,repo=None):
  repo=repo or existing.Repo();revision=repo.saved[0]['revision'] if repo.saved else 0
  saved=existing.m.process({'patientId':repo.pid,'method':'POST','path':'/api/save','expectedRevision':revision,'body':{'patient_id':repo.pid,'action':action,'data':data}},repo)['value']
  reopened=existing.m.process({'patientId':repo.pid,'path':'/api/chart'},repo)['value']['records'][-1]
  for key,value in saved.items():self.assertEqual(reopened[key],value,key)
  self.assertEqual(reopened['recorded_by_account_id'],repo.user)
  return reopened
 def test_every_demographic_field_and_choice(self):
  base={'schema':'demographics/2','first_name':'Fictional','last_name':'Audit','dob':'1990-01-02','active':True,'previous_treatment':True}
  data={**base,**{key:'Fictional '+key for key in patients.TEXT_FIELDS if key!='ssn'},'ssn':'000-00-0000','identity_number':'FICT-000','identity_number_type':"Driver's license number",'identity_number_source':'Patient-reported / from memory',**{key:'2026-01-02' for key in patients.DATE_FIELDS},'episodes':[{'start':'2026-01-01','end':'2026-01-02','primary_problem':'Fictional episode problem'}]}
  saved=self.save_read('demographics',data)
  for key,value in data.items():
   if key not in ('ssn','episodes'):self.assertEqual(saved[key],value,key)
  for key,choices in patients.CHOICES.items():
   for value in choices:
    with self.subTest(field=key,choice=value):self.assertEqual(self.save_read('demographics',{**base,key:value})[key],value)
 def test_every_current_archived_insurance_field_and_authorization(self):
  keys=['carrier','street_address_1','street_address_2','city','state','zip','group_number','payer_id','provider_phone','patient_first_name','patient_last_name','insured_first_name','insured_last_name','plan_name','member_id','coverage_notes']
  data={**{key:'Fictional '+key for key in keys},'patient_dob':'1990-01-02','insured_dob':'1960-03-04','subscriber_relationship':'Parent'}
  for action in ('insurance','insurance_archive'):
   saved=self.save_read(action,data)
   for key,value in data.items():self.assertEqual(saved[key],value,key)
   for status in ('Self','Spouse','Parent','Guardian','Other'):self.assertEqual(self.save_read(action,{**data,'subscriber_relationship':status})['subscriber_relationship'],status)
  self.assertEqual(self.save_read('insurance_authorization',{'total_sessions_authorized':'12','sessions_used_to_date':'3','no_sessions_authorized':False})['remaining_sessions'],9)
  self.assertEqual(self.save_read('insurance_authorization',{'sessions_used_to_date':'0','no_sessions_authorized':True})['remaining_sessions'],0)
 def test_all_symptoms_with_each_rating_and_clear(self):
  repo=existing.Repo()
  for rating in biopsychosocial.RATINGS:
   ratings={item['id']:rating for item in biopsychosocial.SYMPTOMS}
   self.assertEqual(self.save_read('biopsychosocial_symptoms',{'ratings':ratings},repo)['ratings'],ratings)
  self.assertEqual(self.save_read('biopsychosocial_symptoms',{'ratings':{}},repo)['ratings'],{})
 def test_every_history_checkbox_and_notes_field(self):
  count=0
  for action,module in [('biopsychosocial_family_origin',family_origin),('biopsychosocial_medical_substance',medical_substance),('biopsychosocial_developmental_personal',developmental_personal),('biopsychosocial_trauma_history',trauma_history)]:
   notes={key:'Fictional audit '+key for key in module.NOTES}
   for group in module.GROUPS:
    for choice in group['choices']:
     with self.subTest(action=action,group=group['key'],choice=choice):
      saved=self.save_read(action,{'selections':{group['key']:[choice]},'notes':notes});self.assertEqual(saved['selections'][group['key']],[choice]);self.assertEqual(saved['notes'],notes);count+=1
   saved=self.save_read(action,{'selections':{},'notes':{}});self.assertTrue(all(not values for values in saved['selections'].values()))
  print('History checkbox choices round-tripped:',count)
 def test_counseling_medications_allergies_and_updates(self):
  for setting in ('Inpatient','Outpatient'):
   data={'setting':setting,'provider_facility':'Fictional facility','start_date':'2025-01-01','end_date':'2025-02-01','ongoing':False,'reason':'Fictional reason','outcome_notes':'Fictional outcome'}
   saved=self.save_read('biopsychosocial_treatment_history',data)
   for key,value in data.items():self.assertEqual(saved[key],value)
  for benefit in ('Beneficial','Not beneficial',''):
   data={'medication':'Fictional medication','dosage':'Fictional dose','frequency':'Fictional frequency','start_date':'2025-01-01','end_date':'2025-02-01','status':'Past','prescribing_physician':'Fictional prescriber','benefit':benefit}
   saved=self.save_read('biopsychosocial_medication',data)
   for key,value in data.items():self.assertEqual(saved[key],value)
  for status in ('Not yet reviewed','No known medication allergies','Medication allergies reported'):
   data={'allergy_status':status,'allergy_notes':'Fictional allergy' if status=='Medication allergies reported' else ''};saved=self.save_read('medication_allergies',data)
   self.assertEqual(saved['allergy_status'],status);self.assertEqual(saved['allergy_notes'],data['allergy_notes'])
 def test_every_workspace_section_and_field(self):
  fields={'strengths':['strengths','weaknesses'],'mental_status':['appearance','speech','mood','thought','orientation','judgment'],'recovery_criteria':['criteria','evidence'],'session_details':['session_date','duration','modality','location'],'objective_rating':['objective','rating','rationale'],'session_custom_fields':['custom_00000000-0000-4000-8000-000000000001']}
  for section in workspaces.SECTIONS:
   data={'section':section,'text':'Fictional notes '+section,'review_date':'2026-01-01','fields':{key:'Fictional '+key for key in fields.get(section,[])}}
   if section=='risk_assessment':data['fields']={**{key:'No' for key in workspaces.RISK_CHOICES},**{key:'Fictional '+key for key in workspaces.RISK_NARRATIVES}}
   saved=self.save_read('workspace_section',data);self.assertEqual(saved['fields'],data['fields']);self.assertEqual(saved['text'],data['text']);self.assertEqual(saved['review_date'],data['review_date'])
  for value in ('15','30','60','90','120','180'):
   repo=existing.Repo();data={'section':'session_details','fields':{'session_date':'2026-01-01','duration':value,'modality':'Fictional individual','location':'Fictional office'},'text':'Fictional session'}
   self.assertEqual(self.save_read('workspace_section',data,repo)['fields']['duration'],value)
 def test_all_thirteen_session_type_values(self):
  import re
  source=(Path(__file__).parents[1]/'lib/emr/treatment-modality.ts').read_text()
  choices=re.findall(r" '(\d{5})': '([^']+)'",source)
  self.assertEqual(len(choices),13)
  for code,label in choices:
   value=code+' · '+label
   self.assertEqual(self.save_read('workspace_section',{'section':'session_details','fields':{'session_date':'2026-11-17','duration':'60','modality':value,'location':'Fictional office'}})['fields']['modality'],value)
 def test_document_bytes_and_metadata_roundtrip(self):
  raw=b'%PDF-1.4\nFictional audit document only\n%%EOF'
  saved=self.save_read('document',{'title':'Fictional audit PDF','category':'General Scan','synthetic_confirmed':True,'data_url':'data:application/pdf;base64,'+base64.b64encode(raw).decode()})
  self.assertEqual(base64.b64decode(saved['data_url'].split(',')[1]),raw);self.assertEqual(saved['title'],'Fictional audit PDF')
if __name__=='__main__':unittest.main()
