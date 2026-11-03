# Adult differential follow-up prototype

Original Indian Creek question bank v0.1.0. Administrator-only, fictional validation. This is not an APA assessment measure, licensed DSM criteria implementation, exhaustive diagnostic interview, validated diagnostic model, or patient-facing clinical release.

## Coverage and sequence

- All 19 adult Tier 1 domains retain their selected Tier 2 modules. All selected Tier 2 modules must be completed before deeper follow-up.
- Tier 3: 65 original candidate-area prompts distributed across the 19 selected domains. Tier 2 exact answers remain available; nonzero item counts are routing context, not diagnostic scores. A Tier 1-selected domain with all-zero Tier 2 answers still gets reconciliation rather than silent exclusion.
- Tier 4: one branch-specific distinguishing prompt for each Yes, Unsure, or private Tier 3 response, plus domain-level course, duration, onset, impairment, medical, substance/medication, and overlap questions. No is not an exclusion.
- Tier 5: branch-specific further differentiation plus timeline, professional-context review, and collateral-information availability. Selected for multiple endorsed possibilities, uncertainty/private answers, lack of an endorsed Tier 3 pattern, conflicting follow-up, possible contributors/overlap, or no reported impairment. A simple coherent response pattern can skip this tier. Completion never means that clinical uncertainty is resolved.
- Maximum all-positive path: 65 Tier 3 prompts, 198 Tier 4 prompts, 122 Tier 5 prompts. Typical paths show only the selected domains and branches.
- The final page prepares identical independent user/provider/EMR copies of the recorded evidence. No identity mapping, delivery, or EMR write is enabled.

## Interpretation limits

Candidate labels identify areas to discuss; they do not mean diagnostic criteria have been met. More questions do not establish sensitivity, specificity, calibration, validity, or diagnostic certainty. No probability, diagnostic code, criterion count, or automated final diagnosis is generated. Negative prompts never establish absence. Uncertain/private responses are preserved. Mixed Tier 3/Tier 4 evidence is labeled.

Coverage is deliberately broad rather than exhaustive: several branches combine related conditions, and personality patterns do not yet differentiate every named personality disorder. Subtypes, specifiers, criterion-level thresholds and exclusions require a separate clinician-reviewed and appropriately permitted implementation. Any clinical use requires question/rule review, permissions review where applicable, age-appropriate development, validation, and the separately deferred authenticated clinical infrastructure. The adult questions must not be reused as youth questions.

Tier 1 and Tier 2 legacy clinical scoring is unchanged. New routing uses response patterns only to choose interview prompts, not to establish diagnoses. All work remains session-memory-only; full refresh clears answers. Source attempt, full Tier 2 records, original follow-up bank version/hash, and upstream answers bind follow-up completion. Editing earlier evidence invalidates dependent completion.

## Reference boundaries

APA's public assessment guidance says screening measures support clinical decision-making and should not be the sole basis of diagnosis. Its official adult cross-cutting measure has a different domain structure; this original 19-domain workflow must not be represented as that official instrument.

- https://www.psychiatry.org/psychiatrists/practice/dsm/educational-resources/assessment-measures
- https://www.nimh.nih.gov/health/topics
- https://medlineplus.gov/mentaldisorders.html

These sources support assessment context and review boundaries; they do not validate this question bank or routing. No proprietary DSM criteria text or differential-diagnosis decision trees are reproduced.

## Verification

Dedicated tests exercise every candidate on an all-positive path, single-branch Tier 5 skipping, uncertain/private/negative responses, conflicting evidence, source-edit invalidation, malformed data, direct-URL prerequisites, identical isolated report copies, and actual rendered Tier 3→4→5→summary transitions. Native browser QA also verified the Next.js transitions using a temporary localhost-only fictional access fixture, removed before release. Production auth and MFA files are unchanged.
