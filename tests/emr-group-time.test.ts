import {expect,test} from 'vitest';
import {groupSessionStartUtc} from '@/lib/emr/group-time';
const clinic='America/Chicago';
test('clinic winter/summer timestamps are independent of browser zone',()=>{
 expect(groupSessionStartUtc('2026-01-15T09:30',clinic)).toBe('2026-01-15T15:30:00.000Z');
 expect(groupSessionStartUtc('2026-07-15T09:30',clinic)).toBe('2026-07-15T14:30:00.000Z');
 expect(groupSessionStartUtc('2026-11-09T14:00','America/New_York')).toBe('2026-11-09T19:00:00.000Z');
});
test('invalid and malformed clinical times are refused',()=>{
 for(const value of ['2026-02-30T09:00','2026-11-09T25:00','2026-11-09T09:00Z',''])
   expect(()=>groupSessionStartUtc(value,clinic)).toThrow(/valid clinic-local/);
 expect(()=>groupSessionStartUtc('2026-11-09T09:00','Invalid/Zone')).toThrow(/clinic timezone is invalid/);
});
test('DST nonexistent or duplicated wall times never silently become chart records',()=>{
 expect(()=>groupSessionStartUtc('2026-03-08T02:30',clinic)).toThrow(/daylight-saving/);
 expect(()=>groupSessionStartUtc('2026-11-01T01:30',clinic)).toThrow(/daylight-saving/);
 expect(groupSessionStartUtc('2026-11-01T02:30',clinic)).toBe('2026-11-01T08:30:00.000Z');
});
