"""Synthetic patient registry and versioned demographic validation."""
import json
import base64
import binascii
import hashlib
import re
import uuid
from datetime import date

CHOICES = {
 'marital_status':['Single','Married','Divorced','Widowed'],
 'race':['Caucasian','African American or Black','Asian','Native American','Pacific Islander','Mixed Race','Other'],
 'birth_gender':['Male','Female'],
 'gender_preference':['Cisgender','Transgender','Non Binary','Genderqueer','Agender','Other'],
 'treatment_setting':['Outpatient','Intensive Outpatient Patient','Partial Hospitalization','In-Patient Residential','In-Patient Hospitalization'],
 'living_status':['Independent Living','Assisted Living','Transitional Living','Senior Care Facility','Group Home','Other'],
 'department':['Mental Health Treatment','Dual Diagnosis Mental Health','Trauma Care','Geriatric Treatment','Eating Disorders Treatment','Equine Treatment','Other']}
TEXT_FIELDS = ['middle_name','ssn','street_address_1','street_address_2','city','state_province','postal_code','county','country','home_phone','cell_phone','email','military_rank','employer','company_phone','primary_care_physician','primary_care_phone','psychiatrist','psychiatrist_phone','referred_by']
DATE_FIELDS = ['treatment_start','treatment_discharge','chart_reviewed']

def string(data,key,required=False,maximum=200):
 value=data.get(key,'')
 if not isinstance(value,str) or len(value)>maximum or (required and not value.strip()):
  raise ValueError(f'{key.replace("_"," ").title()} must contain {"1–" if required else "0–"}{maximum} characters.')
 return value.strip()

def calendar(value,label,required=False):
 if value=='' and not required:return ''
 if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',value):raise ValueError(f'{label} must be a calendar date.')
 try:date.fromisoformat(value)
 except ValueError:raise ValueError(f'{label} must be a valid calendar date.') from None
 return value

def identity(data):
 first=string(data,'first_name',True,80);last=string(data,'last_name',True,80)
 # Exactly two initial letters followed by eight date digits. Names may be Unicode.
 if not first[0].isalpha() or not last[0].isalpha() or len(first[0].upper())!=1 or len(last[0].upper())!=1:
  raise ValueError('First and last names must start with a single letter for the patient ID.')
 dob=calendar(data.get('dob'),'Birthdate',True)
 if date.fromisoformat(dob)>date.today():raise ValueError('Birthdate cannot be in the future.')
 assigned_id=first[0].upper()+last[0].upper()+dob[5:7]+dob[8:10]+dob[:4]
 return {'first_name':first,'last_name':last,'dob':dob,'assigned_id':assigned_id,'name':first+' '+last}

def demographic(data,records):
 result=identity(data)
 result.update({k:string(data,k,maximum=11 if k=='ssn' else 200) for k in TEXT_FIELDS})
 number_type=data.get('identity_number_type','Social Security number')
 if number_type not in ['Social Security number',"Driver's license number"]:raise ValueError('Choose Social Security number or driver’s license number.')
 number=string(data,'identity_number',maximum=50) if 'identity_number' in data else result['ssn']
 number_source=data.get('identity_number_source','Not recorded')
 if number_source not in ['Not recorded','Patient-reported / from memory','Viewed document','Other']:raise ValueError('Choose a supported number source.')
 result.update(identity_number_type=number_type,identity_number=number,identity_number_source=number_source,ssn=number if number_type=='Social Security number' else '',identity_document_id=string(data,'identity_document_id',maximum=80))
 if result['identity_document_id']:
  doc=next((r for r in records if r['kind']=='identity_document' and r['id']==result['identity_document_id']),None)
  if not doc:raise ValueError('Select an identification photo saved in this patient’s chart.')
 for key,values in CHOICES.items():
  value=data.get(key,'')
  if value not in ['',*values]:raise ValueError(f'Choose a supported {key.replace("_"," ")}.')
  result[key]=value
 for key in DATE_FIELDS:result[key]=calendar(data.get(key,''),key.replace('_',' ').title())
 if result['treatment_start'] and result['treatment_discharge'] and result['treatment_discharge']<result['treatment_start']:
  raise ValueError('Treatment discharge must be on or after the treatment start.')
 for key in ['active','previous_treatment']:
  if type(data.get(key)) is not bool:raise ValueError(f'{key} must be checked or unchecked.')
  result[key]=data[key]
 episodes=data.get('episodes',[])
 if not isinstance(episodes,list) or len(episodes)>100:raise ValueError('Use at most 100 treatment episodes.')
 result['episodes']=[]
 for ep in episodes:
  if not isinstance(ep,dict):raise ValueError('Invalid treatment episode.')
  start=calendar(ep.get('start'),'Episode start',True);end=calendar(ep.get('end',''),'Episode end')
  if end and end<start:raise ValueError('Episode end must be on or after its start.')
  entry={'start':start,'end':end,'primary_problem':string(ep,'primary_problem',maximum=1000),'assessment_id':'','assessment_hash':'','problem_id':''}
  if ep.get('assessment_id'):
   assessment=next((r for r in records if r['kind']=='assessment' and r['id']==ep['assessment_id']),None)
   problem=next((p for p in assessment.get('problems',[]) if p.get('role')=='primary' and p['id']==ep.get('problem_id')),None) if assessment else None
   if not problem:raise ValueError('Episode source must be a saved primary assessment problem in this chart.')
   if entry['primary_problem']!=problem['statement']:raise ValueError('Assessment-sourced episode wording must match its saved primary problem. Choose Manual to customize.')
   entry.update(assessment_id=assessment['id'],assessment_hash=assessment['hash'],problem_id=problem['id'])
  result['episodes'].append(entry)
 result.update(schema='demographics/2',synthetic=True)
 return result

class Registry:
 def setup_patients(self,db,seeds):
  db.execute('CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, body TEXT NOT NULL)')
  # Seed once; deleted charts remain registered and are never silently recreated.
  for seed in seeds:
   first,last=seed['name'].split(' ',1)
   body=dict(seed,**identity({'first_name':first,'last_name':last,'dob':seed['dob']}),middle_name='',status='active',synthetic=True)
   db.execute('INSERT OR IGNORE INTO patients(id,body) VALUES(?,?)',(seed['id'],json.dumps(body)))
 def list_patients(self,include_deleted=False):
  with self.connect() as db:rows=[dict(json.loads(r['body']),id=r['id']) for r in db.execute('SELECT * FROM patients')]
  return sorted((p for p in rows if include_deleted or p['status']!='deleted'),key=lambda p:(p['last_name'].casefold(),p['first_name'].casefold(),p.get('middle_name','').casefold(),p['id']))
 def patient(self,patient_id):
  p=next((p for p in self.list_patients() if p['id']==patient_id),None)
  if not p:raise ValueError('Unknown or deleted synthetic chart.')
  return p
 def patient_action(self,action,data,patient_id=None):
  if not isinstance(data,dict):raise ValueError('Patient form must be an object.')
  with self.connect() as db:
   db.execute('BEGIN IMMEDIATE')
   if action=='create':
    if db.execute('SELECT count(*) FROM patients').fetchone()[0]>=200:raise ValueError('Demo limit: 200 patients.')
    p=dict(identity(data),middle_name=string(data,'middle_name'),status='active',pronouns='',concern='Not yet documented',medications='Not yet documented',allergies='Not yet documented',synthetic=True)
    patient_id=str(uuid.uuid4())
    db.execute('INSERT INTO patients(id,body) VALUES(?,?)',(patient_id,json.dumps(p)))
   else:
    row=db.execute('SELECT body FROM patients WHERE id=?',(patient_id,)).fetchone()
    if not row:raise ValueError('Unknown synthetic chart.')
    p=json.loads(row['body'])
    status={'archive':'archived','activate':'active','delete':'deleted','restore':'active'}.get(action)
    if not status:raise ValueError('Unknown patient action.')
    if p['status']=='deleted' and action!='restore':raise ValueError('Restore the deleted patient first.')
    p['status']=status
    db.execute('UPDATE patients SET body=? WHERE id=?',(json.dumps(p),patient_id))
  return dict(p,id=patient_id)
 def update_identity(self,db,patient_id,body):
  current=json.loads(db.execute('SELECT body FROM patients WHERE id=?',(patient_id,)).fetchone()['body'])
  current.update({key:body[key] for key in ['first_name','last_name','middle_name','name','dob','assigned_id']})
  current['status']='active' if body['active'] else 'archived'
  db.execute('UPDATE patients SET body=? WHERE id=?',(json.dumps(current),patient_id))


def identity_document(data):
 if data.get('synthetic_confirmed') is not True:raise ValueError('Confirm that this upload is a fictional sample, not a real identity document.')
 document_type=data.get('document_type')
 if document_type not in ["Driver's license",'Social Security card']:raise ValueError('Choose the photo document type.')
 url=data.get('data_url')
 prefix='data:image/jpeg;base64,'
 if not isinstance(url,str) or not url.startswith(prefix) or len(url)>220000:raise ValueError('Use a JPEG photo normalized by the demo, no larger than 150 KB.')
 try:raw=base64.b64decode(url[len(prefix):],validate=True)
 except (binascii.Error,ValueError):raise ValueError('Invalid photo encoding.') from None
 if len(raw)>153600 or not raw.startswith(b'\xff\xd8\xff') or not raw.endswith(b'\xff\xd9'):raise ValueError('Invalid or oversized JPEG photo.')
 return {'document_type':document_type,'data_url':url,'content_sha256':hashlib.sha256(raw).hexdigest(),'byte_size':len(raw),'media_type':'image/jpeg','synthetic':True,'author':'Demo Clinician','original_retained':False,'processing':'Resized JPEG preview; original file and metadata are not retained.'}
