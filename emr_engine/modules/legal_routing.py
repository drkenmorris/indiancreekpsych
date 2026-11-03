"""Versioned fictional page-10 questionnaire; not consent or disclosure authority."""
import json,hashlib
from pathlib import Path
RAW=Path(__file__).with_name('legal_routing_definition.json').read_bytes()
DEFINITION=json.loads(RAW)
DEFINITION_HASH=hashlib.sha256(RAW).hexdigest()
def validate(data):
 if data.get('synthetic_confirmed') is not True:raise ValueError('Confirm these are fictional intake answers.')
 if data.get('version')!=DEFINITION['version']:raise ValueError('Unsupported legal questionnaire version.')
 answers=data.get('answers')
 if not isinstance(answers,dict) or set(answers)!={q['id'] for q in DEFINITION['questions']} or any(not isinstance(v,str) or v not in ['Yes','No','Unsure'] for v in answers.values()):raise ValueError('Answer each legal forms question with Yes, No or Unsure.')
 results=[]
 for f in DEFINITION['forms']:
  status='Required practice step';reason='Review before routine therapy; follow up with the office if you request discussion.'
  if f['id']=='privacy_notice':status='Notice for everyone; signature optional';reason='Receive the notice; the office requests acknowledgment and records any refusal.'
  elif f['id']=='attestation':status='Required for online submission';reason='Attest to your answers and intent to submit; does not replace other consents.'
  elif f['id'] in ['telehealth','electronic','representative','release','part2','sud_notes','psychotherapy_notes']:
   choice=answers[f['id']];optional=f['id'] in ['release','psychotherapy_notes'];outside=f['id'] in ['part2','sud_notes']
   if choice=='Unsure':status='Office review needed';reason='This question is unanswered or uncertain; the office should help determine applicability.'
   elif outside:
    status='Not needed based on answers' if choice=='No' else 'Office review needed';reason='No office request for these outside protected records was reported.' if choice=='No' else 'The office must confirm applicable protected records and any separate consent needed.'
   elif choice=='Yes':status='Optional — requested' if optional else 'Necessary for selected service';reason='You requested discussion of a specific optional release. Complete only if you choose to authorize it.' if optional else 'Complete before using the selected service or acting as a representative; office verification may be needed.'
   else:status='Optional — not requested' if optional else 'Not needed based on answers';reason='No optional release was requested; no permission is created.' if optional else 'This service or representative situation was not selected.'
   if f['id']=='representative' and answers['minor']!='No' and choice!='Yes':status='Office review needed';reason='Patient age/minor status needs office review of who may consent. Do not assume a parent or other person has authority.'
  results.append(dict(f,status=status,reason=reason))
 return {'version':DEFINITION['version'],'packet_version':DEFINITION['packet_version'],'definition_hash':DEFINITION_HASH,'definition':DEFINITION,'answers':answers,'results':results,'source':'Fictional intake page 10','synthetic':True,'verification_status':'Questionnaire guidance only; no signatures or disclosure authority inferred'}
