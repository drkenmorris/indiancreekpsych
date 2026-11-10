import importlib.util,unittest,json,uuid
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
 def test_schedule_and_shared_group_writes_disabled(self):
  with self.assertRaises(ValueError):self.run_action('/api/save',{'action':'appointment','data':{}})
  self.assertEqual(self.run_action('/api/groups')['value']['group']['roster'],[])
if __name__=='__main__':unittest.main()
