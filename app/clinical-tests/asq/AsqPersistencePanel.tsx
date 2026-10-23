"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { asqDocuments, currentAsqStudentProfile, importAsqSnapshot, readAsqSnapshot } from "@/lib/clinical-tests/asq-persistence";

type SavedCase = { id: string; label: string; revision: number; updated_at: string };
type StoredSnapshot = { payload: Record<string, string>; revision: number };

/** Administrator QA only. All DB operations are also checked by Supabase RLS + aal2. */
export default function AsqPersistencePanel({ onRestored }: { onRestored: () => void }) {
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [caseId, setCaseId] = useState("");
  const [newCaseLabel, setNewCaseLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [restoredCaseId, setRestoredCaseId] = useState("");

  async function refreshCases() {
    const supabase = createClient();
    const { data, error: listError } = await supabase.from("asq_cases")
      .select("id,label,revision,updated_at")
      .order("updated_at", { ascending: false }).limit(50);
    if (listError) throw new Error("Secure ASQ records could not be loaded: " + listError.message);
    setCases((data ?? []) as SavedCase[]);
    setLoaded(true);
  }

  useEffect(() => {
    void refreshCases().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Secure records are not available.");
      setLoaded(true);
    });
  }, []);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!window.confirm("Create a new synthetic ASQ case? The current in-memory ASQ workspace will be cleared after the new case is created. Save existing work first.")) return;
    setBusy(true); setStatus(""); setError("");
    try {
      const label = newCaseLabel.trim();
      if (!label || label.length > 140) throw new Error("Enter a short fictional case label.");
      const supabase = createClient();
      const { data, error: createError } = await supabase.from("asq_cases")
        .insert({ label, synthetic_only: true, student_profile: currentAsqStudentProfile() })
        .select("id").single();
      if (createError || !data) throw new Error("Unable to create a secure ASQ record: " + (createError?.message ?? "Unknown error"));
      setCaseId(data.id);
      setRestoredCaseId("");
      importAsqSnapshot({});
      onRestored();
      setNewCaseLabel("");
      await refreshCases();
      setStatus("New empty synthetic case created. Complete QA questionnaires, then choose Save Workspace.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create record."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!caseId || busy) return;
    if (restoredCaseId && restoredCaseId !== caseId) {
      setError("You selected another case. Restore that case before saving, or clear the open ASQ workspace to begin a new synthetic record.");
      return;
    }
    if (!window.confirm("Save the currently open synthetic ASQ workspace to the selected case? Check the case label before confirming.")) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const snapshot = readAsqSnapshot();
      const bytes = JSON.stringify(snapshot).length;
      if (Object.keys(snapshot).length === 0) throw new Error("There is no ASQ workspace state to save.");
      if (bytes > 1900000) throw new Error("This record is too large for a single save. Remove unnecessary synthetic incident details before retrying.");

      const supabase = createClient();
      const documents = asqDocuments(snapshot);
      const { data: revisionData, error: revisionError } = await supabase.from("asq_snapshots")
        .select("revision").eq("case_id", caseId).maybeSingle();
      if (revisionError) throw new Error("Cannot verify current ASQ revision.");
      const expectedRevision = revisionData?.revision ?? 0;
      const { data: savedRevision, error: saveError } = await supabase.rpc("asq_save_qa_workspace", {
        p_case_id: caseId,
        p_expected_revision: expectedRevision,
        p_snapshot: snapshot,
        p_documents: documents,
        p_student_profile: currentAsqStudentProfile(),
      });
      if (saveError || typeof savedRevision !== "number")
        throw new Error("Atomic ASQ save failed. No partial write was committed. " + (saveError?.message ?? "Retry after restoring the selected case."));
      setRestoredCaseId(caseId);
      await refreshCases();
      setStatus("Saved to Supabase: all " + documents.length + " ASQ sections plus the full workspace snapshot (revision " + savedRevision + ").");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ASQ data. Do not close this page until you verify the record.");
    } finally { setBusy(false); }
  }

  async function restore() {
    if (!caseId || busy) return;
    if (!window.confirm("Replace all currently open ASQ/ASEQ test answers with this saved synthetic record? Unsaved changes will be lost.")) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const supabase = createClient();
      const { data, error: readError } = await supabase.from("asq_snapshots")
        .select("payload,revision").eq("case_id",caseId).maybeSingle();
      if (readError) throw new Error("The saved record could not be loaded: " + readError.message);
      if (!data) throw new Error("This record has not been saved yet. Complete a questionnaire and choose Save Workspace first.");
      const snapshot = data as StoredSnapshot;
      if (!snapshot.payload || typeof snapshot.payload !== "object" || Array.isArray(snapshot.payload)) throw new Error("Stored record format is invalid.");
      importAsqSnapshot(snapshot.payload);
      setRestoredCaseId(caseId);
      onRestored();
      setStatus("Restored saved ASQ/ASEQ workspace (revision " + snapshot.revision + "). Switch between the sections above to review responses.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to restore ASQ record."); }
    finally { setBusy(false); }
  }

  return (
    <section className="asqPersistencePanel" aria-label="Persistent ASQ test records">
      <div className="asqPersistenceHead">
        <div>
          <p className="eyebrow">Secure Supabase records · Administrator QA</p>
          <h2>ASQ / ASEQ Save &amp; Restore</h2>
          <p>Keep synthetic Student, Parent, Teacher, demographics, results, narratives, and incident records between visits. This testing workspace is not approved for real patient information.</p>
        </div>
      </div>
      <div className="asqPersistenceControls">
        <p role="status"><strong>QA workspace:</strong> {caseId ? (cases.find(c=>c.id===caseId)?.label ?? "Selected synthetic record") : "No case selected"}. {restoredCaseId && restoredCaseId===caseId ? "Workspace linked to this case." : "Restore the selected case before editing existing work."}</p>
        <label>Saved synthetic case
          <select value={caseId} disabled={busy || !loaded} onChange={e=>{setCaseId(e.target.value);setStatus("");setError("");}}>
            <option value="">Select a saved case</option>
            {cases.map(c=><option key={c.id} value={c.id}>{c.label} · {new Date(c.updated_at).toLocaleDateString()}</option>)}
          </select>
        </label>
        <button type="button" disabled={!caseId || busy} onClick={()=>void save()}>Save Workspace to Supabase</button>
        <button type="button" className="asqRestoreButton" disabled={!caseId || busy} onClick={()=>void restore()}>Restore Saved Workspace</button>
      </div>
      <form className="asqPersistenceNew" onSubmit={e=>void createCase(e)}>
        <label>New fictional case name
          <input value={newCaseLabel} onChange={e=>setNewCaseLabel(e.target.value)} maxLength={140} required
            placeholder="e.g., Synthetic Student A — October QA" disabled={busy}/>
        </label>
        <button type="submit" disabled={busy||!newCaseLabel.trim()}>Create Synthetic Record</button>
      </form>
      <p className="asqPersistenceHelp">Changes are saved to the database <strong>only when you select Save Workspace</strong>. Finish typing in a question field before saving. Saving preserves current ASQ memory keys, while restoring replaces only ASQ data—not other psychological tests.</p>
      {status&&<p className="asqPersistenceStatus" role="status">{status}</p>}
      {error&&<p className="asqPersistenceError" role="alert">{error}</p>}
    </section>
  );
}
