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
  expect(screen.getAllByText('Fictional trial medication').length).toBeGreaterThan(0);
  expect(screen.getByText('Fictional patient-reported medical history')).toBeTruthy();
  expect(screen.getByText(/Fictional reported rash/)).toBeTruthy();
  expect(screen.getByText(/has not been independently verified/)).toBeTruthy();
  expect((screen.getByLabelText('Street address 1') as HTMLInputElement).value).toBe('Reviewed address');
  expect(await screen.findByRole('button',{name:'Prepare review draft'})).toBeTruthy();
  expect(calls.every(call=>call.startsWith('GET ')||call==='POST /api/emr/workflow')).toBe(true);
});


test('rendered general directory contact summary does not mix trauma, insurance or legal source content', async () => {
  const patient = {
    id: '00000000-0000-0000-0000-000000000321',
    account_id: '00000000-0000-0000-0000-000000000322',
    revision: 1,
    demographics: {first_name: 'Boundary',last_name: 'Patient'},
    profiles: null,
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url === '/api/emr/patients'
      ? {patients: [patient]}
      : url.startsWith('/api/emr/dsm-records?')
        ? {records: []}
        : {patients: [patient],intake:{
            status:'submitted',updated_at:'2026-11-09T00:00:00Z',
            answers:{
              address:'Fictional reviewed-source street',
              email:'fictional@example.invalid',
              trauma_history:'SECRET TRAUMA NARRATIVE',
              legal_history:'SECRET LEGAL HISTORY',
              insurance_member_id:'SECRET INSURANCE ID',
              unknown_future_clinical_field:'SECRET NEW CLINICAL DATA',
            },
          }},
  })));
  render(<PatientRepository/>);
  fireEvent.click(await screen.findByRole('button',{name:/Boundary Patient.*Linked patient account/i}));
  const heading = await screen.findByText('Unverified patient-reported contact details');
  const displayedContact = heading.nextElementSibling;
  expect(displayedContact?.tagName).toBe('DL');
  expect(displayedContact?.textContent).toContain('Fictional reviewed-source street');
  expect(displayedContact?.textContent).toContain('fictional@example.invalid');
  expect(displayedContact?.textContent).not.toContain('SECRET');
  expect(displayedContact?.querySelectorAll('dt')).toHaveLength(2);
});

test('rendered directory blocks visually spoofed patient-contact statements without a clinical write', async () => {
  const patient = {
    id: '00000000-0000-0000-0000-000000000325',
    account_id: '00000000-0000-0000-0000-000000000326',
    revision: 1,
    demographics: {first_name: 'Boundary', last_name: 'Example'},
    profiles: null,
  };
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    requests.push((init?.method ?? 'GET') + ' ' + url);
    return {
      ok: true,
      json: async () => url === '/api/emr/patients'
        ? {patients: [patient]}
        : url.startsWith('/api/emr/dsm-records?')
          ? {records: []}
          : {patients: [patient], intake: {
              status: 'submitted', updated_at: '2026-11-09T00:00:00Z',
              answers: {
                full_name: 'Fictional Example',
                address: '100 Fictional Street\\nPRIVATE_TRAUMA_DETAIL',
                phone: '555-0100\\u202EPRIVATE_MEDICATION',
                email: ' patient@example.invalid ',
              },
            }},
    };
  }));
  render(<PatientRepository/>);
  fireEvent.click(await screen.findByRole('button', {name: /Boundary Example.*Linked patient account/i}));
  const heading = await screen.findByText('Unverified patient-reported contact details');
  const contact = heading.nextElementSibling;
  expect(contact?.textContent).toContain('Fictional Example');
  expect(contact?.textContent).toContain('patient@example.invalid');
  expect(contact?.textContent).not.toContain('PRIVATE');
  expect(contact?.textContent).not.toContain('100 Fictional Street');
  expect(contact?.textContent).not.toContain('555-0100');
  expect(contact?.querySelectorAll('dt')).toHaveLength(2);
  expect(requests.every(request => request.startsWith('GET '))).toBe(true);
});
