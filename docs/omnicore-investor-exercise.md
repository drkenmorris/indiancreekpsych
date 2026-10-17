# Permanent investor enforcement test facility

The owner has authorized permanent availability of the synthetic test facility on indiancreekpsych.com and www.indiancreekpsych.com. The investor dashboard includes a bottom menu item, Enforcement test, opening `/explore?stage=exercise` with a 12-minute duration and a 36-request cap selected. Starting a run remains an authenticated, explicit dashboard action.

## Availability and run authorization

`OMNICORE_DEMO_ENABLED=true` enables the facility without an activation expiry. `false` is an explicit off switch. If omitted, the prior short-window `OMNICORE_DEMO_UNTIL` mode remains supported and fails closed on expired or excessive windows. Production and preview configuration must remain separate; clinic preview hostnames always return 404.

Permanent availability does not create an unlimited run lease. Each run requires a signed lease of at most 16 minutes, the existing bot and witness credentials, persistent attempt reservations, replay prevention, request limits, and a durable Stop record. Unsigned, expired, or stopped operations cannot produce a dummy effect. The dashboard permits runs of 2, 12, or 15 minutes and at most 36 requests; the aggregate model spending limit remains in effect.

The route has no patient/database/scheduling/email imports. Inputs remain fixed dummy read/write/export operations and inert detector-pattern text. The approved and unapproved receiver origins are distinct owner-controlled HTTPS aliases of the same durable private Blob ledger. Both receivers require server-only witness authentication and deployment-protection authorization. Existing OmniCore connector bytes and clinical protection settings are unchanged.

## Configuration

Both projects use `OMNICORE_DEMO_ENABLED=true` and matching, separate RUN_SECRET, BOT_SECRET, WITNESS_SECRET, APPROVED_ORIGIN, UNAPPROVED_ORIGIN and WITNESS_BYPASS values under the OMNICORE_DEMO prefix. Secrets are provider-managed and never returned to the browser. The clinic also uses HOSTED_WITNESS=true and its existing OmniCore site identity and ingest configuration.

The public discovery manifest publishes only the nine marked synthetic capabilities. Actual operations require a short signed lease. Existing selected OmniCore identity, input inspection and outbound policy decisions are distinguished from application authorization denials. Reports preserve discovery, action, connector evidence, independent receipts, and inconclusive outcomes.

This facility is an incident-inspired dummy-resource demonstration, not an unrestricted exploit system or proof of all-attack protection. Completed evidence is retained across runs. A future run is not started merely by enabling the facility or opening its menu.
