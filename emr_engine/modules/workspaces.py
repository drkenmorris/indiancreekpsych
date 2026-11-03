"""Synthetic module notes and chart-bound demo appointments; no clinic transport."""
from datetime import date,datetime
from zoneinfo import ZoneInfo
from modules.patients import calendar,string

SECTIONS={'assigned_provider','general_notes','strengths','mental_status','recovery_criteria','session_details','objective_rating','psychotherapy_notes','session_custom_fields','scheduled_review'}
def section(data):
 key=data.get('section')
 if key not in SECTIONS:raise ValueError('Choose a supported patient workspace section.')
 result={'section':key,'text':string(data,'text',maximum=8000),'review_date':calendar(data.get('review_date',''),'Review date'),'synthetic':True}
 if key=='assigned_provider':result.update(provider_id=string(data,'provider_id',maximum=80),provider_name=string(data,'provider_name',maximum=200))
 fields=data.get('fields',{})
 if not isinstance(fields,dict) or len(fields)>30:raise ValueError('Use at most 30 section fields.')
 import re
 if any(not isinstance(k,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}',k) or not isinstance(v,str) or len(v)>8000 for k,v in fields.items()):raise ValueError('Invalid section fields.')
 if sum(len(v) for v in fields.values())>24000:raise ValueError('Section fields are too long.')
 result['fields']=fields
 return result

def document(data):
 import base64,hashlib
 if data.get('synthetic_confirmed') is not True:raise ValueError('Confirm this is a fictional sample document.')
 url=data.get('data_url','')
 allowed={'data:application/pdf;base64,':('application/pdf',b'%PDF-'),'data:image/jpeg;base64,':('image/jpeg',b'\xff\xd8\xff')}
 prefix=next((p for p in allowed if isinstance(url,str) and url.startswith(p)),None)
 if not prefix or len(url)>205000:raise ValueError('Use a PDF or normalized JPEG up to 150 KB.')
 try:raw=base64.b64decode(url[len(prefix):],validate=True)
 except Exception:raise ValueError('Invalid document encoding.')
 mime,magic=allowed[prefix]
 if not raw.startswith(magic) or len(raw)>153600:raise ValueError('Invalid document format or size.')
 category=data.get('category')
 if category not in ['General Scan','Legal Notice','Miscellaneous']:raise ValueError('Choose a document category.')
 result={'title':string(data,'title',maximum=150) or 'Sample document','category':category,'mime_type':mime,'byte_size':len(raw),'data_url':url,'content_sha256':hashlib.sha256(raw).hexdigest(),'synthetic':True}
 if data.get('notice_form_id'):
  import json
  from pathlib import Path
  packet=json.loads(Path(__file__).with_name('legal_forms.json').read_text())
  revision=string(data,'source_revision',maximum=80)
  definitions=packet['forms'] if revision==packet['version'] else packet['archived_forms'].get(revision)
  if definitions is None:raise ValueError('Choose a recognized document revision; historical copies retain their original page numbers.')
  form=next((f for f in definitions if f['id']==data['notice_form_id']),None)
  if category!='Legal Notice' or mime!='application/pdf' or not form:raise ValueError('Choose a supported intake legal form and a PDF copy.')
  status=data.get('copy_status')
  if status not in ['Signed copy supplied','Decision / acknowledgment record','Draft / unsigned copy']:raise ValueError('Choose the copy record status.')
  signer=string(data,'signer_name',maximum=200)
  signed=calendar(data.get('signature_date',''),'Signature date',status=='Signed copy supplied')
  if signed and signed>today():raise ValueError('Signature date cannot be in the future.')
  if status=='Signed copy supplied' and not signer:raise ValueError('Enter the name shown on the signature.')
  version=string(data,'source_revision',maximum=80)
  filename=string(data,'filename',maximum=180)
  if any(ord(c)<32 or c in '/\\' for c in filename):raise ValueError('Use a filename without path or control characters.')
  result.update(notice_form_id=form['id'],intake_page=form['page'],form_title=form['section'],form_category=form['category'],copy_status=status,signer_name=signer,signature_date=signed,source_revision=version,filename=filename,review_notes=string(data,'review_notes',maximum=4000),verification_status='Unverified copy; no disclosure authority inferred')
 return result

def local_now():return datetime.now(ZoneInfo('America/Chicago'))
def today():return local_now().date().isoformat()
def appointments(db):
 import json
 rows=[dict(json.loads(r['body']),id=r['id'],patient_id=r['patient_id']) for r in db.execute("SELECT * FROM records WHERE kind IN ('appointment','appointment_status') ORDER BY seq")]
 items={r['id']:dict(r,status='Scheduled') for r in rows if r.get('date') and 'appointment_id' not in r}
 for r in rows:
  target=items.get(r.get('appointment_id'))
  if target and target['patient_id']==r['patient_id']:target['status']=r['status']
 return list(items.values())
def save_appointment(db,patient_id,data):
 if data.get('patient_id',patient_id)!=patient_id:raise ValueError('Book only for the open patient chart.')
 day=calendar(data.get('date'),'Appointment date',True);start=data.get('start_time')
 if day<today() or (day==today() and isinstance(start,str) and start<=local_now().strftime('%H:%M')):raise ValueError('Choose a future demo time for a new appointment.')
 if date.fromisoformat(day).weekday()>4 or start not in [f'{h:02}:00' for h in range(8,17)]:raise ValueError('Choose an available weekday demo slot from 08:00 through 16:00.')
 if any(a['date']==day and a['start_time']==start and a['status']!='Cancelled' for a in appointments(db)):raise ValueError('That demo time is already occupied. Refresh the selected day.')
 return {'date':day,'start_time':start,'end_time':start[:2]+':50','timezone':'America/Chicago','duration_minutes':50,'reason':string(data,'reason',maximum=1000),'synthetic':True,'source':'demo-scheduler/1'}
def status(patient_id,data,records):
 appt=next((r for r in records if r['id']==data.get('appointment_id') and r['kind']=='appointment'),None)
 if not appt:raise ValueError('Choose an appointment in this patient chart.')
 value=data.get('status')
 if value not in ['Attended','No show','Cancelled']:raise ValueError('Choose an attendance status.')
 if value!='Cancelled' and appt['date']>today():raise ValueError('Attendance can be recorded on or after the appointment date.')
 return {'appointment_id':appt['id'],'status':value,'synthetic':True}
def day_view(db,patient_id,day):
 calendar(day,'Selected date',True)
 rows=sorted((a for a in appointments(db) if a['date']==day),key=lambda a:a['start_time'])
 events=[{'id':a['id'] if a['patient_id']==patient_id else '', 'date':day,'start_time':a['start_time'],'end_time':a['end_time'],'status':a['status'],'current_patient':a['patient_id']==patient_id,'reason':a.get('reason','') if a['patient_id']==patient_id else ''} for a in rows]
 occupied={a['start_time'] for a in rows if a['status']!='Cancelled'}
 slots=[f'{h:02}:00' for h in range(8,17) if f'{h:02}:00' not in occupied and (day>today() or f'{h:02}:00'>local_now().strftime('%H:%M'))] if day>=today() and date.fromisoformat(day).weekday()<5 else []
 return {'date':day,'timezone':'America/Chicago','events':events,'available_slots':slots,'live_connected':False,'source':'demo-scheduler/1','today':today()}
