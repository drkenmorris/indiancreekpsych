'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { careLevelLabels, maxCarePeriods, maxExpectedSessions, maxSessionRows, sessionFrequencies, sessionTypes, validCarePeriod, type CarePeriod, type ModalitySession } from '@/lib/emr/treatment-modality';

type Provider = { id: string; name: string; enrolled: boolean };
type CareRow = CarePeriod & { key: string };
type SessionRow = ModalitySession & { key: string };
const sessionCounts = Array.from({ length: maxExpectedSessions }, (_, index) => index + 1);

export default function ModalityTable({ patientId }: { patientId: string }) {
 const endpoint = '/api/emr/treatment-modality';
 const [rows, setRows] = useState<SessionRow[]>([]);
 const [careRows, setCareRows] = useState<CareRow[]>([]);
 const [providers, setProviders] = useState<Provider[]>([]);
 const [admin, setAdmin] = useState(false);
 const [userId, setUserId] = useState('');
 const [assigned, setAssigned] = useState('');
 const [candidate, setCandidate] = useState('');
 const [revision, setRevision] = useState(0);
 const [loaded, setLoaded] = useState(false);
 const [busy, setBusy] = useState(true);
 const [dirty, setDirty] = useState(false);
 const [status, setStatus] = useState('Loading planned sessions…');
 const available = providers.filter(provider => provider.enrolled);

 useEffect(() => {
  const controller = new AbortController();
  async function load() {
   try {
    const response = await fetch(endpoint + '?patient=' + encodeURIComponent(patientId), { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    if (controller.signal.aborted) return;
    setProviders(data.providers ?? []);
    setAdmin(data.admin);
    setUserId(data.userId);
    setAssigned(data.record?.assigned_provider_id ?? '');
    setRevision(data.record?.revision ?? 0);
    setRows((data.record?.sessions ?? []).map((session: ModalitySession) => ({ ...session, key: crypto.randomUUID() })));
    setCareRows((data.record?.care_periods ?? []).map((period: CarePeriod) => ({ ...period, key: crypto.randomUUID() })));
    setLoaded(true);
    setStatus('');
   } catch (error) {
    if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Modality is unavailable.');
   } finally {
    if (!controller.signal.aborted) setBusy(false);
   }
  }
  void load();
  return () => controller.abort();
 }, [patientId]);

 useEffect(() => {
  const warn = (event: BeforeUnloadEvent) => {
   if (dirty) event.preventDefault();
  };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [dirty]);

 async function post(body: object) {
  const response = await fetch(endpoint, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error);
  return data;
 }

 async function save(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setBusy(true);
  try {
   const data = await post({
    patientId, revision, assignedProviderId: assigned || null,
    carePeriods: careRows.map(({ level, agreement, startDate, endDate }) => ({ level, agreement, startDate, endDate })),
    sessions: rows.map(({ code, count, frequency, providerId }) => ({ code, count, frequency, providerId })),
   });
   setRevision(data.record.revision);
   setDirty(false);
   setStatus('Modality saved.');
  } catch (error) {
   setStatus(error instanceof Error ? error.message : 'Save could not be confirmed.');
  } finally {
   setBusy(false);
  }
 }

 async function addProvider() {
  setBusy(true);
  try {
   await post({ action: 'addProvider', providerId: candidate });
   setProviders(previous => previous.map(p => p.id === candidate ? { ...p, enrolled: true } : p));
   setCandidate('');
   setStatus('Provider added to the clinic roster.');
  } catch (error) {
   setStatus(error instanceof Error ? error.message : 'Provider could not be added.');
  } finally {
   setBusy(false);
  }
 }

 function update(key: string, patch: Partial<ModalitySession>) {
  setRows(previous => previous.map(row => row.key === key ? { ...row, ...patch } : row));
  setDirty(true);
 }

 function updateCare(key: string, patch: Partial<CarePeriod>) {
  setCareRows(previous => previous.map(row => row.key === key ? { ...row, ...patch } : row));
  setDirty(true);
 }

 function providerOptions(value: string) {
  return <>
   <option value="">Select provider</option>
   {value && !available.some(provider => provider.id === value) && <option value={value} disabled>Unavailable provider</option>}
   {available.map(provider => <option key={provider.id} value={provider.id}>{provider.name}{provider.id === userId ? ' (you)' : ''}</option>)}
  </>;
 }

 return <div data-modality-dirty={dirty || undefined}>
  <h1>Modality</h1>
  <p>Plan session types, expected attendance, and providers for this patient.</p>
  <p>Confirm coverage and provider eligibility for the patient’s plan. For technician-administered testing, select the responsible supervising clinician.</p>
  {!loaded && status && <p role="status">{status}</p>}
  {loaded && <>
   <form onSubmit={save}>
    <fieldset disabled={busy}>
     <legend>Planned sessions</legend>
     {admin && <label>Therapist assigned to this chart
      <select value={assigned} onChange={event => { setAssigned(event.target.value); setDirty(true); }}>
       {providerOptions(assigned)}
      </select>
     </label>}
     <div className="modalityTableScroll">
      <table className="modalityTable">
       <thead><tr>
        <th scope="col">Session type</th><th scope="col">CPT code</th>
        <th scope="col">Expected sessions</th><th scope="col">Frequency</th>
        <th scope="col">Assigned provider</th><th scope="col">Actions</th>
       </tr></thead>
       <tbody>
        {!rows.length && <tr><td colSpan={6}>No sessions planned.</td></tr>}
        {rows.map((row, index) => <tr key={row.key}>
         <td><select aria-label={'Session type ' + (index + 1)} required value={row.code}
          onChange={event => update(row.key, { code: event.target.value })}>
          <option value="">Select session type</option>
          {Object.entries(sessionTypes).map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
         </select></td>
         <td>{row.code || '—'}</td>
         <td><select aria-label={'Expected sessions ' + (index + 1)} required value={row.count || ''}
          onChange={event => update(row.key, { count: Number(event.target.value) })}>
          <option value="">Select count</option>
          {sessionCounts.map(count => <option key={count} value={count}>{count}</option>)}
         </select></td>
         <td><select aria-label={'Frequency ' + (index + 1)} required value={row.frequency}
          onChange={event => update(row.key, { frequency: event.target.value })}>
          <option value="">Select frequency</option>
          {Object.entries(sessionFrequencies).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
         </select></td>
         <td><select aria-label={'Assigned provider ' + (index + 1)} required value={row.providerId}
          onChange={event => update(row.key, { providerId: event.target.value })}>{providerOptions(row.providerId)}</select></td>
         <td><button type="button" aria-label={'Remove session ' + (index + 1)} onClick={() => {
          setRows(previous => previous.filter(session => session.key !== row.key));
          setDirty(true);
         }}>Remove</button></td>
        </tr>)}
       </tbody>
      </table>
     </div>
     <div className="treatmentActions">
      <button type="button" disabled={rows.length >= maxSessionRows} onClick={() => {
       setRows(previous => [...previous, { key: crypto.randomUUID(), code: '', count: 0, frequency: '', providerId: assigned || userId }]);
       setDirty(true);
      }}>Add session type</button>
     </div>
    </fieldset>
    <fieldset disabled={busy}>
     <legend>Recommended level of care</legend>
     {!careRows.length && <p>No care periods recorded.</p>}
     {careRows.map((row, index) => <fieldset key={row.key}>
      <legend>Care period {index + 1}</legend>
      <p>Choose one level for this period.</p>
      <div className="treatmentFields">
       {(Object.keys(careLevelLabels) as Array<keyof typeof careLevelLabels>).map(level => (
        <label className="treatmentCheck" key={level}>
         <input type="checkbox" checked={row.level === level}
          onChange={event => updateCare(row.key, { level: event.target.checked ? level : '' })} />
         {careLevelLabels[level]}
        </label>
       ))}
      </div>
      <div className="treatmentFields">
       <label>Patient agreement
        <select value={row.agreement === null ? '' : String(row.agreement)}
         onChange={event => updateCare(row.key, { agreement: event.target.value === '' ? null : event.target.value === 'true' })}>
         <option value="">Not recorded</option>
         <option value="true">Agrees</option>
         <option value="false">Does not agree</option>
        </select>
       </label>
       <label>Planned start date
        <input type="date" required max="9999-12-31" value={row.startDate}
         onChange={event => updateCare(row.key, { startDate: event.target.value })} />
       </label>
       <label>Planned end date
        <input type="date" min={row.startDate || undefined} max="9999-12-31" value={row.endDate}
         onChange={event => updateCare(row.key, { endDate: event.target.value })} />
       </label>
      </div>
      {row.startDate && row.endDate && row.endDate < row.startDate && <p role="alert">End date must be on or after the start date.</p>}
      <button type="button" aria-label={'Remove care period ' + (index + 1)} onClick={() => {
       setCareRows(previous => previous.filter(period => period.key !== row.key));
       setDirty(true);
      }}>Remove care period</button>
     </fieldset>)}
     <button type="button" disabled={careRows.length >= maxCarePeriods} onClick={() => {
      setCareRows(previous => [...previous, { key: crypto.randomUUID(), level: '', agreement: null, startDate: '', endDate: '' }]);
      setDirty(true);
     }}>Add care period</button>
    </fieldset>
    <button type="submit" disabled={busy || !dirty || careRows.some(period => !validCarePeriod(period)) ||
     rows.some(row => !row.code || !row.count || !row.frequency ||
      !available.some(provider => provider.id === row.providerId))}>Save Modality</button>
    {status && <p role="status">{status}</p>}
   </form>
   {admin && <details>
    <summary>Manage provider roster</summary>
    <fieldset disabled={busy}>
     <legend>Add a provider</legend>
     <label>Verified clinic staff account
      <select value={candidate} onChange={event => setCandidate(event.target.value)}>
       <option value="">Select staff account</option>
       {providers.filter(provider => !provider.enrolled).map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
      </select>
     </label>
     <button type="button" disabled={!candidate} onClick={() => void addProvider()}>Add to provider roster</button>
     {!providers.some(provider => !provider.enrolled) && <p>No additional verified staff accounts are available.</p>}
    </fieldset>
   </details>}
  </>}
 </div>;
}
