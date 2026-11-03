"""Original, versioned starter planning content. Labels never assign a diagnosis."""
from modules.questionnaires import digest

CATALOG = [
 ('adult','Adult Psychotherapy',[
  ('bipolar','Bipolar Disorder','changes in activity, mood or rest','keeping agreed routines during changes in mood or energy'),
  ('pain','Chronic Pain','the impact of persistent pain on chosen daily activities','communicating activity barriers and pacing preferences'),
  ('suicidal','Suicidal Ideation','communicating thoughts and concerns for direct clinician assessment','participating in clinician-led review of immediate needs and supports'),
  ('routines','Daily Routine Difficulties','starting a chosen daily activity','maintaining a manageable activity log')]),
 ('couples','Couples Psychotherapy',[
  ('family','Family Conflicts','describing a recurring family disagreement','communicating a personally identified need during disagreements'),
  ('communication','Communication Difficulties','taking turns describing a concern','checking understanding during an agreed conversation')]),
 ('personality','Personality Disorders',[
  ('patterns','Interpersonal Pattern Concerns','recognizing a recurring interaction pattern','describing the effect of that pattern on chosen relationships')]),
 ('addiction','Addiction Issues',[
  ('substance','Substance-use Concerns','describing the context and impact of substance use','discussing a personally selected change with the clinician')]),
 ('youth','Adolescent and Child Issues Group',[
  ('school','School Routine Difficulties','starting a chosen school-day task','communicating support needs with appropriate adults'),
  ('family-youth','Family Conflicts','describing a family interaction from the young person’s perspective','practicing an agreed communication activity with appropriate support')])]


def problem_content(gid, pid, label, first, second):
    base=f'{gid}.{pid}'
    definitions=[]
    for di,context in enumerate([first,second],1):
        did=f'{base}.d{di}'
        goals=[]
        for gi,goal in enumerate([
            f'The patient agrees to practice a personally meaningful change related to {context}.',
            f'The patient agrees to communicate progress and barriers related to {context}.'],1):
            goal_id=f'{did}.g{gi}'
            objectives=[]
            for oi,objective in enumerate([
                f'The patient will record one agreed example related to {context} on four days during the next two weeks, if mutually appropriate.',
                f'The patient will bring one example and one question about {context} to the next agreed review.'],1):
                oid=f'{goal_id}.o{oi}'
                objectives.append({'id':oid,'text':objective,'interventions':[
                    {'id':f'{oid}.i1','text':f'The therapist will collaboratively clarify the patient’s chosen change related to {context} and adapt the activity to the assessed context.'},
                    {'id':f'{oid}.i2','text':f'The therapist will review the patient’s examples related to {context}, invite feedback and jointly revise the next step.'}]})
            goals.append({'id':goal_id,'text':goal,'objectives':objectives})
        definitions.append({'id':did,'text':f'The patient describes difficulty with {context}; the clinician will verify the patient-specific pattern and impact.','goals':goals})
    return {'id':base,'label':label,'definitions':definitions}

LIBRARY={'id':'original-emr-starter','version':'1.0.0','author':'Original EMR prototype content',
 'rights':'Original starter text; no TheraScribe/Wiley planner text copied.',
 'notice':'Synthetic demonstration choices only; not a licensed/validated clinical library. Problem labels are not diagnoses. The Suicidal Ideation entry is not a risk protocol or substitute for direct clinical assessment.',
 'groups':[{'id':gid,'label':label,'problems':[problem_content(gid,*p) for p in problems]} for gid,label,problems in CATALOG]}
LIBRARY_HASH=digest(LIBRARY)


def find_problem(pid):
    for group in LIBRARY['groups']:
        for problem in group['problems']:
            if problem['id']==pid:
                return group,problem
    raise ValueError('Choose a problem from the original starter library.')
