# Patient registration and intake release

This change depends on the calendar menu branch (PR #3). It has not been applied to production.

## Behavior

New registrations choose Guest or Patient. An immutable server-side signup request is captured; a confirmed email permits the requested Patient activation. No public administrator signup exists. Later user metadata changes cannot grant Patient access. Existing Guests are not automatically promoted.

Patient intake and patient booking require a verified email and an AAL2 session. Password sign-in is followed by either authenticator TOTP or Supabase WebAuthn MFA. The device option is a second factor, not standalone passwordless sign-in. Existing administrator scheduling access remains unchanged; intake review requires administrator identity and AAL2.

Patients save private drafts and explicitly submit. Submitted answers are read-only, with corrections directed to the practice. Administrators can review the latest 100 submitted forms. No clinical details are emailed. Clinical record import/linking and a broader clinical records module are outside this change.

Fields cover demographics/contact preferences, insurance identifiers and provider-services number, plan type and policyholder, deductible/met/copay/coinsurance with unknown choices, and counseling concerns/duration/goals. Benefit amounts are patient-reported, not verified benefits.

## Validation

- 10 PGlite tests execute the actual migration for email verification, immutable signup intent, no admin escalation, MFA enforcement, ownership, direct-API validation, optimistic versioning and submitted-record protection.
- 18 scheduling SQL regression tests.
- 26 Vitest checks including intake confirmation, drafts, failure preservation, security-load failure and existing-factor enforcement.
- TypeScript and production build.

These are automated local checks, not proof of a live provider flow.

## Release gates

1. Confirm Supabase Auth email confirmation is enabled and callback URLs include intended production origins. Autoconfirmed email is incompatible with the requested verification requirement.
2. Confirm TOTP and WebAuthn MFA enrollment/verification support and configuration. Complete real browser enrollment/challenge on the intended domain; preview device credentials use a different relying party. Do not advertise passwordless sign-in.
3. Apply `20260927024746_patient_registration_intake.sql` only with production authorization and deploy the matching code. Earlier code will encounter new patient-booking MFA restrictions once the migration is applied; coordinate the rollout.
4. Test a fresh Guest and Patient signup, email link, security setup/challenge, draft/reload/submit, own-only data access, administrator secure review, and existing scheduling. Use synthetic data only for verification.
5. Do not roll back only the application after patient data is collected. Preserve submitted data and coordinate policy rollback; do not drop intake tables as a rollback shortcut.

No Supabase settings, production migrations or production deployment were changed while preparing this branch. Separate patient approval emails, notification/reminder delivery, identity-verified factor recovery tooling, and live provider verification are not implemented by this change.
