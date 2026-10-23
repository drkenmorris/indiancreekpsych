# Paubox Email API - isolated server module

This module has no HTTP route, no UI, and no caller. It does not send any mail merely because it is deployed. It does **not** replace Supabase Auth confirmation email or enable patient invitations.

## Existing variables
- `PAUBOX_API_KEY`: Sensitive; production only. Never expose as `NEXT_PUBLIC_*`.
- `PAUBOX_SENDING_DOMAIN`: `indiancreekpsych.com`
- `PAUBOX_API_USERNAME`: **unused by this modern endpoint**. Leave untouched pending review.

## Explicit, fail-closed test configuration (not yet set)
- `PAUBOX_TEST_SEND_ENABLED=true` - default is OFF; enable only for a controlled test
- `PAUBOX_TEST_ALLOWED_RECIPIENTS=owned-inbox@example.com` - exact addresses, comma separated
- `PAUBOX_TEST_FROM_ADDRESS=test@indiancreekpsych.com` - must use a Paubox-authorized sender

A future administrator-only authenticated caller can invoke `sendControlledPauboxTest(recipient)`. Do not create a public unauthenticated route. The module uses a fixed synthetic body and refuses recipients outside the explicit allowlist.

## Production prerequisites
1. Confirm Paubox account shows domain Verified; SPF and DKIM are correct.
2. Confirm the BAA is effective for Indian Creek Psychological Services.
3. Confirm the inbox owner authorized a synthetic test.
4. Review code and add tests for 403/401 responses, timeouts, and allowlist enforcement.
5. Only then add a protected admin-triggered test path, without enabling patient invitations.

This code is intentionally staged on a feature branch for review. No email has been sent.

Email API request format: `POST https://api.paubox.com/v1/email/messages`, header `Authorization: Token token=<API_KEY>`, JSON `data.message`.
