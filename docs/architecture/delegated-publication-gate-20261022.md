# Study COMPASS — Delegated publication policy (2026-10-22)

## Objective
Do not require the user to approve every question. A one-time, scope-limited delegation can allow a trusted workflow to publish genuinely reviewed questions. Exception cases remain HOLD.

## Current observed constraints
- The existing five PUBLIC/TRUE master questions have an explicit approval note: 本番反映は行わない. Do not lift that prohibition automatically.
- Web自動公開｜新3チェック記録 currently contains a header but no actual audit records.
- Existing staging READY and PASS claims do not prove production permission.
- main automatic publication configuration has enabled=true; PR #34 protection is still a draft and not active on main.
- The current signature validator has not been connected to a real trusted exporter or production permission authority.

## Recommended release contract
1. Scope-limited delegation policy: enabled, subjects, batch maximum 5, authorized role, start/end, version, revocation. Initial user approval required for the policy, not every item.
2. Independent content-quality and technical audit, with authentic evidence bound to ID/version/hash.
3. At release time, independently authenticate the CURRENT master status/flag, approval notes, policy version, content hash, and revocation state. Stale snapshots and forbidden rows are HOLD.
4. Sign the exact release snapshot using a credential held by a trusted publisher, and pin verification key independently in trusted execution environment. A signature does NOT itself imply publication approval.
5. Stage only qualified deltas, preserve historical questions and learning records, run pre-deploy checks, verify post-deploy routes and answers.

## Implementation order
A. Identify currently running GAS source, credentials authority, triggers, and existing staging pipeline. Do not duplicate triggers.
B. Define and obtain initial authorization for scoped policy. Existing explicit no-publish notes remain binding.
C. Connect a trusted Drive snapshot and revocation check to the release controller, with test cases for valid, invalid, expired and forbidden records.
D. Test one to five newly authorized questions in isolated staging, then verify answers and unchanged local history.
E. Enable automatic releases only after successful live evidence and rollback validation.

## Do not
- Do not infer production consent from READY, APPROVED, three PASS claims, or an authentication marker written in data.
- Do not publish any of the five explicitly forbidden existing rows without new explicit permission.
- Do not merge PR #34 as a whole to main or change GAS, schedules, production deployment, or master data as part of this design note.

Success criterion: authenticated delegated policy plus verified problem data leads to a controlled publication and real web/learning-history checks, without per-question user intervention.
