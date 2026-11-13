import {expect,test} from 'vitest';
import {practiceWallTimeToIso} from '../lib/scheduling/calendar';

test('blackout wall times are interpreted in the practice zone regardless of browser timezone',()=>{
 expect(practiceWallTimeToIso('2026-01-15T10:00','America/Chicago')).toBe('2026-01-15T16:00:00.000Z');
 expect(practiceWallTimeToIso('2026-07-15T10:00','America/Chicago')).toBe('2026-07-15T15:00:00.000Z');
 expect(practiceWallTimeToIso('2026-12-01T10:00','America/New_York')).toBe('2026-12-01T15:00:00.000Z');
});

test('blackout entry rejects nonexistent spring-forward wall time instead of shifting appointments',()=>{
 expect(()=>practiceWallTimeToIso('2026-03-08T02:30','America/Chicago')).toThrow(/daylight-saving change/);
 expect(practiceWallTimeToIso('2026-03-08T03:30','America/Chicago')).toBe('2026-03-08T08:30:00.000Z');
});

test('blackout entry rejects ambiguous fall-back wall time rather than selecting the wrong occurrence',()=>{
 expect(()=>practiceWallTimeToIso('2026-11-01T01:30','America/Chicago')).toThrow(/daylight-saving change/);
 expect(practiceWallTimeToIso('2026-11-01T02:30','America/Chicago')).toBe('2026-11-01T08:30:00.000Z');
});

test.each(['2026-02-30T10:00','2026-12-01T25:00','2026-12-01T10:60','2026-12-01',''])('malformed or impossible blackout datetime is rejected: %s',value=>{
 expect(()=>practiceWallTimeToIso(value,'America/Chicago')).toThrow();
});

test('invalid practice timezone never falls back to the operator computer timezone',()=>{
 expect(()=>practiceWallTimeToIso('2026-12-01T10:00','Not/A_Real_Zone')).toThrow();
});
