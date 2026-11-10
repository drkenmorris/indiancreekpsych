"""Clinic-authenticated adapter for the original EMR validation engine.
No browser state or legacy provider credentials are accepted. Supabase RLS is
applied to every query using the verified caller's access token.
"""
import os,json,base64,tempfile,sys,uuid
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit,parse_qs
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'emr_engine'))
from store import Store
class Conflict(Exception):pass
class Repository:
 def __init__(self,token):
  self.base=os.environ.get('NEXT_PUBLIC_SUPABASE_URL','https://ufyopuunkprfpcprfngk.supabase.co').rstrip('/')
  self.headers={'apikey':os.environ.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY','sb_publishable_maYvS_uR0p8kd18I7h_PBg_PkeRBW4t'),'Authorization':'Bearer '+token,'Content-Type':'application/json'}
  user=self.call('/auth/v1/user')
  claims=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'==='))
  if not user.get('email_confirmed_at') or claims.get('aal')!='aal2':raise PermissionError()
  self.user=user['id']
  profile=self.rest('profiles?select=account_type&id=eq.'+self.user)
  if not profile or profile[0]['account_type']!='admin':raise PermissionError()
 def call(self,path,body=None):
  req=Request(self.base+path,headers=self.headers,data=None if body is None else json.dumps(body).encode())
  try:
   with urlopen(req,timeout=25) as response:return json.loads(response.read())
  except HTTPError as e:
   detail=json.loads(e.read())
   if detail.get('code')=='40001':raise Conflict(detail.get('message','Revision conflict')) from None
   raise PermissionError('Repository access was not confirmed.') from None
 def rest(self,path,body=None):return self.call('/rest/v1/'+path,body)
def central_patient(row,records=()):
 prior=next((json.loads(r['body']) for r in reversed(records) if r['kind']=='demographics' and json.loads(r['body']).get('schema')=='demographics/2'),{})
 d=dict(prior);d.update(row['demographics'])
 for source,target in [('address1','street_address_1'),('address2','street_address_2'),('state','state_province')]:
  if source in row['demographics']:d[target]=row['demographics'][source]
 profile=row.get('profiles') or {};full=profile.get('full_name','') if isinstance(profile,dict) else ''
 first=d.get('first_name') or full.split(' ')[0] or 'Patient';last=d.get('last_name') or (' '.join(full.split(' ')[1:])) or 'Demographics pending';dob=d.get('dob','')
 return dict(d,id=row['id'],first_name=first,last_name=last,name=first+' '+last,dob=dob,assigned_id=first[0].upper()+last[0].upper()+dob[5:7]+dob[8:10]+dob[:4] if dob else 'DOB pending',status='active' if d.get('active',True) else 'archived',concern=d.get('concern','Not yet documented'),medications='See medication history',allergies='See medication allergy record',synthetic=False)
def process(payload,repo):
 pid=payload.get('patientId')
 if pid in (None,''):
  if payload.get('method','GET')!='GET' or payload.get('path')!='/api/blank-workspace' or payload.get('body'):
   raise ValueError('Select a patient before saving clinical records.')
  with tempfile.TemporaryDirectory(prefix='empty-emr-') as temp:
   store=Store(Path(temp)/'workspace.sqlite3')
   metadata=dict(store.bootstrap(),patients=[],patient_directory=[],practice='Indian Creek Psychological Services',csrf='clinic-session',mode='No patient selected')
  patient={key:'' for key in ('id','first_name','last_name','middle_name','name','dob','assigned_id','concern','medications','allergies')}
  patient.update(status='active',synthetic=False)
  return {'value':{'boot':metadata,'chart':{'patient':patient,'records':[]},'groups':{'group':{'id':'','name':'','roster':[]},'sessions':[]}},'revision':0}
 uuid.UUID(pid)
 rows=repo.rest('clinical_patients?select=id,demographics,revision,profiles!clinical_patients_account_id_fkey(full_name)&id=eq.'+pid)
 if not rows:raise PermissionError('Patient record unavailable.')
 person=rows[0]
 saved=repo.rest('emr_workspaces?select=revision,state&patient_id=eq.'+pid+'&owner_id=eq.'+repo.user)
 revision=saved[0]['revision'] if saved else 0;state=saved[0]['state'] if saved else {'records':[]}
 patient=central_patient(person,state['records'])
 path=urlsplit(payload.get('path',''));query=parse_qs(path.query);method=payload.get('method','GET');body=payload.get('body') or {}
 if method not in ['GET','POST']:raise ValueError('Unsupported method.')
 if query.get('patient',[pid])[0]!=pid or body.get('patient_id',pid)!=pid:raise ValueError('Patient binding mismatch.')
 if method=='POST' and payload.get('expectedRevision')!=revision:raise Conflict('Another session saved this patient. Reopen the chart before saving.')
 with tempfile.TemporaryDirectory(prefix='central-emr-') as temp:
  store=Store(Path(temp)/'workspace.sqlite3');store.actor_id=repo.user
  with store.connect() as db:
   db.execute('DELETE FROM patients');db.execute('INSERT INTO patients(id,body) VALUES(?,?)',(pid,json.dumps(patient)))
   for row in state['records']:
    if row['patient_id']!=pid:raise ValueError('Saved patient binding mismatch.')
    columns=['seq','id','patient_id','kind','created','body','hash'];db.execute('INSERT INTO records('+','.join(columns)+') VALUES('+','.join('?' for _ in columns)+')',[row[c] for c in columns])
  if method=='GET' and path.path=='/api/bootstrap':value=dict(store.bootstrap(),practice='Indian Creek Psychological Services',csrf='clinic-session',mode='Central patient record',patients=[patient],patient_directory=[patient])
  elif method=='GET' and path.path=='/api/chart':value=store.chart(pid)
  elif method=='GET' and path.path=='/api/groups':value={'group':{'id':'','name':'Care-team permissions pending','roster':[]},'sessions':[]}
  elif method=='GET' and path.path=='/api/claim':value=store.claim_preview(pid,query.get('encounter',[''])[0],query.get('adapter',[''])[0])
  elif method=='POST' and path.path=='/api/save':
   if body.get('action') in ['appointment','appointment_status','group_note']:raise ValueError('Use the clinic scheduler; shared group permissions are pending.')
   value=store.save(pid,body.get('action'),body.get('data'))
   with store.connect() as db:updated={'records':[dict(r) for r in db.execute('SELECT * FROM records ORDER BY seq')]}
   demographics=None
   if body.get('action')=='demographics':
    keys=['first_name','middle_name','last_name','dob','city','postal_code','county','country','home_phone','cell_phone','email']
    demographics={k:value.get(k,'') for k in keys}
    for source,target in [('street_address_1','address1'),('street_address_2','address2'),('state_province','state')]:demographics[target]=value.get(source,'')
   revision=repo.rest('rpc/save_emr_workspace',{'p_patient':pid,'p_expected':revision,'p_state':updated,'p_demographics':demographics,'p_patient_revision':person['revision'] if demographics is not None else None})
  else:raise ValueError('Choose a patient through the central directory. This workflow action is unavailable.')
 return {'value':value,'revision':revision}
class handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  status=200
  try:
   token=self.headers.get('Authorization','').removeprefix('Bearer ')
   if not token or self.headers.get('Content-Type')!='application/json':raise PermissionError()
   size=int(self.headers.get('Content-Length',0))
   if not 0<size<=2000000:raise ValueError('Request is too large.')
   payload=json.loads(self.rfile.read(size));result=process(payload,Repository(token))
  except Conflict as e:result,status={'error':str(e)},409
  except PermissionError:result,status={'error':'Verified administrator sign-in and MFA required.'},403
  except (ValueError,KeyError,TypeError) as e:result,status={'error':str(e) if isinstance(e,ValueError) else 'Invalid workflow request.'},400
  except Exception:result,status={'error':'Central workflow repository unavailable.'},503
  raw=json.dumps(result).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','private, no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(raw)
