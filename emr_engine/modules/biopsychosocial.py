"""Owner-specified symptom checklist. Documentation only; no scoring or diagnostic inference."""
from modules.questionnaires import digest
SYMPTOMS = [{'id': 'symptom_01', 'label': 'Aggressive Behaviors'}, {'id': 'symptom_02', 'label': 'Agitation'}, {'id': 'symptom_04', 'label': 'Appetite Disturbance / Loss of Appetite'}, {'id': 'symptom_05', 'label': 'Bingeing/Purging'}, {'id': 'symptom_06', 'label': 'Circumstantial Symptoms'}, {'id': 'symptom_07', 'label': 'Concomitant Medical Condition'}, {'id': 'symptom_08', 'label': 'Conduct Problems'}, {'id': 'symptom_09', 'label': 'Delusions'}, {'id': 'symptom_10', 'label': 'Depressed Mood'}, {'id': 'symptom_11', 'label': 'Dissociative States'}, {'id': 'symptom_12', 'label': 'Elevated Mood'}, {'id': 'symptom_13', 'label': 'Elimination Disturbance'}, {'id': 'symptom_14', 'label': 'Emotional Trauma Perpetrator'}, {'id': 'symptom_15', 'label': 'Emotional Trauma Victim'}, {'id': 'symptom_16', 'label': 'Emotionality'}, {'id': 'symptom_17', 'label': 'Fatigue/Low Energy'}, {'id': 'symptom_18', 'label': 'Generalized Anxiety'}, {'id': 'symptom_19', 'label': 'Grief'}, {'id': 'symptom_20', 'label': 'Guilt'}, {'id': 'symptom_21', 'label': 'Hallucinations'}, {'id': 'symptom_22', 'label': 'Hopelessness'}, {'id': 'symptom_23', 'label': 'Hyperactivity'}, {'id': 'symptom_24', 'label': 'Irritability'}, {'id': 'symptom_25', 'label': 'Laxative/Diuretic Abuse'}, {'id': 'symptom_26', 'label': 'Loose Associations'}, {'id': 'symptom_27', 'label': 'Mood Swings'}, {'id': 'symptom_28', 'label': 'Obsessions/Compulsions'}, {'id': 'symptom_29', 'label': 'Oppositional Behavior'}, {'id': 'symptom_30', 'label': 'Panic Attacks'}, {'id': 'symptom_31', 'label': 'Paranoid Ideation'}, {'id': 'symptom_32', 'label': 'Phobias'}, {'id': 'symptom_33', 'label': 'Physical Trauma Perpetrator'}, {'id': 'symptom_34', 'label': 'Physical Trauma Victim'}, {'id': 'symptom_35', 'label': 'Poor Concentration'}, {'id': 'symptom_36', 'label': 'Poor Grooming'}, {'id': 'symptom_37', 'label': 'Psychomotor Retardation'}, {'id': 'symptom_38', 'label': 'Self-Mutilation'}, {'id': 'symptom_39', 'label': 'Sexual Dysfunction'}, {'id': 'symptom_40', 'label': 'Sexual Trauma Perpetrator'}, {'id': 'symptom_41', 'label': 'Sexual Trauma Victim'}, {'id': 'symptom_42', 'label': 'Significant Weight Gain/Loss'}, {'id': 'symptom_43', 'label': 'Sleep Disturbance'}, {'id': 'symptom_44', 'label': 'Social Isolation'}, {'id': 'symptom_45', 'label': 'Somatic Complaints'}, {'id': 'symptom_46', 'label': 'Substance Abuse'}, {'id': 'symptom_47', 'label': 'Worthlessness'}, {'id': 'symptom_48', 'label': 'Other'}]
RATINGS = ['Need','Mild','Moderate','Severe']
DEFINITION = {'version':'1.2.0','consolidation_version':'1','page':'Current Symptom Checklist','symptoms':SYMPTOMS,'ratings':RATINGS}
def checklist(data):
    ratings=data.get('ratings')
    if not isinstance(ratings,dict):raise ValueError('Symptom ratings must be an object.')
    known={s['id'] for s in SYMPTOMS}
    if any(key not in known or value not in RATINGS for key,value in ratings.items()):raise ValueError('Choose one supported rating per listed symptom.')
    return {'schema':'biopsychosocial-symptoms/1','ratings':ratings,'definition':DEFINITION,'definition_hash':digest(DEFINITION),'synthetic':True}

def treatment_history(data,records):
    from datetime import date
    import uuid
    prior_id=data.get('prior_id','')
    if not isinstance(prior_id,str):raise ValueError('Invalid history entry.')
    prior=None
    if prior_id:
        prior=next((r for r in records if r['kind']=='biopsychosocial_treatment_history' and r['id']==prior_id),None)
        if not prior:raise ValueError('Choose a history entry from this patient record.')
        if any(r['kind']=='biopsychosocial_treatment_history' and r.get('prior_id')==prior_id for r in records):raise ValueError('This entry has been updated. Reopen the latest version.')
    body={'schema':'biopsychosocial-treatment-history/1','prior_id':prior_id,'episode_id':prior['episode_id'] if prior else str(uuid.uuid4()),'synthetic':True}
    if data.get('setting') not in ['Inpatient','Outpatient']:raise ValueError('Choose Inpatient or Outpatient.')
    body['setting']=data['setting']
    for key,limit in [('provider_facility',200),('reason',2000),('outcome_notes',4000),('start_date',10),('end_date',10)]:
        value=data.get(key,'')
        if not isinstance(value,str) or len(value)>limit:raise ValueError('Invalid treatment history '+key.replace('_',' ')+'.')
        body[key]=value.strip()
    if not (body['provider_facility'] or body['reason']):raise ValueError('Enter a provider/facility or a brief reason for treatment.')
    flag=data.get('ongoing',False)
    if not isinstance(flag,bool):raise ValueError('Invalid ongoing status.')
    body['ongoing']=flag
    if flag and body['end_date']:raise ValueError('Ongoing treatment cannot have an end date.')
    for key in ['start_date','end_date']:
        if body[key]:
            try:
                value=date.fromisoformat(body[key])
                if value.isoformat()!=body[key] or value>date.today():raise ValueError()
            except ValueError:raise ValueError('Enter valid history dates, or leave unknown dates blank.') from None
    if body['start_date'] and body['end_date'] and body['end_date']<body['start_date']:raise ValueError('End date must be on or after start date.')
    return body

def medication(data,records):
    from datetime import date
    import uuid
    prior_id=data.get('prior_id','')
    if not isinstance(prior_id,str):raise ValueError('Invalid medication entry.')
    prior=None
    if prior_id:
        prior=next((r for r in records if r['kind']=='biopsychosocial_medication' and r['id']==prior_id),None)
        if not prior:raise ValueError('Choose a medication from this patient record.')
        if any(r['kind']=='biopsychosocial_medication' and r.get('prior_id')==prior_id for r in records):raise ValueError('This medication was updated. Reopen its latest entry.')
    body={'schema':'biopsychosocial-medication/1','prior_id':prior_id,'medication_id':prior['medication_id'] if prior else str(uuid.uuid4()),'synthetic':True}
    for key,limit in [('medication',200),('dosage',200),('frequency',200),('prescribing_physician',200),('start_date',10),('end_date',10)]:
        value=data.get(key,'')
        if not isinstance(value,str) or len(value)>limit:raise ValueError('Invalid '+key.replace('_',' ')+'.')
        body[key]=value.strip()
    duration=data.get('duration','')
    if duration not in ['', 'Less than 3 months', '3 to less than 6 months', '6 months to less than 1 year', '1 to less than 2 years', '2 to 5 years', 'More than 5 years', 'Not sure']:raise ValueError('Choose a valid estimated medication duration.')
    if duration:body['duration']=duration
    if not body['medication']:raise ValueError('Enter the medication name.')
    if data.get('status') not in ['Current','Past']:raise ValueError('Choose Current or Past medication.')
    body['status']=data['status']
    if body['status']=='Current' and body['end_date']:raise ValueError('Current medications cannot have an end date.')
    benefit=data.get('benefit','')
    if benefit not in ['', 'Beneficial','Not beneficial']:raise ValueError('Choose at most one medication benefit response.')
    body['benefit']=benefit
    for key in ['start_date','end_date']:
        if body[key]:
            try:
                parsed=date.fromisoformat(body[key])
                if parsed.isoformat()!=body[key] or parsed>date.today():raise ValueError()
            except ValueError:raise ValueError('Enter valid medication dates, or leave unknown dates blank.') from None
    if body['start_date'] and body['end_date'] and body['end_date']<body['start_date']:raise ValueError('Medication end date must be on or after start date.')
    return body

def medication_allergies(data):
    status=data.get('allergy_status')
    if status not in ['Not yet reviewed','No known medication allergies','Medication allergies reported']:raise ValueError('Choose a medication allergy status.')
    notes=data.get('allergy_notes','')
    if not isinstance(notes,str) or len(notes)>4000:raise ValueError('Medication allergy notes must be at most 4000 characters.')
    notes=notes.strip()
    if status=='Medication allergies reported' and not notes:raise ValueError('List the medication allergies and any known reactions.')
    if status=='No known medication allergies' and notes:raise ValueError('Clear allergy details or choose Medication allergies reported.')
    return {'schema':'medication-allergies/1','allergy_status':status,'allergy_notes':notes,'synthetic':True}
