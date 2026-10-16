# Study COMPASS — authenticated Sheets → GitHub staging

GAS stages only on feature/drive-approval-gate-20261016. It never changes MASTER cells, production HTML, main or Cloudflare.

## Current v2 policy

Follow audits/three-stage-publishing-policy.md and the Drive rulebook v2.0 addendum. Per-question human approval and MASTER PUBLIC/TRUE are not mandatory when independent accuracy, quality and technical reviews PASS for the exact version/SHA, risk is LOW and no exception remains. CHECK may remain CHECK. Legacy PUBLIC rows still undergo the strict release selector.

HOLD = incomplete; READY_FOR_REVIEW = review only; REJECTED = excluded; READY = fully attested candidate. Never convert READY_FOR_REVIEW to READY automatically. Three PASS labels without separate identities, dates and evidence digests are insufficient. New questions require SHA v2 including grade and units.

## Operation

1. Use the existing Apps Script project for the Study COMPASS source. Verify code against StudyCompassSync.gs. Keep credentials in Script Properties, never the sheet/chat/repository.
2. Run studyPreview for a read-only inventory. Eligible PUBLIC legacy rows are not necessarily releasable READY records.
3. Run studyStageApproved to compare both production HTML banks at one pinned main commit and stage up to five audited unpublished/changed candidates atomically.
4. Inspect feature CI and the draft release PR. Zero candidates leaves staging/production unchanged. Errors stay visible.
5. Verify deployment and published Web behavior separately; a staging commit or READY decision is not publication success.

HTML already exceeds 1 MB. GAS uses the raw Contents media type rather than the empty large-file Base64 field. Failed reads, missing content, mismatched mirrors, invalid evidence JSON or changed hashes stop processing.

An existing time-based studyStageApproved trigger was confirmed on 2026-10-16. Do not rerun the installer to repeat setup; check studyTriggerStatus. The separate ChatGPT audit does not invoke GAS automatically.

Repository code and live GAS were aligned and a real no-delta stage run succeeded on 2026-10-16. Full unattended release remains unproven until a nonempty real PR, deployment, published modes and recovery are verified.
