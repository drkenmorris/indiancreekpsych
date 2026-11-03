"""Original medical and substance-use history documentation. No scoring or inference."""
from modules.questionnaires import digest
import json
from pathlib import Path
DEFINITION=json.loads(Path(__file__).with_name('medical_substance_definition.json').read_text())
GROUPS=DEFINITION['groups']
NOTES=DEFINITION['notes']
EXCLUSIVE=DEFINITION['exclusive']
def validate(data):
    selections=data.get('selections')
    notes=data.get('notes',{})
    if not isinstance(selections,dict) or not isinstance(notes,dict):raise ValueError('Invalid medical/substance history form.')
    if set(selections)-{g['key'] for g in GROUPS} or set(notes)-set(NOTES):raise ValueError('Unknown medical/substance history field.')
    clean={}
    for group in GROUPS:
        values=selections.get(group['key'],[])
        if not isinstance(values,list) or any(not isinstance(v,str) or v not in group['choices'] for v in values) or len(values)!=len(set(values)):raise ValueError('Choose supported medical/substance history items without duplicates.')
        if any(v in EXCLUSIVE for v in values) and len(values)>1:raise ValueError('None reported / History unknown cannot be combined with other choices in the same section.')
        clean[group['key']]=values
    text={}
    for key in NOTES:
        value=notes.get(key,'')
        if not isinstance(value,str) or len(value)>4000:raise ValueError('History details must be at most 4000 characters per field.')
        text[key]=value.strip()
    return {'schema':'biopsychosocial-medical-substance/1','selections':clean,'notes':text,'definition':DEFINITION,'definition_hash':digest(DEFINITION),'synthetic':True}
