import {expect,test} from 'vitest';
import {groupSessionStartUtc} from '@/lib/emr/group-time';

test('interprets winter and summer wall times in America/Chicago, irrespective of browser timezone',()=>{
  expect(groupSessionStartUtc('2026-01-15T09:30')).toBe('2026-01-15T15:30:00.000Z');
  expect(groupSessionStartUtc('2026-07-15T09:30')).toBe('2026-07-15T14:30:00.000Z');
});
test('rejects invalid calendar input and malformed times',()=>{
  for(const value of ['2026-02-30T09:00','2026-11-09T25:00','2026-11-09T09:00Z',''])
    expect(()=>groupSessionStartUtc(value)).toThrow();
});
test('does not guess skipped or repeated daylight-saving wall times',()=>{
  expect(()=>groupSessionStartUtc('2026-03-08T02:30')).toThrow(/does not exist/);
  expect(()=>groupSessionStartUtc('2026-11-01T01:30')).toThrow(/occurs twice/);
  expect(groupSessionStartUtc('2026-11-01T02:30')).toBe('2026-11-01T08:30:00.000Z');
});
