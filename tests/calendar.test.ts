import {expect,test} from 'vitest';
import {localParts,monthDays,monthQueryRange,shiftMonth} from '../lib/scheduling/calendar';
test('month navigation handles year rollover and leap days',()=>{
 expect(shiftMonth('2026-12',1)).toBe('2027-01');expect(shiftMonth('2026-01',-1)).toBe('2025-12');
 const days=monthDays('2028-02');expect(days).toHaveLength(42);expect(days).toContain('2028-02-29');expect(new Date(days[0]+'T12:00Z').getUTCDay()).toBe(0);
});
test('practice-local grouping handles UTC date rollover and daylight saving',()=>{
 expect(localParts('2026-10-01T01:00:00Z','America/Chicago')).toEqual({date:'2026-09-30',time:'20:00'});
 expect(localParts('2026-11-01T16:00:00Z','America/Chicago')).toEqual({date:'2026-11-01',time:'10:00'});
 const range=monthQueryRange('2026-09');expect(range.from<'2026-08-30T00:00:00Z').toBe(true);expect(range.to>'2026-10-10T23:59:59Z').toBe(true);
});
