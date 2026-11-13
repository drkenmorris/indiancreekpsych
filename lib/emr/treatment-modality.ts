export const sessionTypes = {
 '90791': 'Diagnostic evaluation',
 '90832': 'Individual psychotherapy (30 min)',
 '90834': 'Individual psychotherapy (45 min)',
 '90837': 'Individual psychotherapy (60 min)',
 '90839': 'Crisis psychotherapy (first hour)',
 '90846': 'Family psychotherapy without patient',
 '90847': 'Family psychotherapy with patient',
 '90849': 'Multiple-family group psychotherapy',
 '90853': 'Group psychotherapy',
 '96130': 'Psychological testing evaluation (first hour)',
 '96136': 'Test administration and scoring by a qualified clinician (first 30 min)',
 '96138': 'Test administration and scoring by a technician (first 30 min)',
 '96146': 'Single automated test with automated result',
} as const;

export const sessionFrequencies = {
 three_weekly: 'Three times per week',
 twice_weekly: 'Twice per week',
 weekly: 'Weekly',
 every_two_weeks: 'Every two weeks',
 monthly: 'Monthly',
} as const;

export const maxSessionRows = 50;
export const maxExpectedSessions = 100;

export type ModalitySession = {
 code: string;
 count: number;
 frequency: string;
 providerId: string;
};
