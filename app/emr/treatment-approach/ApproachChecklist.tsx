'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { approachGroups, maxApproachLabel, maxApproaches } from '@/lib/emr/treatment-approaches';

const endpoint = '/api/emr/treatment-modality';

export default function ApproachChecklist({ patientId }: { patientId: string }) {
 const [selected, setSelected] = useState<string[]>([]);
 const [custom, setCustom] = useState<string[]>([]);
 const [label, setLabel] = useState('');
 const [revision, setRevision] = useState(0);
 const [loaded, setLoaded] = useState(false);
 const [busy, setBusy] = useState(false);
 const [dirty, setDirty] = useState(false);
 const [status, setStatus] = useState('Loading treatment approaches…');

 useEffect(() => {
  const controller = new AbortController();
  async function load() {
   try {
    const query = new URLSearchParams({ patient: patientId, section: 'approach' });
    const response = await fetch(endpoint + '?' + query, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    if (controller.signal.aborted) return;
    setSelected(data.approaches);
    setCustom(data.options);
    setRevision(data.revision);
    setLoaded(true);
    setStatus('');
   } catch (error) {
    if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Approach could not be loaded.');
   }
  }
  void load();
  return () => controller.abort();
 }, [patientId]);

 useEffect(() => {
  function warn(event: BeforeUnloadEvent) {
   if (dirty) event.preventDefault();
  }
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [dirty]);

 async function submit(action: 'saveApproaches' | 'addApproach') {
  setBusy(true);
  try {
   const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, patientId, revision, approaches: selected, label: label.trim() }),
   });
   const data = await response.json();
   if (!response.ok) throw Error(data.error);
   if (action === 'addApproach') {
    setCustom(previous => [...previous, data.label].sort((a, b) => a.localeCompare(b)));
    setLabel('');
    setStatus('Added to the shared checklist. Select it and save to use it in this plan.');
   } else {
    setRevision(data.revision);
    setDirty(false);
    setStatus('Treatment approaches saved.');
   }
  } catch (error) {
   setStatus(error instanceof Error ? error.message : 'The change could not be saved.');
  } finally {
   setBusy(false);
  }
 }

 function renderGroup(group: string, options: string[]) {
  return <fieldset key={group}>
   <legend>{group}</legend>
   <div className="treatmentFields">
    {options.map(option => <label className="treatmentCheck" key={option}>
     <input type="checkbox" checked={selected.includes(option)}
      disabled={!selected.includes(option) && selected.length >= maxApproaches}
      onChange={event => {
       setSelected(event.target.checked ? [...selected, option] : selected.filter(value => value !== option));
       setDirty(true);
      }} />
     {option}
    </label>)}
   </div>
  </fieldset>;
 }

 const known = [...Object.values(approachGroups).flat(), ...custom];
 const additional = [...new Set([...custom, ...selected.filter(value => !known.includes(value))])];

 return <div data-plan-dirty={dirty || undefined}>
  <h1>Approach</h1>
  <p>Select the methods planned for this patient.</p>
  {loaded && <>
   <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (dirty) void submit('saveApproaches'); }}>
    <fieldset disabled={busy}>
     <legend>Treatment approaches</legend>
     {Object.entries(approachGroups).map(([group, options]) => renderGroup(group, options))}
     {additional.length > 0 && renderGroup('Additional approaches', additional)}
     <button type="submit" disabled={!dirty}>Save approaches</button>
    </fieldset>
   </form>
   <form onSubmit={event => { event.preventDefault(); if (label.trim()) void submit('addApproach'); }}>
    <fieldset disabled={busy}>
     <legend>Add to the shared checklist</legend>
     <p>Use a general approach name. This option is visible to other clinicians.</p>
     <label>Approach name
      <input value={label} maxLength={maxApproachLabel} onChange={event => setLabel(event.target.value)} required />
     </label>
     <button type="submit" disabled={!label.trim()}>Add approach</button>
    </fieldset>
   </form>
  </>}
  {status && <p role="status">{status}</p>}
 </div>;
}
