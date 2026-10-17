# Dormant investor exercise route

Adds only `/api/omnicore-investor-demo/action` and self-contained server modules. No patient/database/scheduling/email integration. Existing OmniCore connector bytes and existing protection settings are unchanged.

The route is disabled by default (404), exact-host restricted, and requires a short activation window, signed per-run lease, test-bot credential, and separately authenticated witness. It uses the shipped connector for identity, input inspection/native firewall and selected outbound restrictions. Application authorization of the restricted dummy record is explicitly a separate result.

Inputs are bounded to dummy read/write/export operations, two record labels and two configured owner-controlled receiver origins. SQL-pattern and script-pattern text is inert and never executed. An independent witness reserves attempts, caps requests, prevents replay, and stores effect receipts plus dummy state using persistent SQLite. The controller/witness package is delivered separately and must be configured/rehearsed before activation. Optional default tools are disabled in the model runtime; models return action IDs only and never receive credentials.

## Required deployment configuration

Do not configure or activate this route as part of a code-only preview. A preview hostname always returns 404. Live release and activation are separate owner-reviewed steps.

- `OMNICORE_DEMO_UNTIL`: ISO time, future but no more than 16 minutes ahead when requests execute.
- `OMNICORE_DEMO_RUN_SECRET`, `OMNICORE_DEMO_BOT_SECRET`, `OMNICORE_DEMO_WITNESS_SECRET`: three independent 32-byte random hex secrets, shared only with their respective controller/witness components.
- `OMNICORE_DEMO_APPROVED_ORIGIN`, `OMNICORE_DEMO_UNAPPROVED_ORIGIN`: distinct exact HTTPS origins for owner-controlled receivers. Never a third-party destination. Both receivers must use the same persistent witness ledger.
- Existing `OMNICORE_SITE_ID`, `OMNICORE_INGEST_KEY`: reused for awaited real OmniCore ingest delivery.

The route returns bounded, sanitized connector events only to a caller with a valid exercise lease. Ingest delivery is reported separately from actual hosted analysis/storage. No criterion colors or desired allow/block results are supplied. A no-effect conclusion additionally requires independent receiver health and receipt checks in the controller.

## Validation and limits

Clinic typecheck, 11 relevant Vitest checks (including disabled activation and preview rejection), and production build passed for this change. Local controller verification uses the exact connector and real HTTPS requests, but a local telemetry collector and scripted choices. No live clinic run, model-driven exercise, hosted-analysis acceptance or investor video is claimed. Model connection and separately hosted persistent witness remain prerequisites.

Production credentials, environment variables, schema, policy activation and clinical operations remain untouched. This is a narrowly scoped test facility, not evidence of general malicious-intent recognition, all-attack protection or a reproduction of the original Hugging Face agents.
