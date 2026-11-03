"""Validate nested planning relationships against frozen assessment source content."""
from copy import deepcopy
from datetime import datetime, timezone
from modules.library import LIBRARY, LIBRARY_HASH, find_problem
from modules.questionnaires import digest


def bounded_list(value,label,maximum=20):
    if not isinstance(value,list) or len(value)>maximum:
        raise ValueError(f'{label} must be a list with at most {maximum} entries.')
    return value


def assessment_problems(selections):
    result=[];seen=set()
    for choice in bounded_list(selections,'Selected problems'):
        if not isinstance(choice,dict):raise ValueError('Invalid selected problem.')
        group,source=find_problem(choice.get('problem_id'))
        if source['id'] in seen:raise ValueError('A problem may be selected only once.')
        seen.add(source['id'])
        role=choice.get('role','unassigned')
        if role not in ['primary','secondary','unassigned']:raise ValueError('Invalid problem priority.')
        ids=bounded_list(choice.get('definition_ids'),'Selected definitions')
        if not ids or len(set(ids))!=len(ids):raise ValueError('Select distinct library definitions for each problem.')
        defs=[]
        for did in ids:
            d=next((d for d in source['definitions'] if d['id']==did),None)
            if d is None:raise ValueError('Definition must belong to its selected problem.')
            defs.append({'id':d['id'],'text':d['text']})
        result.append({'id':source['id'],'statement':source['label'],'role':role,
                       'group':{'id':group['id'],'label':group['label']},'definitions':defs,
                       'source_problem':deepcopy(source),'source_problem_hash':digest(source)})
    if not result:raise ValueError('Choose at least one library problem for this assessment.')
    if sum(p['role']=='primary' for p in result)>1:raise ValueError('An assessment can have at most one primary problem.')
    return result


def validate_tree(nodes,assessment,status):
    final=status=='finalized';seen=set();count=[0]
    def branch(items,candidates,kind):
        out=[];selected=set()
        for item in bounded_list(items,kind):
            if not isinstance(item,dict):raise ValueError('Invalid planning node.')
            source=next((c for c in candidates if c['id']==item.get('source_id')),None)
            if source is None:raise ValueError(f'{kind} selection must belong to its actual parent.')
            if source['id'] in selected:raise ValueError(f'Duplicate {kind} selection under the same parent.')
            selected.add(source['id']);iid=item.get('id')
            if not isinstance(iid,str) or not 1<=len(iid)<=100 or iid in seen:raise ValueError('Planning node ids must be distinct.')
            seen.add(iid);count[0]+=1
            if count[0]>200:raise ValueError('This prototype limits a plan to 200 selected nodes.')
            wording=item.get('text',source['text'])
            if not isinstance(wording,str) or not wording.strip() or len(wording)>4000:raise ValueError('Planning text must contain 1–4000 characters.')
            value={'id':iid,'source_id':source['id'],'source_text':source['text'],'text':wording.strip(),
                   'customized':wording.strip()!=source['text']}
            if kind=='definitions':
                value['goals']=branch(item.get('goals',[]),source['goals'],'goals')
            elif kind=='goals':
                agreement=item.get('agreement_status','pending')
                if agreement not in ['pending','agreed','declined']:raise ValueError('Invalid patient agreement status.')
                if final and agreement!='agreed':raise ValueError('Every finalized goal must record patient agreement.')
                note=item.get('agreement_note','')
                if not isinstance(note,str) or len(note)>2000:raise ValueError('Agreement note is too long.')
                value['patient_agreement']={'status':agreement,'note':note,'recorded_by':'Demo Clinician',
                    'recorded_at':datetime.now(timezone.utc).isoformat(),
                    'meaning':'Clinician-recorded synthetic agreement; no verified patient signature.'}
                value['objectives']=branch(item.get('objectives',[]),source['objectives'],'objectives')
            elif kind=='objectives':
                value['interventions']=branch(item.get('interventions',[]),source['interventions'],'interventions')
            out.append(value)
        if final and not out:raise ValueError(f'Finalized plans require at least one {kind} entry per parent.')
        return out
    problems=[];selected=set()
    for node in bounded_list(nodes,'Plan problems'):
        if not isinstance(node,dict):raise ValueError('Invalid plan problem.')
        source=next((p for p in assessment['problems'] if p['id']==node.get('assessment_problem_id')),None)
        if source is None or 'source_problem' not in source:raise ValueError('Select a library problem from this assessment. Earlier narrative assessments remain historical.')
        if source['id'] in selected:raise ValueError('Duplicate plan problem.')
        selected.add(source['id']);iid=node.get('id');role=node.get('role','unassigned')
        if not isinstance(iid,str) or not 1<=len(iid)<=100 or iid in seen:raise ValueError('Planning problem ids must be distinct.')
        seen.add(iid)
        if role not in ['primary','secondary','unassigned']:raise ValueError('Invalid plan problem priority.')
        if final and role=='unassigned':raise ValueError('Assign every finalized problem as primary or secondary.')
        allowed={d['id'] for d in source['definitions']}
        definitions=[d for d in source['source_problem']['definitions'] if d['id'] in allowed]
        problems.append({'id':iid,'assessment_problem_id':source['id'],'problem_id':source['id'],
          'label':source['statement'],'group':deepcopy(source['group']),'role':role,
          'source_problem_hash':source['source_problem_hash'],
          'definitions':branch(node.get('definitions',[]),definitions,'definitions')})
    primaries=sum(p['role']=='primary' for p in problems)
    if primaries>1 or (final and primaries!=1):raise ValueError('A finalized plan requires exactly one primary problem; drafts permit zero or one.')
    return problems


def objective_links(plan,ids):
    ids=bounded_list(ids,'Objective links',200)
    if len(set(ids))!=len(ids):raise ValueError('Duplicate objective links.')
    found={}
    for p in plan.get('problem_nodes',[]):
        for d in p['definitions']:
            for g in d['goals']:
                for o in g['objectives']:
                    found[o['id']]={'problem_id':p['id'],'problem_label':p['label'],'definition_id':d['id'],
                       'goal_id':g['id'],'objective_id':o['id'],'objective_text':o['text']}
    if any(i not in found for i in ids):raise ValueError('Objective links must belong to the exact selected plan version.')
    return [found[i] for i in ids]
