# Indian Creek Psychological Services

Public website for **IndianCreekPsych.com**, deployed on Vercel.

## Current version
- Professional responsive landing page
- Counseling specialty sections
- Recovery, trauma, marriage/family, mood disorders, autism, and ADHD
- Crisis-resource footer
- No database dependency

## Planned additions
- Online appointment scheduling
- Secure client authentication
- Supabase-backed client data
- Assessments/questionnaires
- Online store
- Events/resources
- Secure client record access

## Development

```bash
npm install
npm run dev
```

Production builds use:

```bash
npm run build
```

## Rebuilding the clinic database

Use the SQL files in `supabase/migrations` in filename order against a fresh
Supabase project. Supabase provides the Auth schema and platform roles. The
early account, newsletter, scheduling, kiosk, and administrator-view
migrations establish the application tables expected by later changes.

Run `node --test tests/supabase-clean-replay.test.mjs` to check the entire
application migration sequence from an empty database with local equivalents
of the Supabase platform prerequisites. CI runs this check on every PR.

The hosted clinic was initialized before all schema changes were tracked in
Git, and its existing migration history uses some different timestamps.
Before applying this sequence to any existing project, reconcile its migration
history against the deployed schema. Use the full sequence for a fresh project.
