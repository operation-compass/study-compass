# New 3-check GAS integration contract (PR #27, draft only)

## Verified current source (2026-10-19)
Google Sheets `Study COMPASS｜問題DB MASTER v0.1`, tab `Web自動公開｜3段階監査ログ` currently has these 16 columns, in order:
`question_id,question_version,content_sha256,audit_1_accuracy,audit_1_evidence_url,audit_1_checked_at,audit_2_quality,audit_2_checked_at,audit_3_technical,audit_3_checked_at,risk_class,exception_reason,final_decision,last_reviewed_at,hash_version,independent_reviews_json`.

These existing 16 columns **do not contain** the new check records, evidence file path and hash, independently verified duplicate review flags, or a trusted per-question approval reference. Consequently legacy rows **MUST NOT** be translated into new PASS records.

## Proposed compatible extension (no edits to current sheet)
Keep `candidate.items` and `audit.records` exactly as the current authenticated GAS staging format, and extend the staged JSON bundle with a distinct `simple_checks.records` collection only after those records actually exist in a separate trusted review source. Old selectors continue to read `audit.records`, unchanged.

Each new record must contain:
- `id`, `version`, `question_sha256` (13-field v2 SHA), `risk` (LOW), `exception_reason` (empty), `publication_approved` (true), `approval_reference`.
- `accuracy`: `result`, `checked_at`, `reviewer`, `question_sha256`, `sources[]`, `evidence_file`, `evidence_sha256`.
- `quality`: same check metadata, plus `duplicate_reviewed`, `existing_web_reviewed`, `curriculum_reviewed` set true only after actual reviews.
- Full canonical MASTER ID inventory, evidence markdown files with real byte hashes, and **trusted approval registry** supplied independently by the authenticated workflow; do not trust values from candidate JSON alone.

## Integration boundary
`scripts/simple-three-check-gas-adapter.cjs` is read-only: it consumes the above JSON, independent inventory, artifacts and approvals, returning shadow results. It must not synthesize missing records, review identities, source verification or approvals.

**Not yet done**: obtaining/editing actual Apps Script project source, creating authenticated staging-side review records, deriving independent trusted approvals, switching the production selector, testing real staging deployment. Do not merge or enable the new gate until these have been verified.

## Safety
No additional GAS trigger; never modify MASTER columns/order. Reject missing review data. Preserve current strict production release path until shadow comparison and negative tests are accepted.
