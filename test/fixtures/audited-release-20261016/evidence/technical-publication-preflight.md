# Publication preflight: two reviewed historical questions

Reviewer: codex-root-technical-20261016
Checked at: 2026-10-16T12:13:23.385Z
Decision: PASS for prepublication preparation; this is not a deployment receipt.

Scope: SC-SOC-HIS-GAP10-000001 and SC-SOC-HIS-GAP10-000005, version gap10-reviewed-v2. Accuracy and quality were performed by distinct agents; their signed-shape records and actual evidence file digests were checked. Current authenticated MASTER rows were reread and matched all 13 SHA-v2 fields and version.

Both HTML previews retain all prior 623 social questions in identical order and add exactly these two IDs. Existing total 2593 becomes 2595 only in isolated previews. Structure, known-withheld IDs, history and scoring/storage regressions passed.

Browser verification used scripts/build-reviewed-two-ui.cjs: it adds a local test entry selecting exact IDs and invokes the unchanged app start/render/reveal/scoring functions. It is not a release route and is not included in production HTML. Twenty-four combinations (two IDs × three modes × two HTML files × desktop1280/mobile390) passed. Questions, answers and corrected explanations were visible. All four mobile wrong-answer checks gave corrective feedback and the registered correct answer. A completed card recorded one known card separately from MCQ. No horizontal overflow was observed. See ui-mode-verification.json.

GitHub CI for code commit 2daaacdb14ae6a08573e3a842872f0658b8b5b9b:
- https://github.com/operation-compass/study-compass/actions/runs/38898891194 — success
- https://github.com/operation-compass/study-compass/actions/runs/38898887619 — success
The strict reporting checker now shares the selector's independent evidence and v2 hash rules. READY_FOR_REVIEW, PENDING, changed hashes and missing evidence remain blocked. Historical five-question HOLD tests were frozen as a historical fixture, so new live READY candidates do not invalidate the regression.

Live GAS was aligned with the tested raw-HTML/pinned-revision code; the actual no-delta staging run completed successfully at 20:10:02 JST. The existing single staging trigger was preserved. Transport of these newly READY records is the next operation, and its outcome must be recorded separately.

The four-state audit validation now matches current rulebook v2.0. READY_FOR_REVIEW is never treated as READY. After this exact preflight, the two version/hash-bound candidates may be recorded READY with LOW risk and no open prepublication exception.

Remaining rollout steps are operational receipts: real nonempty GAS staging, bounded release PR, main integration, Cloudflare deployment and actual production verification/recovery. A failure there stops the rollout and cannot be reported as publication success. No automatic merge is enabled. Those future receipts do not change this evidence's question content or claim a deployed result.

This file supersedes the PENDING preflight for the same two revised questions in technical-revised-two.md; that historical record remains intact. Other questions retain their prior decisions.
