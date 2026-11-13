export const sessionTypes = {
 '90791': 'Diagnostic evaluation',
 '90832': 'Individual psychotherapy (30 min)',
 '90834': 'Individual psychotherapy (45 min)',
 '90837': 'Individual psychotherapy (60 min)',
 '90846': 'Family psychotherapy without patient',
 '90847': 'Family psychotherapy with patient',
 '90849': 'Multiple-family group psychotherapy',
 '90853': 'Group psychotherapy',
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
