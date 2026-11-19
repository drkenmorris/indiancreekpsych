"""Clinician-entered prognosis projections and a restricted rich-text rationale."""
import json
import re
from datetime import date

RATINGS = ('Superior', 'Satisfactory', 'Fair', 'Deficient', 'Failure')
FONTS = ('Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New')
SIZES = ('10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt')


def rich_document(value):
    count = 0
    characters = 0
    meaningful = False
    children = {'doc': ('paragraph', 'bulletList', 'orderedList'), 'paragraph': ('text', 'hardBreak'),
                'bulletList': ('listItem',), 'orderedList': ('listItem',),
                'listItem': ('paragraph', 'bulletList', 'orderedList')}

    def walk(node, depth=0, parent=None):
        nonlocal count, characters, meaningful
        count += 1
        if not isinstance(node, dict) or depth > 16 or count > 2000 or set(node) - {'type', 'text', 'attrs', 'marks', 'content'}:
            raise ValueError('Invalid rationale formatting.')
        kind = node.get('type')
        if kind not in (*children, 'text', 'hardBreak') or (depth == 0 and kind != 'doc') or (depth and kind == 'doc'):
            raise ValueError('Invalid rationale document.')
        if parent is not None and kind not in children.get(parent, ()):
            raise ValueError('Invalid rationale document structure.')
        if kind == 'text':
            if not isinstance(node.get('text'), str) or not node['text'] or 'content' in node:
                raise ValueError('Invalid rationale text.')
            characters += len(node['text'])
            meaningful = meaningful or bool(node['text'].strip())
        elif 'text' in node:
            raise ValueError('Invalid rationale text.')
        if 'attrs' in node:
            attrs = node['attrs']
            allowed = ('textAlign', 'indent') if kind == 'paragraph' else ('start', 'type') if kind == 'orderedList' else ()
            if not isinstance(attrs, dict) or set(attrs) - set(allowed):
                raise ValueError('Invalid rationale formatting attributes.')
            if attrs.get('textAlign') is not None and attrs['textAlign'] not in ('left', 'center', 'right', 'justify'):
                raise ValueError('Invalid rationale alignment.')
            for key, low, high in [('indent', 0, 8), ('start', 1, 1000)]:
                if attrs.get(key) is not None and (type(attrs[key]) is not int or not low <= attrs[key] <= high):
                    raise ValueError('Invalid rationale indentation or list start.')
            if attrs.get('type') is not None and attrs['type'] != '1':
                raise ValueError('Invalid rationale list type.')
        if 'marks' in node:
            marks = node['marks']
            if kind != 'text' or not isinstance(marks, list) or len(marks) > 5:
                raise ValueError('Invalid rationale text marks.')
            seen = set()
            for mark in marks:
                if not isinstance(mark, dict) or set(mark) - {'type', 'attrs'} or mark.get('type') not in ('bold', 'italic', 'underline', 'strike', 'textStyle') or mark['type'] in seen:
                    raise ValueError('Invalid rationale text style.')
                seen.add(mark['type'])
                attrs = mark.get('attrs', {})
                if not isinstance(attrs, dict) or set(attrs) - ({'fontFamily', 'fontSize'} if mark['type'] == 'textStyle' else set()):
                    raise ValueError('Invalid rationale font attributes.')
                if attrs.get('fontFamily') is not None and attrs['fontFamily'] not in FONTS:
                    raise ValueError('Invalid rationale font.')
                if attrs.get('fontSize') is not None and attrs['fontSize'] not in SIZES:
                    raise ValueError('Invalid rationale font size.')
        if kind in ('text', 'hardBreak'):
            if 'content' in node:
                raise ValueError('Invalid rationale document structure.')
        elif kind == 'paragraph':
            if 'content' in node and not isinstance(node['content'], list):
                raise ValueError('Invalid rationale paragraph.')
        elif not isinstance(node.get('content'), list) or not node['content']:
            raise ValueError('Invalid rationale document structure.')
        for child in node.get('content', []):
            walk(child, depth + 1, kind)

    walk(value)
    if characters > 20000 or len(json.dumps(value, ensure_ascii=False).encode()) > 150000:
        raise ValueError('Rationale must be within 20,000 characters and the formatting limit.')
    return meaningful


def validate(data):
    fields = {'schema', 'discharge_percent', 'projected_sessions', 'projected_end_date', 'rating', 'rationale'}
    if not isinstance(data, dict) or set(data) != fields or data.get('schema') != 'prognosis/2':
        raise ValueError('Invalid prognosis fields.')
    percent, sessions = data['discharge_percent'], data['projected_sessions']
    if percent is not None and (type(percent) is not int or percent not in range(10, 101, 10)):
        raise ValueError('Choose a discharge threshold in 10% increments from 10% to 100%.')
    if sessions is not None and (type(sessions) is not int or not 1 <= sessions <= 100):
        raise ValueError('Projected sessions must be a whole number from 1 to 100.')
    end = data['projected_end_date']
    if not isinstance(end, str) or end and (not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', end) or date.fromisoformat(end).isoformat() != end):
        raise ValueError('Choose a valid projected treatment-end date.')
    if data['rating'] not in ('', *RATINGS):
        raise ValueError('Choose one of the prognosis ratings.')
    meaningful = rich_document(data['rationale'])
    if percent is None and sessions is None and not end and not data['rating'] and not meaningful:
        raise ValueError('Enter at least one prognosis field or a rationale before saving.')
    return dict(data)
