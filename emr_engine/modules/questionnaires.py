"""Standalone original demonstration instrument; no EMR or database dependency."""
import hashlib
import json

DEFINITION = {
    'id': 'daily-function-demo', 'version': '1.0.0',
    'title': 'Daily Function Check-in',
    'rights': 'Original prototype content; no third-party instrument imported.',
    'notice': 'Demonstration only. Not validated; no diagnostic cutoffs or treatment recommendations.',
    'period': 'Over the past seven days',
    'items': [
        {'id': 'routine', 'text': 'How much difficulty did you have starting your daily routine?'},
        {'id': 'focus', 'text': 'How much difficulty did you have staying focused on a chosen task?'},
        {'id': 'connection', 'text': 'How much difficulty did you have connecting with supportive people?'},
        {'id': 'rest', 'text': 'How much difficulty did you have feeling rested for daily activities?'}],
    'choices': ['None', 'A little', 'Some', 'A lot', 'Very much'],
    'scoring': {'version': 'sum-v1', 'method': 'sum', 'minimum': 0, 'maximum': 16,
                'direction': 'Higher totals represent more reported difficulty; interpret each item with the clinician.'}}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def score(answers):
    keys = {item['id'] for item in DEFINITION['items']}
    if not isinstance(answers, dict) or set(answers) != keys:
        raise ValueError('Answer every item; unknown items are not allowed.')
    if any(type(value) is not int or not 0 <= value <= 4 for value in answers.values()):
        raise ValueError('Each answer must be an integer from 0 to 4.')
    return {'definition': DEFINITION, 'definition_hash': digest(DEFINITION),
            'instrument_id': DEFINITION['id'], 'instrument_version': DEFINITION['version'],
            'scoring_version': DEFINITION['scoring']['version'], 'answers': answers,
            'total': sum(answers.values()), 'maximum': 16, 'reviewed': True}
