# Connected five-test administration

CSEQ, SRRCI-X, RTAFI, RDII Form A and the four active RVTI domains use the existing named-recipient assignment system. Administrators select an accessible central patient record and name the individual who will answer. The patient UUID, recipient identity, questionnaire snapshot and snapshot hash cannot change after creation. The questionnaire requests no demographic entries. ASQ/ASEQ and DSM retain their existing independent versioned workflows.

## Timing and delivery semantics

For **new invitations for these five tests**, the observable timing anchor is the database's transition to `sent`, immediately after Paubox confirms provider acceptance. The database sets `sent_at = now()` and `expires_at = sent_at + interval '14 days'`. Draft age consumes none of that administration window. Provider acceptance is not evidence of inbox delivery, human receipt, or opening. There is no delivery-receipt webhook in the current system; therefore this release cannot claim a window measured from confirmed inbox receipt. The recipient sees the exact Central Time deadline. If delivery is delayed, the office must create a new assignment. Already-sent assignments and ASQ/DSM deadlines are unchanged.

At `now() >= expires_at`, recipient source and response reads and writes are denied by server checks and database row-level policies/RPC checks. The UI also disables saving and submitting. A page opened earlier cannot extend its authorization. Assigning clinicians retain read access for review. Existing invitations are not silently extended. A provider acceptance followed by a failed status update is surfaced for office reconciliation, and the API does not claim successful sending.

## Persistence and permissions

`connected_assignment_responses` stores one independent record per assignment with an authenticated respondent UUID, typed answer values, page, revision, completeness, submission time and identity confirmation. Saves use optimistic revisions, a row lock, sequential-page validation and full response validation. Submitted answers are locked. `connected_assignment_response_versions` preserves immutable save history. Recipients must have a currently verified Auth email matching the assignment and MFA assurance level 2. JWT email text alone cannot authorize access. Only the assigning MFA clinician can review the response/history through the clinical report route. Clients receive no central chart or other recipient data.

## Scoring and reports

The original source engines are called unchanged. The source manifest records SHA-256 digests of original item/scoring/type/narrative source files; `node scripts/version-connected-tests.mjs --check` detects drift. Every assignment snapshot includes that provenance digest. Source mismatch fails closed rather than silently rescoring old responses under a new definition. A future engine release must archive/route the prior engine before changing this version.

Only fully submitted responses are scored. Reports include results, scale direction, completeness, response-style cautions, limitations, therapist discussion material, source identity, and every recorded response. Partial records are explicitly unscored. The browser Print / Save as PDF action exports one test report with its appendix; printing is local and sends no results by email.

Known source issues are disclosed: CSEQ pools mixed-direction content in its global composite, so that composite is withheld; forced choices are retained but not scored by its engine. RTAFI has inconsistent item-key and composite-label directions, so composites and categorical severity are withheld from the clinical presentation while domain source-keyed scores and response content remain available for careful review. RDII T-like transforms are display-only, not norms, and are omitted. SRRCI-X and RVTI single-person reports establish no partner agreement or dyadic compatibility. No new norms, validation, diagnosis, or treatment prescriptions are invented.

## Navigation and synthetic verification

All five old questionnaire entry routes redirect to the new administrator preview; recipients enter only through their fixed assignment. Preview progress stays in the open page and cannot submit patient records. CogSwitch is absent from catalogs and assignment choices, and its former route returns 404. Its archived source is retained for history.

Synthetic tests cover all five banks, seven-question pagination, answer scales, navigation/resume, failed saves, source integrity, adapter/original-score agreement, database RLS, actor isolation, draft/send timing, strict expiry boundaries, concurrent revision conflict, immutable submission/history, and ASQ/ASEQ regressions. No actual patient invitation is sent during verification.
