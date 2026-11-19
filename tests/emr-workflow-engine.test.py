import importlib.util,unittest,json,uuid,io
from unittest.mock import patch
from urllib.error import HTTPError
from pathlib import Path
spec=importlib.util.spec_from_file_location('adapter',Path(__file__).parents[1]/'api/emr_engine.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Repo:
 def __init__(self):self.user=str(uuid.uuid4());self.pid=str(uuid.uuid4());self.row={'id':self.pid,'revision':1,'demographics':{'first_name':'Fictional','last_name':'Example','dob':'1990-01-02'}};self.saved=[]
 def rest(self,path,body=None):
  if path.startswith('clinical_patients?'):return [self.row] if 'id=eq.'+self.pid in path else []
  if path.startswith('emr_workspaces?'):return self.saved
  if path=='rpc/save_emr_workspace':
   rev=self.saved[0]['revision'] if self.saved else 0
   if body['p_expected']!=rev:raise m.Conflict()
   self.saved=[{'revision':rev+1,'state':body['p_state']}]
   if body.get('p_demographics') is not None:self.row['demographics'].update(body['p_demographics']);self.row['revision']+=1
   return rev+1
  raise AssertionError(path)
class WorkflowTests(unittest.TestCase):
 def setUp(self):self.repo=Repo()
 def run_action(self,path,body=None,revision=0,pid=None):return m.process({'patientId':pid or self.repo.pid,'path':path,'method':'POST' if body else 'GET','body':body,'expectedRevision':revision},self.repo)
 def test_blank_workspace_returns_only_empty_forms_and_static_definitions(self):
  result=m.process({'path':'/api/blank-workspace','method':'GET','patientId':''},self.repo)['value']
  self.assertEqual(result['boot']['patients'],[]);self.assertEqual(result['boot']['patient_directory'],[])
  self.assertEqual(result['chart']['patient']['id'],'');self.assertEqual(result['chart']['patient']['name'],'')
  self.assertEqual(result['chart']['records'],[]);self.assertIn('biopsychosocial_symptoms',result['boot'])
  self.assertEqual(self.repo.saved,[])
 def test_no_patient_can_never_save_or_read_another_chart(self):
  for request in [{'path':'/api/save','method':'POST','body':{'action':'insurance'}},{'path':'/api/chart?patient='+self.repo.pid,'method':'GET'}]:
   with self.assertRaises(ValueError):m.process(dict(request,patientId=''),self.repo)
  self.assertEqual(self.repo.saved,[])
 def test_bootstrap_has_only_central_patient_no_demo_seed(self):
  b=self.run_action('/api/bootstrap')['value'];self.assertEqual([p['id'] for p in b['patients']],[self.repo.pid]);self.assertEqual(b['practice'],'Indian Creek Psychological Services')
 def test_insurance_and_medications_survive_reopen_in_same_patient(self):
  result=self.run_action('/api/save',{'action':'insurance','patient_id':self.repo.pid,'data':{'carrier':'Fictional Insurance','insured_first_name':'Fictional','insured_last_name':'Subscriber','subscriber_relationship':'Parent'}})
  self.assertEqual(result['revision'],1)
  result=self.run_action('/api/save',{'action':'biopsychosocial_medication','patient_id':self.repo.pid,'data':{'medication':'Fictional medication','status':'Current','dosage':'Fictional dose','frequency':'Fictional frequency','start_date':'','end_date':'','prescribing_physician':'Fictional prescriber','beneficial':''}},1)
  self.assertEqual(result['revision'],2)
  c=self.run_action('/api/chart?patient='+self.repo.pid)['value'];self.assertEqual(len(c['records']),2);self.assertEqual(c['records'][0]['insured_last_name'],'Subscriber')
 def test_biopsychosocial_trauma_history_is_saved_as_a_separate_immutable_central_snapshot(self):
  body={'action':'biopsychosocial_trauma_history','patient_id':self.repo.pid,'data':{
   'selections':{'experiences':['Physical assault or abuse'],'timing':['Childhood']},
   'notes':{'context_notes':'Fictional history reviewed with patient','followup_notes':'Discuss follow-up preferences'}}}
  response=self.run_action('/api/save',body)
  self.assertEqual(response['revision'],1)
  saved=self.run_action('/api/chart?patient='+self.repo.pid)['value']['records']
  self.assertEqual(len(saved),1)
  self.assertEqual(saved[0]['kind'],'biopsychosocial_trauma_history')
  self.assertEqual(saved[0]['schema'],'biopsychosocial-trauma-history/1')
  self.assertEqual(saved[0]['selections']['timing'],['Childhood'])
  self.assertEqual(saved[0]['notes']['context_notes'],'Fictional history reviewed with patient')
  with self.assertRaises(m.Conflict):self.run_action('/api/save',body)
  self.assertEqual(len(self.run_action('/api/chart?patient='+self.repo.pid)['value']['records']),1)
 def test_unsupported_trauma_selection_does_not_create_central_record(self):
  with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'biopsychosocial_trauma_history',
   'patient_id':self.repo.pid,'data':{'selections':{'experiences':['Unrecognized clinical choice']}}})
  self.assertEqual(self.repo.saved,[])
 def test_demographic_views_preserve_canonical_address_and_extended_fields(self):
  self.repo.row['demographics']['address1']='Fictional canonical address'
  self.assertEqual(self.run_action('/api/chart')['value']['patient']['street_address_1'],'Fictional canonical address')
  data={'schema':'demographics/2','first_name':'Fictional','last_name':'Example','dob':'1990-01-02','active':False,'previous_treatment':False,'street_address_1':'Fictional updated address','military_rank':'Fictional rank'}
  self.run_action('/api/save',{'action':'demographics','data':data})
  self.assertEqual(self.repo.row['demographics']['address1'],'Fictional updated address')
  self.assertNotIn('military_rank',self.repo.row['demographics'])
  self.repo.row['demographics']['address1']='Fictional directory edit'
  patient=self.run_action('/api/chart')['value']['patient']
  self.assertEqual(patient['street_address_1'],'Fictional directory edit');self.assertEqual(patient['military_rank'],'Fictional rank');self.assertEqual(patient['status'],'archived')
 def test_patient_binding_rejected(self):
  with self.assertRaises(ValueError):self.run_action('/api/chart?patient='+str(uuid.uuid4()))
  with self.assertRaises(PermissionError):self.run_action('/api/chart',pid=str(uuid.uuid4()))
 def test_stale_save_does_not_append(self):
  b={'action':'insurance','patient_id':self.repo.pid,'data':{'carrier':'Fictional'}};self.run_action('/api/save',b)
  with self.assertRaises(m.Conflict):self.run_action('/api/save',b)
  self.assertEqual(len(self.repo.saved[0]['state']['records']),1)
 def test_invalid_clinical_choice_rejected_before_write(self):
  with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'insurance','data':{'carrier':'Fictional','subscriber_relationship':'invalid'}})
  self.assertEqual(self.repo.saved,[])
 def test_postgrest_conflict_remains_an_actionable_conflict(self):
  repo=object.__new__(m.Repository);repo.base='https://fictional.invalid';repo.headers={}
  for code in ('40001','PT409'):
   error=HTTPError(repo.base,409,'Conflict',{},io.BytesIO(json.dumps({'code':code,'message':'Reopen the chart'}).encode()))
   with patch.object(m,'urlopen',side_effect=error):
    with self.assertRaisesRegex(m.Conflict,'Reopen the chart'):repo.call('/rest/v1/rpc/save_emr_workspace',{})
 def test_schedule_and_shared_group_writes_disabled(self):
  with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'appointment','data':{}})
  self.assertEqual(self.run_action('/api/groups')['value']['group']['roster'],[])
class PrognosisTests(unittest.TestCase):
 setUp=WorkflowTests.setUp
 run_action=WorkflowTests.run_action
 def entry(self):return {'schema':'prognosis/2','discharge_percent':80,'projected_sessions':12,'projected_end_date':'2026-12-31','rating':'Satisfactory','rationale':{'type':'doc','content':[{'type':'paragraph','attrs':{'textAlign':'center','indent':1},'content':[{'type':'text','text':'Fictional rationale 🙂','marks':[{'type':'bold'},{'type':'italic'},{'type':'underline'},{'type':'strike'},{'type':'textStyle','attrs':{'fontFamily':'Georgia','fontSize':'14pt'}}]}]}]}}
 def test_prognosis_saves_without_plan_and_preserves_history_and_formatting(self):
  entry=self.entry();saved=self.run_action('/api/save',{'action':'prognosis','data':entry})
  record=saved['value'];self.assertEqual(record['kind'],'prognosis');self.assertNotIn('plan_id',record)
  for key,value in entry.items():self.assertEqual(record[key],value)
  self.assertEqual(record['recorded_by_account_id'],self.repo.user)
  next_entry=dict(entry,rating='Superior');self.run_action('/api/save',{'action':'prognosis','data':next_entry},1)
  records=self.run_action('/api/chart')['value']['records'];self.assertEqual(len(records),2);self.assertEqual(records[0],record);self.assertEqual(records[1]['rating'],'Superior')
  with self.assertRaises(m.Conflict):self.run_action('/api/save',{'action':'prognosis','data':entry},1)
 def test_prognosis_invalid_values_never_write(self):
  for key,values in {'discharge_percent':[0,15,110,True,'80'],'projected_sessions':[0,101,1.5,True],'projected_end_date':['2026-02-30','invalid'],'rating':['Excellent'],'rationale':[{'type':'doc','content':[{'type':'image','attrs':{'src':'javascript:alert(1)'}}]}]}.items():
   for value in values:
    with self.subTest(key=key,value=value):
     with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'prognosis','data':dict(self.entry(),**{key:value})})
  self.assertEqual(self.repo.saved,[])
 def test_prognosis_all_exact_dropdown_choices_and_optional_rationale(self):
  for i,percent in enumerate(range(10,101,10)):
   entry=dict(self.entry(),discharge_percent=percent,projected_sessions=None,projected_end_date='',rating=('Superior','Satisfactory','Fair','Deficient','Failure')[i%5],rationale={'type':'doc','content':[{'type':'paragraph'}]})
   self.run_action('/api/save',{'action':'prognosis','data':entry},i)
  self.assertEqual(len(self.run_action('/api/chart')['value']['records']),10)

class DischargeTests(unittest.TestCase):
 setUp=WorkflowTests.setUp
 run_action=WorkflowTests.run_action
 def entry(self,**patch):
  value={'schema':'discharge/2','criteria':[{'id':'00000000-0000-4000-8000-000000000001','text':'Fictional selected discharge criterion.'}],'criteria_narrative':'Fictional individual discharge criteria','self_care_competency':'Competent','financial_competency':'Competent: Needs Training','follow_up_care':'Outpatient Therapy','referral_to':'Fictional referral agency','placement_recommendation':'Own Family','vocational_plan':'Return to part-time job','actual_end_date':'2026-11-19','aftercare_summary':{'type':'doc','content':[{'type':'paragraph','attrs':{'textAlign':'center'},'content':[{'type':'text','text':'Fictional aftercare only','marks':[{'type':'bold'},{'type':'italic'},{'type':'underline'},{'type':'strike'},{'type':'textStyle','attrs':{'fontFamily':'Georgia','fontSize':'14pt'}}]}]}]},'prognosis_id':None}
  return dict(value,**patch)
 def test_discharge_fields_save_without_legacy_plan_or_signature_and_survive_reopen(self):
  entry=self.entry();saved=self.run_action('/api/save',{'action':'discharge','data':entry})['value'];self.assertEqual(saved['kind'],'discharge')
  for key,value in entry.items():self.assertEqual(saved[key],value)
  self.assertIsNone(saved['prognosis_snapshot']);self.assertEqual(saved['recorded_by_account_id'],self.repo.user)
  again=self.entry(referral_to='Fictional revised referral');self.run_action('/api/save',{'action':'discharge','data':again},1)
  records=self.run_action('/api/chart')['value']['records'];self.assertEqual(len(records),2);self.assertEqual(records[0],saved)
 def test_latest_prognosis_is_bound_and_snapshotted_server_side(self):
  prog={'schema':'prognosis/2','discharge_percent':80,'projected_sessions':12,'projected_end_date':'2026-12-31','rating':'Satisfactory','rationale':{'type':'doc','content':[{'type':'paragraph'}]}}
  first=self.run_action('/api/save',{'action':'prognosis','data':prog})['value'];latest=self.run_action('/api/save',{'action':'prognosis','data':dict(prog,rating='Superior')},1)['value']
  with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'discharge','data':self.entry(prognosis_id=first['id'])},2)
  saved=self.run_action('/api/save',{'action':'discharge','data':self.entry(prognosis_id=latest['id'])},2)['value'];self.assertEqual(saved['prognosis_snapshot'],latest);self.assertEqual(saved['prognosis_hash'],latest['hash'])
  with self.assertRaises(m.Conflict):self.run_action('/api/save',{'action':'discharge','data':self.entry(prognosis_id=latest['id'])},2)
 def test_every_exact_discharge_choice_is_accepted_and_invalid_choices_dates_and_formatting_rejected(self):
  from modules.discharge import CHOICES
  revision=0
  for key,options in CHOICES.items():
   for value in options:self.run_action('/api/save',{'action':'discharge','data':self.entry(**{key:value})},revision);revision+=1
  for patch in [{'self_care_competency':'Unsupported'},{'actual_end_date':'2026-02-30'},{'referral_to':'x'*501},{'criteria_narrative':'x'*20001},{'criteria':[{'id':'invalid','text':'Fictional criterion'}]},{'aftercare_summary':{'type':'doc','content':[{'type':'image','attrs':{'src':'javascript:bad'}}]}}]:
   with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'discharge','data':self.entry(**patch)},revision)
  with self.assertRaises(PermissionError):self.run_action('/api/chart',pid=str(uuid.uuid4()))

if __name__=='__main__':unittest.main()
