# Adjacent-hour scheduling release

This change is prepared against Indian Creek `main` at `a11e2cd50b82bbaf7bfd3604b1f6b14667134033`.

## Behavior

- Save or edit office hours for every weekday, including Saturday, with confirmation beside the form and an immediate availability refresh.
- Optionally reserve a starting hour within each day's office hours. This is a practice reservation, not a patient appointment. Edit the rule to move it; candidate openings move automatically.
- Each reserved hour and each booked appointment offers only starts one hour before and after it, within office hours, notice/advance limits, and blackout periods. Booking an offered hour extends the available edge. A 50-minute session still uses hourly start spacing.
- A day with neither a reservation nor a booking has no patient openings. Changing a reservation never deletes actual appointments; existing appointments remain anchors.
- Administrators can book for an existing Patient account or enter an established patient's name without creating a website account. Named appointments without an account are administrator-only under existing RLS.
- Single, weekly, and every-other-week bookings are supported, with an explicit end date up to one year. Repeating bookings preserve practice-local time through daylight saving changes. A conflict rolls back the entire series.
- Patients cannot bypass the adjacency rule with a direct insert, access other patients' bookings, or self-promote. Existing Guest-only registration is unchanged.

## Evidence

The existing production database accepted a Saturday 09:00–17:00 rule in a rolled-back authenticated-admin transaction. The old frontend did not refresh patient openings after adding hours and displayed errors only at the top of the page. This change addresses both the feedback and refresh paths; the user's exact browser failure was not independently reproduced.

Local verification: 12 PostgreSQL-runtime tests and 7 endpoint/component tests pass, along with the Next.js production build and TypeScript checks. Synthetic data only. Live schema inspection found zero overlapping booked appointments and zero Patient accounts at inspection time. No live scheduling migration or real appointments have been created by this change.

## Coordinated deployment

1. Review and approve the migration and code together. The migration immediately changes availability, so this is a production behavior change.
2. Apply `supabase/migrations/20260926154213_adjacent_patient_scheduling.sql` to project `ufyopuunkprfpcprfngk` through the migration workflow. Apply before deploying the new page, which selects the new `patient_name` column. The old UI remains compatible with the additive columns, although it cannot set reserved starting hours.
3. Deploy the approved code commit to Vercel for `indiancreekpsych.com`.
4. In an authenticated administrator browser, save/edit Saturday hours and choose a reserved starting hour. Confirm the displayed hours and the offered starts. Use test accounts only in a non-production environment for booking-flow tests.
5. Verify the database migration, RLS, and function permissions remain as reviewed. Do not broaden grants or disable role protections.

The migration adds a no-overlap exclusion constraint. If live data develops conflicts before deployment, the migration must stop; do not delete or silently change existing appointments.

The standard production migration ledger has to record this change. Do not execute the SQL as an untracked ad hoc schema update.
