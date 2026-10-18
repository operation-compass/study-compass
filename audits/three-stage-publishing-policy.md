# Study COMPASS: three-stage audit and incremental release policy v2.0

Canonical policy: Google Drive rulebook v2.0 addendum dated 2026-10-16. Google Sheets problem MASTER is the sole question source. This supersedes this file's former human-approval-only draft. Preserve existing questions, IDs, order, learning history, COMPASS LISTEN, Operation COMPASS templates and scheduled tasks.

## Independent stages for the exact question version and SHA

1. Accuracy: directly inspect official/primary text supporting wording, answer, alternatives and explanation. Record source URL, reviewer identity and actual check time. Bibliographic listings or search snippets alone are insufficient.
2. Educational quality: independently check grade, four unique alternatives and one correct answer, clarity, explanation, semantic duplicates, curriculum, difficulty and rights. Repeating one AI judgment three times is not independent review.
3. Prepublication technical checks: verify ID/version/SHA v2, new versus existing IDs, complete metadata, both HTML banks, all three modes, scoring, narrow-screen layout, existing questions/order/history, at most five changed questions and successful CI. Bind evidence to the same question hash.

Require three distinct review identities and existing evidence artifacts with SHA256 digests. Any PENDING/FAIL, missing source, changed hash/version, open exception or unassessed risk remains HOLD. Never fabricate human approval. MASTER CHECK/FALSE may remain unchanged when the independent audit gate completes; PUBLIC/TRUE alone is insufficient.

## Audit states

| State | Meaning |
|---|---|
| HOLD | Required check/evidence incomplete or unresolved exception. Never release. |
| READY_FOR_REVIEW | Review candidate only; never an alias for READY. |
| REJECTED | Excluded from publication. |
| READY | Same ID/version/hash has three independent PASS records, valid dates, LOW risk and no exception. Eligible for bounded preparation. |

The audit log permits all four states. Adding READY to validation changes no existing values and waives no selector checks. GAS and the selector require READY exactly.

## Release and verification

Authenticated Sheets read → GAS atomic staging → strict evidence selection → maximum five-question delta against current main → both HTML banks and CI → main integration → Cloudflare deployment → published page/answer/explanation verification. READY and successful publication are separate facts. Deployment checks cannot be claimed before deployment. Stop on failure and preserve or restore the prior production state.

The user explicitly authorized bounded automatic merge/deployment on 2026-10-17; follow current main configuration and its activation approval evidence. Initial real releases of five questions have been verified through PRs #13, #19 and #21. Do not restore the obsolete human-approval-only restriction merely because MASTER remains CHECK/FALSE. Zero READY is a successful no-op; malformed input is an error. Actual production failure recovery and the updated scheduled task completing independent unattended audits remain unproven; do not claim those are complete.

Use the existing GAS staging trigger; never register duplicates. ChatGPT scheduled audits and GAS are separate execution mechanisms. Preserve unrelated tasks and templates.
