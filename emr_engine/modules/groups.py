"""Synthetic shared group sessions. Participant clinical content belongs in charts."""
import json
import uuid
from datetime import datetime, timezone
from modules.questionnaires import digest

GROUP = {'id':'demo-routines','name':'Daily Routines · Synthetic Group',
         'roster':['demo-alex','demo-jamie','demo-sam']}
STATUSES = ['Not recorded','Present','Absent','Excused']


def setup(db):
    db.executescript('''CREATE TABLE IF NOT EXISTS group_sessions (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
      created TEXT NOT NULL, body TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS group_no_update BEFORE UPDATE ON group_sessions
      BEGIN SELECT RAISE(ABORT, 'Shared sessions are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS group_no_delete BEFORE DELETE ON group_sessions
      BEGIN SELECT RAISE(ABORT, 'Shared sessions are immutable'); END;''')


def sessions(db):
    return [dict(json.loads(r['body']),id=r['id'],created=r['created'],hash=r['hash'])
            for r in db.execute('SELECT * FROM group_sessions ORDER BY seq')]


def save(db, data, required_text):
    if not isinstance(data,dict):
        raise ValueError('Group session object required.')
    body={k:required_text(data,k) for k in ['facilitators','scheduled_start','shared_topic','shared_content']}
    datetime.fromisoformat(body['scheduled_start'])
    duration=data.get('duration_minutes')
    attendance=data.get('attendance')
    if type(duration) is not int or not 15<=duration<=240:
        raise ValueError('Group duration must be 15–240 minutes.')
    if not isinstance(attendance,dict) or set(attendance)!=set(GROUP['roster']) or any(s not in STATUSES for s in attendance.values()):
        raise ValueError('Record attendance status for every fixed synthetic roster member.')
    if data.get('reviewed') is not True:
        raise ValueError('Review shared content and keep individual clinical details in participant records.')
    body.update(group_id=GROUP['id'],group_name=GROUP['name'],roster=GROUP['roster'],
                attendance=attendance,duration_minutes=duration,timezone='America/Chicago',
                author='Demo Clinician',synthetic=True,billing_generated=False)
    rid=str(uuid.uuid4());created=datetime.now(timezone.utc).isoformat()
    hashed=digest({'kind':'group_session','created':created,'body':body})
    db.execute('INSERT INTO group_sessions(id,created,body,hash) VALUES(?,?,?,?)',(rid,created,json.dumps(body),hashed))
    return dict(body,id=rid,created=created,hash=hashed)
