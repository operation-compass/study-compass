# Drive approval gate — implementation staging (2026-10-16)

This branch is **not production-wired**. No existing live question is deleted or re-approved.

## Proposed authoritative flow
1. Read Study COMPASS's Google Sheet by authenticated service identity, never by an unauthenticated browser.
2. Keep the original rows untouched. Distinguish questions, vocabulary source records, generated questions, passages, set records, and LISTEN production drafts.
3. Audit editorial content and references. **A software check must not change CHECK to PUBLIC**.
4. Export a trusted approval snapshot with id, status=PUBLIC, publish_flag=TRUE, named human reviewer, approval date, and SHA-256 content hash.
5. Export only eligible candidate questions in the defined schema, preserving stable IDs and learning history.
6. Run `node scripts/check-drive-approval.cjs candidate.json approvals.json`. Non-zero result must block deployment. In future, verify trusted provenance of the approval snapshot and snapshot freshness in CI before this check.
7. Reconcile candidate IDs with all study routes and the previous production manifest. Never make an empty unreviewed candidate the replacement for live content.
8. Deploy only after all checks pass; verify rendered routes and actual live IDs. On failure keep the last good version and record the exception in Drive.

## Remaining work before enabling automation
- Establish authenticated Drive export (service account/credentials and access), credentials should live in GitHub secrets and never in committed data.
- Define review provenance and trusted signature / exporter identity. The validator alone cannot prove that a manifest genuinely came from Drive.
- Map current embedded arrays in index.html and legacy-study.html to independent, release-controlled data.
- Add approved release snapshot and CI blocking step once verified; no automatic overwrite of existing 2603 live questions.
- Smoke-test all question types and release/rollback on a nonproduction environment before merge.
- Keep the existing 2-hour ChatGPT audit schedule separate from GitHub's deploy trigger.

Hash inputs: `id,subject,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation` encoded as JSON string array in this precise order, then SHA-256 hex.

Example command: `node scripts/check-drive-approval.cjs data/release/candidate.json data/release/approval-manifest.json`
