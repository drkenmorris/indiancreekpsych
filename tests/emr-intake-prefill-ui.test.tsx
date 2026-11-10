import React from 'react';
import {afterEach, expect, test, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import PatientRepository from '@/app/emr/PatientRepository';
import {emptyMedication, MEDICATION_ENTRIES_KEY} from '@/lib/patient/medications';
import {emptyMedicalSubstance, MEDICAL_SUBSTANCE_KEY} from '@/lib/patient/medical-substance';

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
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  await screen.findByText(/Copied 3 patient-reported contact field\(s\) into this UNSAVED draft/);

  expect((screen.getByLabelText('Street address 1') as HTMLInputElement).value).toBe('Previously reviewed address');
  expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Olathe');
  expect((screen.getByLabelText('Postal code') as HTMLInputElement).value).toBe('66062');
  expect((screen.getByLabelText(/^Email/i) as HTMLInputElement).value).toBe('fictional@example.com');
  expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Fictional');
  expect((screen.getByLabelText('Birth date') as HTMLInputElement).value).toBe('');
  expect(calls.every(call => call.startsWith('GET '))).toBe(true);
});

test('linked intake medication and medical history are available for read-only clinical review without changing the chart', async () => {
  const patient = {
    id: '00000000-0000-0000-0000-000000000301',
    account_id: '00000000-0000-0000-0000-000000000302',
    revision: 2,
    demographics: {first_name: 'Sample', last_name: 'Person', address1: 'Reviewed address'},
    profiles: null,
  };
  const medication = {...emptyMedication(),medication:'Fictional trial medication',status:'Current'};
  const history = emptyMedicalSubstance();
  history.notes.medical_notes = 'Fictional patient-reported medical history';
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push((init?.method ?? 'GET') + ' ' + url);
    if(url==='/api/emr/workflow'){
      const request=JSON.parse(String(init?.body??'{}'));
      if(request.method!=='GET'||!request.path?.startsWith('/api/chart?patient='))throw Error('Unexpected write from read-only reconciliation preview.');
      return {ok:true,json:async()=>({value:{records:[]},revision:1})};
    }
    const body = url === '/api/emr/patients'
      ? {patients: [patient]}
      : url.startsWith('/api/emr/dsm-records?')
        ? {records: []}
        : {patients: [patient], intake: {
            status: 'submitted', updated_at: '2026-11-09T00:00:00Z',
            answers: {
              [MEDICATION_ENTRIES_KEY]: JSON.stringify([medication]),
              [MEDICAL_SUBSTANCE_KEY]: JSON.stringify(history),
              medication_allergy_status: 'Medication allergies reported',
              medication_allergy_notes: 'Fictional reported rash',
            },
          }};
    return {ok: true, json: async () => body};
  }));
  render(<PatientRepository/>);
  fireEvent.click(await screen.findByRole('button', {name: /Sample Person.*Linked patient account/i}));
  const disclosure = await screen.findByText(/Patient-reported medication, allergy, and medical\/substance history/);
  fireEvent.click(disclosure);
  expect(screen.getByText('Fictional trial medication')).toBeTruthy();
  expect(screen.getByText('Fictional patient-reported medical history')).toBeTruthy();
  expect(screen.getByText(/Fictional reported rash/)).toBeTruthy();
  expect(screen.getByText(/has not been independently verified/)).toBeTruthy();
  expect((screen.getByLabelText('Street address 1') as HTMLInputElement).value).toBe('Reviewed address');
  expect(await screen.findByRole('button',{name:'Prepare review draft'})).toBeTruthy();
  expect(calls.every(call=>call.startsWith('GET ')||call==='POST /api/emr/workflow')).toBe(true);
});
