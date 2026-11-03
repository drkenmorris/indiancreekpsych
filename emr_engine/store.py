"""Single-practice synthetic workflow store. All saved clinical records are append-only."""
import json
from pathlib import Path
import sqlite3
import uuid
from datetime import datetime, timezone, date
from modules.questionnaires import DEFINITION, digest, score
from modules.billing import claim, preview, ADAPTERS
from modules.clinical import ASSESSMENT_FIELDS, PLAN_FIELDS
from modules import trauma_history, legal_routing, groups, patients, workspaces, biopsychosocial, family_origin, medical_substance, developmental_personal, bps_consolidation
from modules.library import LIBRARY, LIBRARY_HASH
from modules.planning import assessment_problems, validate_tree, objective_links

PATIENTS = []



def text(data, key, maximum=8000):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f'{key.replace("_", " ").title()} is required (maximum {maximum} characters).')
    return value.strip()


class Store(patients.Registry):
    def __init__(self, path):
        self.path = str(path)
        with self.connect() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS records (
              seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
              patient_id TEXT NOT NULL,
              kind TEXT NOT NULL, created TEXT NOT NULL, body TEXT NOT NULL, hash TEXT NOT NULL);
            CREATE TRIGGER IF NOT EXISTS no_update BEFORE UPDATE ON records
              BEGIN SELECT RAISE(ABORT, 'Saved records are immutable'); END;
            CREATE TRIGGER IF NOT EXISTS no_delete BEFORE DELETE ON records
              BEGIN SELECT RAISE(ABORT, 'Saved records are immutable'); END;
            ''')

            # Older databases restricted records to the three seeded chart keys.
            definition=db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='records'").fetchone()[0]
            if 'CHECK(patient_id IN' in definition:
                db.executescript("""DROP TRIGGER IF EXISTS no_update; DROP TRIGGER IF EXISTS no_delete;
                ALTER TABLE records RENAME TO legacy_records;
                CREATE TABLE records(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,
                  patient_id TEXT NOT NULL,kind TEXT NOT NULL,created TEXT NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL);
                INSERT INTO records SELECT * FROM legacy_records;
                DROP TABLE legacy_records;
                CREATE TRIGGER no_update BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'Saved records are immutable'); END;
                CREATE TRIGGER no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'Saved records are immutable'); END;""")
            self.setup_patients(db,PATIENTS)
            groups.setup(db)

    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        return db

    def records(self, db, patient_id):
        return [dict(json.loads(r['body']), id=r['id'], kind=r['kind'], created=r['created'], hash=r['hash'])
                for r in db.execute('SELECT * FROM records WHERE patient_id=? ORDER BY seq', (patient_id,))]

    def chart(self, patient_id):
        patient = self.patient(patient_id)
        with self.connect() as db:
            records = self.records(db, patient_id)
        return {'patient': patient, 'records': records}

    def bootstrap(self):
        return {'practice': 'Indian Creek · Demo practice', 'patients': self.list_patients(), 'patient_directory': self.list_patients(True), 'demographic_choices': patients.CHOICES,
                'trauma_history':trauma_history.DEFINITION, 'legal_routing_help':json.loads((Path(__file__).parent/'modules/legal_routing_help.json').read_text()), 'legal_routing':legal_routing.DEFINITION, 'legal_forms':json.loads((Path(__file__).parent/'modules/legal_forms.json').read_text())['forms'], 'bps_consolidation':{'version':'1','aliases':bps_consolidation.ALIASES,'symptom_aliases':bps_consolidation.SYMPTOM_ALIASES}, 'developmental_personal':developmental_personal.DEFINITION, 'medical_substance':medical_substance.DEFINITION, 'family_origin':family_origin.DEFINITION, 'biopsychosocial_symptoms':biopsychosocial.DEFINITION, 'instrument': DEFINITION, 'adapters': ADAPTERS, 'assessment_fields': ASSESSMENT_FIELDS, 'library': LIBRARY, 'library_hash': LIBRARY_HASH,
                'mode': 'Single practice, fixed demo identity; no authentication or real patient use.'}

    def save(self, patient_id, action, data):
        self.patient(patient_id)
        if not isinstance(data, dict):
            raise ValueError('An object is required.')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            records = self.records(db, patient_id)
            def linked(record_id, kind):
                for r in records:
                    if r['id'] == record_id and r['kind'] == kind:
                        return r
                raise ValueError(f'Select a saved {kind} in this chart.')
            if action == 'response':
                if data.get('reviewed') is not True:
                    raise ValueError('Review the demonstration answers and score before saving.')
                body = score(data.get('answers'))
            elif action == 'identity_document':
                body=patients.identity_document(data)
                prior=next((r for r in records if r['kind']=='identity_document' and r['content_sha256']==body['content_sha256'] and r['document_type']==body['document_type']),None)
                if prior:return prior
                used=sum(r.get('byte_size',0) for r in records if r['kind'] in ['identity_document','document'])
                if used+body['byte_size']>614400:raise ValueError('This demo chart’s photo storage limit is reached. No photo was saved.')
            elif action == 'demographics':
                if data.get('schema')=='demographics/2':
                    body=patients.demographic(data,records)
                    self.update_identity(db,patient_id,body)
                else:
                    body = {key: text(data, key) for key in ['preferred_name', 'pronouns', 'contact_preference', 'background']}
                    body['synthetic'] = True
            elif action == 'legal_routing':
                body=legal_routing.validate(data)
            elif action == 'document':
                body=workspaces.document(data)
                prior=next((r for r in records if r['kind']=='document' and r['content_sha256']==body['content_sha256'] and r['category']==body['category'] and r.get('notice_form_id','')==body.get('notice_form_id','')),None)
                if prior:
                    if any(prior.get(k,'')!=body.get(k,'') for k in ['copy_status','signer_name','signature_date','source_revision','review_notes']):raise ValueError('This PDF is already recorded with different metadata. The saved copy has been retained.')
                    return prior
                used=sum(r.get('byte_size',0) for r in records if r['kind'] in ['document','identity_document'])
                if used+body['byte_size']>614400:raise ValueError('This demo chart’s document storage limit is reached.')
            elif action == 'workspace_section':
                body=workspaces.section(data)
            elif action == 'appointment':
                body=workspaces.save_appointment(db,patient_id,data)
            elif action == 'appointment_status':
                body=workspaces.status(patient_id,data,records)
            elif action == 'biopsychosocial_trauma_history':
                body=trauma_history.validate(data)
            elif action == 'biopsychosocial_developmental_personal':
                body=developmental_personal.validate(data)
            elif action == 'biopsychosocial_medical_substance':
                body=medical_substance.validate(data)
            elif action == 'biopsychosocial_family_origin':
                body=family_origin.validate(data)
            elif action == 'biopsychosocial_medication':
                body=biopsychosocial.medication(data,records)
            elif action == 'medication_allergies':
                body=biopsychosocial.medication_allergies(data)
            elif action == 'biopsychosocial_treatment_history':
                body=biopsychosocial.treatment_history(data,records)
            elif action == 'biopsychosocial_symptoms':
                body=biopsychosocial.checklist(data)
            elif action in ['insurance','insurance_archive']:
                fields = ['carrier','street_address_1','street_address_2','city','state','zip','group_number','payer_id','provider_phone','patient_first_name','patient_last_name','patient_dob','subscriber_relationship','insured_first_name','insured_last_name','insured_dob','plan_name','member_id','coverage_notes']
                body = {}
                for key in fields:
                    value = data.get(key, '')
                    limit = 8000 if key == 'coverage_notes' else 200
                    if not isinstance(value,str) or len(value)>limit:
                        raise ValueError(f'Invalid insurance {key.replace("_"," ")}.')
                    body[key] = value.strip()
                body['carrier'] = text(data,'carrier',200)
                if body['subscriber_relationship']=='Self — synthetic':body['subscriber_relationship']='Self'
                if body['subscriber_relationship'] not in ['', 'Self','Spouse','Parent','Guardian','Other']:
                    raise ValueError('Choose a supported Patient Insurance Status.')
                for key in ['patient_dob','insured_dob']:
                    if body[key]:
                        try:
                            parsed=date.fromisoformat(body[key])
                            if parsed.isoformat()!=body[key] or parsed>date.today():raise ValueError()
                        except ValueError:raise ValueError('Enter a valid non-future insurance birth date.') from None
                body.update(synthetic=True, verification_status='Not verified — synthetic example')
            elif action == 'insurance_authorization':
                flag=data.get('no_sessions_authorized',False)
                if flag not in [True,False,'on']:raise ValueError('Invalid session authorization checkbox.')
                no_sessions=flag is True or flag=='on'
                body={'no_sessions_authorized':no_sessions}
                for key in ['total_sessions_authorized','sessions_used_to_date']:
                    raw=data.get(key,'')
                    if raw is None or raw=='':value=None
                    elif isinstance(raw,bool):raise ValueError('Session totals must be whole numbers.')
                    elif isinstance(raw,int):value=raw
                    elif isinstance(raw,str) and raw.isascii() and raw.isdigit():value=int(raw)
                    else:raise ValueError('Session totals must be nonnegative whole numbers.')
                    if value is not None and not 0<=value<=100000:raise ValueError('Session totals must be between 0 and 100000.')
                    body[key]=value
                if no_sessions:
                    if body['total_sessions_authorized'] not in [None,0]:raise ValueError('No sessions authorized requires an authorized total of zero.')
                    body['total_sessions_authorized']=0
                total,used=body['total_sessions_authorized'],body['sessions_used_to_date']
                body['remaining_sessions']=total-used if total is not None and used is not None else None
                body['synthetic']=True
            elif action == 'privacy':
                document = data.get('document')
                status = data.get('status')
                documents = ['Privacy notice acknowledgment', 'Treatment consent', 'Telehealth consent', 'Release of information']
                if document not in documents or status not in ['Discussed', 'Acknowledged', 'Declined', 'Revoked']:
                    raise ValueError('Choose a supported demonstration document and status.')
                if status == 'Revoked':
                    prior = linked(data.get('prior_id'), 'privacy')
                    if prior['document'] != document or prior['status'] in ['Revoked', 'Declined']:
                        raise ValueError('Revocation must reference a matching prior acknowledgment or discussion.')
                    if any(r['kind']=='privacy' and r.get('prior_id')==prior['id'] for r in records):
                        raise ValueError('This event already has a revocation record.')
                body = {'document': document, 'status': status, 'document_version': 'demo-form-1',
                        'notes': text(data, 'notes'), 'actor': 'Demo Clinician',
                        'meaning': 'Synthetic workflow tracking only; no patient consent or legal validity established.'}
                if status == 'Revoked':
                    body['prior_id'] = prior['id']
            elif action == 'prognosis':
                plan = linked(data.get('plan_id'), 'plan')
                body = {key: text(data, key) for key in ['statement', 'supporting_factors', 'barriers', 'review_date']}
                date.fromisoformat(body['review_date'])
                body.update(plan_id=plan['id'], plan_hash=plan['hash'], author='Demo Clinician')
            elif action == 'discharge':
                note = linked(data.get('note_id'), 'note')
                if not any(r['kind']=='signature' and r['note_id']==note['id'] for r in records):
                    raise ValueError('Select a signed demonstration note before documenting discharge.')
                prognosis = linked(data.get('prognosis_id'), 'prognosis')
                if prognosis['plan_id'] != note['plan_id']:
                    raise ValueError('Discharge note and prognosis must reference the same plan version.')
                body = {key: text(data, key) for key in ['reason', 'course', 'goal_status', 'follow_up', 'discharge_date']}
                date.fromisoformat(body['discharge_date'])
                body.update(note_id=note['id'], prognosis_id=prognosis['id'], author='Demo Clinician',
                            meaning='Synthetic discharge summary; does not close a real episode or arrange care.')
            elif action == 'assessment':
                response = linked(data.get('response_id'), 'response')
                if data.get('reviewed') is not True:
                    raise ValueError('Review assessment findings and pathway selection before saving.')
                body = {key:text(data,key,4000) for key in ASSESSMENT_FIELDS}
                problems=assessment_problems(data.get('problem_selections'))
                body.update(problems=problems, library_id=LIBRARY['id'],library_version=LIBRARY['version'],library_hash=LIBRARY_HASH,
                            pathway_name=text(data,'pathway_name',300),pathway_rationale=text(data,'pathway_rationale'),
                            pathway_mode='Clinician-selected/custom narrative; no automated recommendations',
                            response_id=response['id'],response_hash=response['hash'],reviewed_by='Demo Clinician')
            elif action == 'plan':
                if data.get('reviewed') is not True:
                    raise ValueError('Review the source problems and linked plan before saving.')
                assessment=linked(data.get('assessment_id'),'assessment')
                status=data.get('status')
                if status not in ['draft','finalized']:raise ValueError('Choose draft or finalized plan status.')
                nodes=validate_tree(data.get('problem_nodes'),assessment,status)
                body={key:text(data,key) for key in ['diagnosis','treatment_modality','treatment_approaches','response_to_treatment','homework','review_date']}
                date.fromisoformat(body['review_date'])
                body.update(schema='hierarchical-plan/1',status=status,problem_nodes=nodes,
                    assessment=assessment['clinical_summary'],assessment_id=assessment['id'],assessment_hash=assessment['hash'],
                    library_id=assessment['library_id'],library_version=assessment['library_version'],library_hash=assessment['library_hash'],
                    pathway_name=assessment['pathway_name'],pathway_rationale=assessment['pathway_rationale'],
                    response_id=assessment['response_id'],response_hash=assessment['response_hash'],
                    version=1+sum(r['kind']=='plan' for r in records),reviewed_by='Demo Clinician')
            elif action == 'plan_signature':
                plan=linked(data.get('plan_id'),'plan')
                if plan.get('status')!='finalized':raise ValueError('Only finalized hierarchical plans can receive a demonstration signature.')
                if data.get('reviewed') is not True:raise ValueError('Review the full plan before signing.')
                if any(r['kind']=='plan_signature' and r['plan_id']==plan['id'] for r in records):raise ValueError('This plan already has a demonstration signature.')
                body={'plan_id':plan['id'],'plan_hash':plan['hash'],'signer':'Demo Clinician',
                      'meaning':'Synthetic clinician plan signature; not a verified patient or clinician signature.'}
            elif action == 'plan_review':
                plan=linked(data.get('plan_id'),'plan')
                links=objective_links(plan,[data.get('objective_id')])
                if not links:raise ValueError('Choose a linked objective.')
                outcome=data.get('outcome')
                if outcome not in ['Not assessed','Progress discussed','Goal revision needed']:raise ValueError('Select a review outcome.')
                body={'plan_id':plan['id'],'plan_hash':plan['hash'],'objective_link':links[0],
                      'outcome':outcome,'summary':text(data,'summary'),'reviewer':'Demo Clinician'}
            elif action == 'group_participant':
                plan = linked(data.get('plan_id'),'plan')
                session = next((g for g in groups.sessions(db) if g['id']==data.get('session_id')),None)
                if not session or session['attendance'].get(patient_id) != 'Present':
                    raise ValueError('Choose a shared session where this synthetic participant is recorded present.')
                if data.get('billing_review') not in ['Not reviewed','Review needed','No charge proposed']:
                    raise ValueError('Choose a participant billing review status.')
                body = {k:text(data,k) for k in ['participant_note','response_to_treatment','homework']}
                body.update(session_id=session['id'],session_hash=session['hash'],plan_id=plan['id'],
                            plan_hash=plan['hash'],billing_review=data['billing_review'],author='Demo Clinician',
                            billing_generated=False)
            elif action == 'note':
                plan = linked(data.get('plan_id'), 'plan')
                template = data.get('template')
                fields = {'DAP': ['Data', 'Assessment', 'Plan'], 'SOAP': ['Subjective', 'Objective', 'Assessment', 'Plan'], 'Narrative': ['Narrative', 'Next steps']}
                if template not in fields:
                    raise ValueError('Choose DAP, SOAP, or Narrative.')
                sections = data.get('sections')
                if not isinstance(sections, dict) or set(sections) != set(fields[template]):
                    raise ValueError('Complete all template sections.')
                refs=data.get('objective_refs',[])
                if plan.get('schema')=='hierarchical-plan/1' and (plan.get('status')!='finalized' or not refs):
                    raise ValueError('Choose a finalized plan and at least one linked patient objective.')
                links=objective_links(plan,refs)
                body = {'plan_id': plan['id'], 'plan_hash': plan['hash'], 'objective_links':links, 'template': template,
                        'sections': {k: text(sections, k) for k in fields[template]}, 'author': 'Demo Clinician',
                        'response_to_treatment': text(data,'response_to_treatment') if 'response_to_treatment' in data else 'Not documented',
                        'homework': text(data,'homework') if 'homework' in data else 'Not documented'}
            elif action == 'signature':
                note = linked(data.get('note_id'), 'note')
                if any(r['kind'] == 'signature' and r['note_id'] == note['id'] for r in records):
                    raise ValueError('This note already has a demonstration signature.')
                if data.get('reviewed') is not True:
                    raise ValueError('Review the note before signing.')
                body = {'note_id': note['id'], 'note_hash': note['hash'], 'signer': 'Demo Clinician', 'meaning': 'Synthetic demonstration signature; no identity verification.'}
            elif action == 'amendment':
                note = linked(data.get('note_id'), 'note')
                if not any(r['kind'] == 'signature' and r['note_id'] == note['id'] for r in records):
                    raise ValueError('Only signed notes can receive an amendment.')
                body = {'note_id': note['id'], 'reason': text(data, 'reason'), 'text': text(data, 'text'), 'author': 'Demo Clinician'}
            elif action == 'encounter':
                note = linked(data.get('note_id'), 'note')
                if not any(r['kind'] == 'signature' and r['note_id'] == note['id'] for r in records):
                    raise ValueError('Add a demonstration signature before creating the encounter.')
                plan = linked(note['plan_id'], 'plan')
                service_date = text(data, 'service_date', 10)
                date.fromisoformat(service_date)
                cents = data.get('charge_cents')
                if type(cents) is not int or not 0 < cents <= 1000000:
                    raise ValueError('Charge must be between $0.01 and $10,000.')
                # Use deliberately fictional codes, avoiding clinical coding or claim compatibility claims.
                body = {'note_id': note['id'], 'service_date': service_date, 'charge_cents': cents,
                        'procedure': 'DEMO-SESSION', 'diagnosis': plan['diagnosis'], 'synthetic': True}
            else:
                raise ValueError('Unknown workflow action.')
            rid = str(uuid.uuid4())
            created = datetime.now(timezone.utc).isoformat()
            body['recorded_by_account_id']=getattr(self,'actor_id','')
            hashed = digest({'patient_id': patient_id, 'kind': action, 'created': created, 'body': body})
            db.execute('INSERT INTO records(id,patient_id,kind,created,body,hash) VALUES(?,?,?,?,?,?)',
                       (rid, patient_id, action, created, json.dumps(body), hashed))
            return dict(body, id=rid, kind=action, created=created, hash=hashed)

    def claim_preview(self, patient_id, encounter_id, adapter):
        chart = self.chart(patient_id)
        encounter = next((r for r in chart['records'] if r['id'] == encounter_id and r['kind'] == 'encounter'), None)
        if not encounter:
            raise ValueError('Select an encounter in this chart.')
        value = claim(encounter, chart['patient'])
        return {'claim': value, **preview(value, adapter)}

    def group_workspace(self):
        with self.connect() as db:
            shared = groups.sessions(db)
        return {'group':groups.GROUP,'sessions':shared,'attendance_statuses':groups.STATUSES}

    def save_group(self,data):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            return groups.save(db,data,text)

    def calendar_day(self,patient_id,day):
        self.patient(patient_id)
        with self.connect() as db:return workspaces.day_view(db,patient_id,day)
