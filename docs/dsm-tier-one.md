# Adult 19-domain Tier 1 screening — original prototype v1.0.0

Owner requested a complete first-tier screen covering the existing 19 domains, with only indicated areas proceeding to Tier 2. This release replaces the active Level 1 UI; old imported source remains archived and unused. It does not insert screening into patient intake or connect results to patient records.

The original 57 domain questions and 3 independent safety questions are in `lib/clinical-tests/dsm/tier-one-definition.json`. This is NOT the APA DSM-5-TR Level 1 instrument. APA describes an adult instrument with 13 domains, rather than this custom 19-domain organization: https://www.psychiatry.org/psychiatrists/practice/dsm/educational-resources/assessment-measures . No APA questions or diagnostic criteria are reproduced. No validation, sensitivity, specificity, diagnostic cutoff or completeness of disorder detection is claimed. Clinical content and routing require owner/clinical review before patient use. Separate developmental/language/cultural review is needed for youth and informant versions.

## Workflow and rules

1. Confirm adult self-report scope, answer safety questions, then review all 19 domains. Manual Next avoids unexpected auto-advance. No answers are preselected. Section navigation permits returning to any question. All60 responses must be recorded, including explicit Unsure/private responses, before a Tier 2 plan is created.
2. Each domain has three brief original questions. Any “Yes, currently” or “Yes, in the past” selects that domain for follow-up. Past concerns deliberately remain eligible: the clinician distinguishes resolved history, recurrence and current need. No three-to-six-month duration rule or distress score suppresses follow-up; Tier 2 gathers details. This is a broad triage rule, not a DSM diagnostic threshold.
3. Unsure and Prefer to discuss privately mark clinician review. They never become negative responses or silently count as completed clinical assessment. If another item in that same domain is Yes, the domain still proceeds to Tier 2 and every private/uncertain response is retained in its reasons and independent review list.
4. A fully answered all-No domain displays “No concern reported on these items,” never “condition ruled out.” No overall numeric or diagnostic score is created. Clinicians may consider additional evaluation independent of this screen.
5. Any Yes in the separate safety check immediately displays direct-review guidance, independent of domain routing, and without waiting for completion. Unsure/private safety responses display a review message. This screen is not a suicide or violence risk assessment, cannot determine safety and does not notify staff. Actual patient use requires a separately designed response/monitoring workflow.
6. The completed review lists domain status, exact triggering answers and only selected Tier 2 links. The old unrestricted dropdown is removed. The client wrapper prevents opening an unselected Tier 2 by URL. Existing Tier 2 modules remain prototypes; their content/scoring is unchanged and is not clinically validated by this release.

## State and provenance

Drafts use the existing memory-only administrator QA store under dsm_tier1_draft_v1; completed compatibility handoff uses asq_level1_payload because existing Tier 2 modules consume that key. No localStorage/sessionStorage, answer URL parameters, server response table, downloads, or EMR transfer is introduced. A full reload/tab close clears the session. SPA navigation returns to the same draft. Edits immediately invalidate completed routing and require preparing a new plan. Clear requires a browser confirmation.

Handoff retains instrument ID, definition/routing versions, canonical SHA256 of the JSON definition, completion timestamp, all answers, adult confirmation, safety flags, domain reasons/status, routedDomains and reviewDomains. The hash covers text, response choices, instructions and rule version. The reader verifies version/hash/allowed answers, requires completion, and recomputes routing rather than trusting supplied route arrays. This is application provenance, not a clinical signature or tamper-proof server record. New definition content requires a version/hash change; historical records are not rewritten.

The existing server-side patientAccess(true,...) gate remains intact. Synthetic-only administrator access remains; no patient assignment, database policy, auth/MFA, intake/legal form or provider permissions changed. Do not interpret a client route gate as an authorization control.

## Validation

Tests cover all19 current/past routes, all-No, missing, unsure/private, safety independence, invalid answers, hash consistency, forged/stale handoffs, actual60-response wizard completion, selected-only links, SPA return, edit invalidation and direct unselected-route rejection. Typecheck and production build are release requirements. Real patient testing and EMR/intake transfer remain deferred.


## Youth versions and initial appropriateness selection — November 2, 2026

The entry page now asks the age group and who is answering. Adult self-report remains18+; adolescent self-report covers11–17; parent/guardian report covers children6–17, with separate6–10/11–17 session metadata. Unsupported under6,6–10 self-report and adult caregiver combinations show a clinician-led assessment message rather than opening an unsuitable version. Age ranges are design choices informed by the APA's corresponding public age groupings, not validation of these original questions. No APA item text is used.

Each original youth definition contains57domain questions plus3safety questions. School, home, play and developmental framing replace adult-only work and adult sexual-function/personality labels. Private-body well-being, body boundaries and developing coping patterns are support domains; they do not assign adult sexual or personality diagnoses or infer abuse. Caregivers answer only observations/what the child shared. “Not observed / do not know” is review-needed, never negative. A caregiver report cannot replace direct confidential clinical discussion with the child. No privacy/access-rights or mandatory-reporting conclusions are automated.

All current/past concerns still prepare domain-specific follow-up and unknown/private responses still require review. Youth handoffs identify the original instrument ID/version/hash, respondent, patient age band, population confirmation and exact questions/answers. Adolescent and parent definitions have distinct immutable hashes. Adult definition/hash remains unchanged. Existing adult drafts remain readable.

Draft and completed session keys are separated by version/respondent/age band. Changing version clears the active adult compatibility bridge and unmounts the previous questionnaire. Returning restores only that version's own draft/result. Adult selected Tier2 links restore the adult-only bridge; youth handoffs never enter it, and default adult handoff readers reject youth IDs/hashes. These in-memory separations are workflow controls in one fictional administrator session, not authenticated respondent confidentiality or multi-patient isolation.

Youth completed reviews retain selected areas but do not open the adult Tier2 instruments. Developing and reviewing age-appropriate youth Tier2 questionnaires is the next phase. No patient intake embedding, authenticated clinical persistence or EMR transfer is introduced. Full refresh/tab close clears state.
