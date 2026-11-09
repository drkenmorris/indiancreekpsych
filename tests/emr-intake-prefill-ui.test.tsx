import React from 'react';
import {afterEach, expect, test, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import PatientRepository from '@/app/emr/PatientRepository';

afterEach(() => {cleanup();vi.unstubAllGlobals();});

test('live EMR patient repository only prefills blank contact fields into an unsaved clinician draft', async () => {
  const patient = {
    id: '00000000-0000-0000-0000-000000000201',
    account_id: '00000000-0000-0000-0000-000000000202',
    revision: 1,
    demographics: {
      first_name: 'Fictional', last_name: 'Patient',
      address1: 'Previously reviewed address', city: '', email: '',
    },
    profiles: null,
  };
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push((init?.method ?? 'GET') + ' ' + url);
    const body = url === '/api/emr/patients'
      ? {patients: [patient]}
      : url.startsWith('/api/emr/dsm-records?')
        ? {records: []}
        : {patients: [patient], intake: {
          status: 'draft', updated_at: '2026-11-09T00:00:00Z',
          answers: {
            address: 'Unreviewed address', city: ' Olathe ',
            postal_code: '66062', email: ' fictional@example.com ',
            full_name: 'Name not to import', date_of_birth: '1990-01-01',
            phone: '555-0100',
          },
        }};
    return {ok: true, json: async () => body};
  }));

  render(<PatientRepository/>);
  fireEvent.click(await screen.findByRole('button', {name: /Fictional Patient.*Linked patient account/i}));
  const button = await screen.findByRole('button', {name: /Fill blank contact fields in unsaved demographics form/i});
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
  await screen.findByText(/Copied 3 patient-reported contact field\(s\) into this UNSAVED draft/);

  expect((screen.getByLabelText('Street address 1') as HTMLInputElement).value).toBe('Previously reviewed address');
  expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Olathe');
  expect((screen.getByLabelText('Postal code') as HTMLInputElement).value).toBe('66062');
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('fictional@example.com');
  expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Fictional');
  expect((screen.getByLabelText('Birth date') as HTMLInputElement).value).toBe('');
  expect(calls.every(call => call.startsWith('GET '))).toBe(true);
});
