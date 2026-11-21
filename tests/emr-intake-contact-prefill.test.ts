import {expect, test} from 'vitest';
import {intakeContactPrefill, intakeContactFieldPairs, visibleIntakeContactEntries} from '@/lib/emr/intake-contact-prefill';

test('patient intake fills blank contact fields without overwriting clinician-reviewed values', () => {
  const draft = {address1: 'Reviewed home address', city: '', state: 'KS', email: 'verified@example.com'};
  const source = {
    address: 'Unreviewed address', address2: ' Apt 2 ', city: ' Olathe ',
    state: 'MO', postal_code: ' 66062 ', email: 'other@example.com',
    phone: '555-0199', full_name: 'Changed Name', date_of_birth: '1900-01-01',
  };
  const result = intakeContactPrefill(draft, source);
  expect(result.fields).toEqual(['address2', 'city', 'postal_code']);
  expect(result.draft).toMatchObject({
    address1: 'Reviewed home address', address2: 'Apt 2', city: 'Olathe',
    state: 'KS', postal_code: '66062', email: 'verified@example.com',
  });
  expect(result.draft).not.toHaveProperty('phone');
  expect(result.draft).not.toHaveProperty('full_name');
  expect(result.draft).not.toHaveProperty('dob');
  expect(draft.city).toBe('');
  expect(source.city).toBe(' Olathe ');
});

test('intake prefill refuses missing, malformed, or excessive contact values', () => {
  const draft = {email: '', address1: ''};
  const result = intakeContactPrefill(draft, {
    email: 'not-an-email', address: 'x'.repeat(301), city: 123,
    state: '   ', postal_code: null, phone: '555-0100',
  });
  expect(result.fields).toEqual([]);
  expect(result.draft).toEqual(draft);
  expect(intakeContactPrefill(draft, null).draft).toEqual(draft);
  expect(intakeContactFieldPairs.map(([, target]) => target)).not.toContain('dob');
});

test('valid patient-reported address and email remain unsaved draft values until explicit clinician save', () => {
  const source = {email: ' patient@example.com ', address: ' 100 Example Road '};
  const draft = {first_name: 'Reviewed', last_name: 'Patient'};
  const result = intakeContactPrefill(draft, source);
  expect(result.fields).toEqual(['address1', 'email']);
  expect(result.draft).toMatchObject({first_name: 'Reviewed', last_name: 'Patient', address1: '100 Example Road', email: 'patient@example.com'});
  expect(draft).not.toHaveProperty('address1');
});


test('general patient directory shows only unverified contact source, never protected clinical or legal answers', () => {
  const intake = {
    full_name: 'Fictional Patient',
    email: 'fictional@example.invalid',
    address: '100 Fictional Street',
    trauma_history: 'PRIVATE TRAUMA NARRATIVE',
    trauma_history_checklist: '{"selections":{"PRIVATE":"yes"}}',
    medication_entries: 'PRIVATE MEDICATION',
    medication_allergy_notes: 'PRIVATE REACTION',
    medical_substance_history: 'PRIVATE MEDICAL HISTORY',
    treatment_history_entries: 'PRIVATE TREATMENT',
    legal_history: 'PRIVATE LEGAL HISTORY',
    roi_signature: 'PRIVATE SIGNATURE',
    insurance_member_id: 'PRIVATE INSURANCE ID',
    unknown_future_private_field: 'PRIVATE FUTURE ANSWER',
  };
  expect(visibleIntakeContactEntries(intake)).toEqual([
    ['full_name', 'Fictional Patient'],
    ['email', 'fictional@example.invalid'],
    ['address', '100 Fictional Street'],
  ]);
  const text = JSON.stringify(visibleIntakeContactEntries(intake));
  expect(text).not.toContain('PRIVATE');
  expect(text).not.toContain('selections');
});

test('directory contact display excludes blank, malformed and unknown intake values by default', () => {
  const source = {
    full_name: '  ',
    phone: '555-0100',
    email: ['not a scalar email'],
    date_of_birth: 20260101,
    unexpected_safety_answer: 'HIDDEN',
  };
  expect(visibleIntakeContactEntries(source)).toEqual([['phone', '555-0100']]);
  expect(visibleIntakeContactEntries(null)).toEqual([]);
  expect(visibleIntakeContactEntries(undefined)).toEqual([]);
});

test.each([
  ['multiline address carrying hidden clinical history', {address: '100 Fictional Street\nPRIVATE_TRAUMA_DETAIL'}],
  ['bidirectional override in a patient name', {full_name: 'Patient\u202EPROTECTED_HISTORY'}],
  ['invisible direction control in phone', {phone: '555-0100\u200FPRIVATE_MEDICATION'}],
  ['overlength contact narrative', {city: 'X'.repeat(301) + 'PRIVATE_HISTORY'}],
  ['invalid email masquerading as contact', {email: 'patient@example.invalid PRIVATE_LEGAL'}],
])('directory rejects disguised clinical narratives in %s', (_label, attack) => {
  const safe = {address: ' 100 Fictional Street ', email: ' patient@example.invalid ', ...attack};
  const entries = visibleIntakeContactEntries(safe);
  const rendered = JSON.stringify(entries);
  expect(rendered).not.toContain('PRIVATE');
  for (const key of Object.keys(attack)) expect(entries.some(([field]) => field === key)).toBe(false);
  if (!('address' in attack)) expect(entries).toContainEqual(['address', '100 Fictional Street']);
  if (!('email' in attack)) expect(entries).toContainEqual(['email', 'patient@example.invalid']);
});

test('unsafe reported contact values never enter an unsaved clinician demographics draft', () => {
  const draft = {address1: '', city: '', postal_code: '', email: ''};
  const source = {
    address: '100 Fictional Street\nPRIVATE_MEDICAL',
    city: 'Olathe\u202EPRIVATE_TRAUMA',
    postal_code: ' 66062 ',
    email: 'patient@example.invalid\u200F',
  };
  const result = intakeContactPrefill(draft, source);
  expect(result.fields).toEqual(['postal_code']);
  expect(result.draft).toEqual({...draft, postal_code: '66062'});
  expect(draft.postal_code).toBe('');
});
