# Central patient repository and DSM record connection

Owner authorization: use Indian Creek website accounts and a central patient-record repository shared with the connected EMR. This supersedes the prior deferral of this DSM/identity connection. It does not establish diagnostic validity or enable patient self-administration of the prototype.

## Source of record

The connected EMR entry is `/emr` on the clinic website. It uses the same Supabase project, login, verified email, MFA and protected role checks as the website. There is no new password database, credential migration or cross-domain token handoff.

`clinical_patients` is the stable patient registry. Existing patient profiles are linked by immutable account UUID; future patient registrations create the identity row in the same transaction. No intake answers are copied during identity backfill. EMR-created patients without portal accounts use a UUID in the same registry and are explicitly labeled unlinked; names/emails are never used to guess an account association. Linking previously unregistered patients to newly created portal accounts requires an explicit identity-review workflow; that reconciliation is not automated.

The selected patient’s existing intake is read from `patient_intakes` using `account_id`. The connected directory displays only contact-source fields and intake status, with the protected intake review available separately. Patient-reported source information and clinician-reviewed demographics are kept distinct. Demographic updates use optimistic revisions and append history. The initials+MMDDYYYY display code is not an authoritative unique key; UUIDs bind actual records.

`dsm_records` permanently binds one assessment to a central patient UUID and creating authorized account. `dsm_record_versions` retains each saved state, original generated report, instrument/rule manifests, content hash, actor and time. Another provider does not gain access by knowing the patient’s name or record URL. Current DSM access is limited to the owning MFA-verified clinic administrator; additional care-team/provider capabilities are not automatically granted.

## Save and resume

- Start an assessment from the central patient record, or explicitly associate an existing run with a selected patient after verifying the association.
- A connected run saves changes as new revisions and has an explicit Save button. A full page reload can restore the saved assessment from its opaque record ID.
- The assessment is gated until the authenticated snapshot has loaded, preventing blank forms from overwriting saved answers.
- Concurrent saves require the expected revision. A conflict retains local answers and requires an explicit reload/review; it does not silently overwrite another session.
- Earlier saved revisions are read-only. Older instrument versions remain retained and are not automatically rescored under a new source version.
- Unlinked previews remain transient. Assessment responses are never placed in URL parameters, localStorage or sessionStorage.
- Source manifests and the original response map are retained. Server-side report generation uses a fresh isolated store per request, validates Tier 2 answers/definitions/findings against the original bank, and recomputes the report. Client-provided summary claims are not used as authoritative conclusions.
- Known patient DOBs are checked against selected respondent versions before saving completed Tier 1 reports.

## Access and boundaries

New tables have RLS and explicit grants. Anonymous access is revoked. Central identity/contact data is shared with existing MFA-verified clinic administrators and the patient’s own protected account; DSM responses remain owner-scoped, and patients cannot read clinician working drafts through these endpoints. The API also verifies confirmed identity/MFA/role, same-origin mutations, payload bounds, patient binding, content integrity and compatible source versions. Service-role secrets are not used in the browser or needed for these operations.

The legacy separately hosted EMR workflow prototype is retained and clearly linked as a prototype. Its browser-carried sample charts and provider registrations are not silently imported or relabeled as central clinical records. Other legacy modules (treatment planning, progress notes, billing and scheduling prototypes) have not all been migrated to the central data model by this DSM/identity release. The connected patient/assessment workspace is the new authenticated entry; this document must not be read as a claim that every legacy EMR module is now a live clinical system.

Patient self-administration, invitations, automatic diagnosis assignment, claim submission and legal clinical signatures remain outside this change. Existing questionnaire readiness flags remain unchanged. The original DSM prototype still requires clinical review/validation as described in DSM-VALIDATION-PLAN.md.

## Verification evidence

Tests cover central identity creation for existing/new patient accounts, patient foreign keys, demographic history and stale-write protection, owner isolation, patient and AAL1/anonymous denial, immutable snapshots, source validation, parallel-request isolation, typed response replay, age/version mismatch, load-before-render, manual save, revision conflicts, explicit reload and read-only history.

Live schema checks verify RLS and anonymous denial. A transaction-only live database probe creates a fictional patient/assessment, tests save and stale-revision rejection, then rolls back without retaining records. This is database-policy verification, not an actual user login/MFA test. Any authenticated production browser verification is recorded separately in the release evidence.
