"""Clinician-entered discharge details, separate from legacy preview discharge records."""
import re
from datetime import date
from modules.prognosis import rich_document
COMPETENCY=('Competent','Competent: Needs Training','Incompetent: Can Benefit from Training','Incompetent: Cannot Benefit from Training')
CHOICES={
 'self_care_competency':COMPETENCY,'financial_competency':COMPETENCY,
 'follow_up_care':('Community Mental Health Center','Court Services','Social Service Agency','Substance Abuse Rehabilitation','Outpatient Therapy'),
 'placement_recommendation':('Self Care','Own Family','Nursing Home','Community Residential Rehabilitation Services','Domiciliary/Boarding Home','Foster Care','Group Home'),
 'vocational_plan':('Seek full-time job','Seek part-time job','Return to full-time job','Return to part-time job','Sheltered Workshop','Vocational Education'),
}
UUID=re.compile(r'[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}')
def validate(data,records):
 fields={'schema','criteria','criteria_narrative','referral_to','actual_end_date','aftercare_summary','prognosis_id',*CHOICES}
 if set(data)!=fields or data.get('schema')!='discharge/2':raise ValueError('Invalid discharge fields.')
 for key,options in CHOICES.items():
  if data[key] not in ('',*options):raise ValueError('Choose a supported discharge option.')
 for key,limit in [('criteria_narrative',20000),('referral_to',500)]:
  if not isinstance(data[key],str) or len(data[key])>limit:raise ValueError('Discharge narrative or referral exceeds its text limit.')
 end=data['actual_end_date']
 if not isinstance(end,str) or end and (not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}',end) or date.fromisoformat(end).isoformat()!=end):raise ValueError('Choose a valid actual treatment end date.')
 criteria=data['criteria']
 if not isinstance(criteria,list) or len(criteria)>250:raise ValueError('Invalid selected discharge criteria.')
 seen=set()
 for item in criteria:
  if not isinstance(item,dict) or set(item)!={'id','text'} or not isinstance(item['id'],str) or not UUID.fullmatch(item['id']) or item['id'] in seen or not isinstance(item['text'],str) or not 2<=len(item['text'].strip())<=500 or len(item['text'])>500:raise ValueError('Invalid or duplicate selected discharge criterion.')
  seen.add(item['id'])
 try:meaningful=rich_document(data['aftercare_summary'])
 except ValueError as error:raise ValueError('Aftercare Plan/Discharge Summary: '+str(error)) from error
 if not (criteria or data['criteria_narrative'].strip() or data['referral_to'].strip() or end or any(data[k] for k in CHOICES) or meaningful):raise ValueError('Enter at least one discharge field before saving.')
 latest=next((r for r in reversed(records) if r['kind']=='prognosis'),None)
 if data['prognosis_id']!=(latest['id'] if latest else None):raise ValueError('The latest prognosis changed. Refresh saved records before saving discharge details.')
 body=dict(data)
 body.update(prognosis_snapshot=latest,prognosis_hash=latest.get('hash') if latest else None)
 return body
