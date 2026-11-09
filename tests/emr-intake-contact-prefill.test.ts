import {expect, test} from 'vitest';
import {intakeContactPrefill, intakeContactFieldPairs} from '@/lib/emr/intake-contact-prefill';

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
