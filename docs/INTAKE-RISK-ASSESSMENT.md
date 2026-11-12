# Patient intake risk screening and EMR source view

The Safety and risk screening section uses five exclusive Yes/No checkbox pairs, followed by the two existing narrative questions. Registered patient intake, staff preview, and office intake share the same component. No response is preselected; clicking an already-selected response clears it. Existing saved `Unsure` responses remain visible as historical statements and are never converted to `No`.

The original seven string keys are unchanged. `lib/patient/risk-screening.ts` defines their labels, ordering, and the source-to-chart whitelist. No new risk score, triage rule, emergency-monitoring service or clinician conclusion is introduced.

In the connected full EMR, Patient Assessments -> Risk Assessment loads `/api/emr/risk-assessment?patient=<central UUID>`. This read-only view uses the central chart's explicit `account_id` and the account's submitted `patient_intakes` record. It reads the saved source directly, so answers are available when the submitted questionnaire is opened from the chart without a separate import or a second copy that can drift. Patient-reported answers and source version/submission date remain visible. Opening or refreshing the view does not save a clinician assessment or alter the original intake.

The existing clinic administrator/MFA and caller RLS checks remain required. Only the seven risk fields and source provenance leave the API. Drafts are not shown as submitted reports. Unlinked charts and missing submitted intakes display an explicit source-unavailable explanation; missing responses do not become negative findings. There is no name/email matching and no new access grant. Office/kiosk forms use the same controls, but an unlinked kiosk submission is not automatically attributed to a central patient account.

The browser checks the returned patient UUID and a render generation before displaying the source. Switching charts or leaving the risk section invalidates outstanding requests, including an A -> B -> A sequence. Source strings are rendered with DOM text nodes or textarea values, never interpreted as markup. A Refresh patient self-assessment button reloads the source without changing its answers.

Verification uses fictional data only. Tests cover exclusivity/clearing, legacy uncertainty, registered/preview/office parity, save/reload, seven-field filtering, explicit account association, missing/draft/error states, source HTML safety and chart-switch races.
