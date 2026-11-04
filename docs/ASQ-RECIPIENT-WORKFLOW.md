# ASQ / ASEQ named-recipient workflow

Owner request: one work order covering Student/Self, Parent and Teacher assignments to a named individual/email, a simplified recipient interface, and seven-question pages that save before advancing.

## Assignment identity

The Psychological test menu lists ASQ / ASEQ — Student / Self, ASQ / ASEQ — Parent and ASQ / ASEQ — Teacher as separate choices. Selecting a choice binds exactly one respondent role; there is no second respondent-version selector. New ASQ/ASEQ assignments require an explicit central patient UUID and one respondent role. The recipient's first name, last name and email identify the person answering; the central patient is the person the questionnaire concerns. Parent/teacher dates of birth are not collected in the patient DOB field. Non-ASQ assignment behavior, including DSM age/version checks, is retained. Older clients may still create untyped drafts during rolling deployment. They cannot be launched or emailed by the new workflow. Existing untyped ASQ assignments remain untyped; the system never guesses their respondent version and refuses to email them as a new typed form.

The patient, recipient, respondent role, questionnaire definition and hash are immutable. Each informant receives a separate assignment and response record, even for the same patient. A recipient can access only a sent, unexpired assignment addressed to their current verified Auth email with MFA. An assignment link is not a bearer credential. The account bound on first save cannot be replaced. The private ACL helper checks the current Auth email rather than trusting an editable profile or stale email claim. It grants no patient-chart access and no access to another informant's answers.

## Recipient experience and persistence

The invitation route renders only the assigned version, its named respondent, instructions, progress, Previous, Save progress and Save/Next or final Submit. It does not render clinician menus, form switching, combined results, student records or support tools. There are at most seven questions per page. No answers are preselected. Zero/Never is a valid recorded answer. Next requires the displayed questions to be answered and waits for server confirmation before changing page. A partial page can be saved explicitly. Failure retains the page/answers; competing saves return a conflict. Reopening restores saved answers and the next-page cursor. Submission requires all questions and locks the recipient record.

`asq_assignment_responses` holds the latest draft/submission; `asq_assignment_response_versions` retains immutable save history with actor/time. RLS separates recipients and limits clinician review to the assigning MFA administrator. Admin list progress reads status/count/revision metadata, not raw response sets. The review link exposes raw named-informant answers and the original definition to that authorized clinician. New submissions are not silently combined with legacy QA cases, scored, assigned a diagnosis or treated as signed clinical records.

Legacy administrator Student, Parent and Teacher forms also display seven-question pages. Their existing session-memory drafts, manual Save Workspace and scoring/narrative functions remain separate. The dedicated administrator recipient preview is fictional and does not write patient responses. It clearly distinguishes preview/session progress from central recipient saving.

## Source integrity

Question banks and scoring formulas are unchanged. The existing Likert UI's five choices (0–4) are preserved. New invitation definitions snapshot the displayed item IDs/text, response options, operational version and source-file hashes. Source hashes include each original bank, legacy form, response-option component and narrative engine. Canonical hashing survives JSONB object-key reordering. Every save validates IDs, values, page bounds, prior-page completion and immutable source binding. Old assignments retain their original definition rather than being rescored or relabeled under later wording. `node scripts/version-asq-recipient.mjs` updates source manifests after reviewed changes. Formal instrument permissions and psychometric validation are separate from software pagination tests.

## Live delivery gates

Existing secure email gates remain: provider configuration, verified sending domain, BAA confirmation and `PATIENT_TEST_INVITATIONS_ENABLED`. No verification email is sent by this release. `ASQ_RECIPIENT_RELEASE_APPROVED=true` is required for the ASQ recipient API, launch and Send Invitation. It defaults to disabled until the owner confirms instrument administration permissions/release. Do not infer clinical validity from this operational flag. Other instruments' release gates remain unchanged. No credentials, roles or MFA rules are altered.

The owner confirmed ownership or permission for all three versions and authorized individual assignments: one fixed version to one named recipient/email. Production recipient release was activated after that confirmation. Each additional version or recipient requires its own explicit assignment and send action. Do not claim a real emailed-recipient flow was exercised when only administrator preview, mocked API tests or rollback-only database probes were used.

## Verification

Tests cover seven-item windows/all roles, final partial windows, zero values, save failure/retry, partial-page save, prior-page restoration, respondent-only UI, named assignment fields, canonical hashes, server validation, email/MFA/expiry/owner isolation, patient identity immutability, independent informants, optimistic conflicts and locked completion. Existing DSM assignment, intake, EMR and ASQ persistence regressions remain in the release suite. Production evidence and operational readiness are recorded in the root workspace release report.
