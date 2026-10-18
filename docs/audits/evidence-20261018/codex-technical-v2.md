# Independent technical audit — PENDING

- ID: SC-SOC-HIS-GAP10-000008
- Version: gap10-codex-proof-v2
- Question SHA256 v2: e290ab71fa4993d56292b34c85c347b2189dc7bc38d2c957d4b68a1c7c455a59
- reviewer_id: /root/codex_technical_v2
- checked_at: 2026-10-18T01:43:25Z
- Result: PENDING. This is an independent technical review; no other role's review or judgment was read. No READY, authenticated staging, deployment or production approval is asserted.

## Confirmed independently

Read AGENTS.md, the three operating policies and codex-proof-candidate.json. Candidate has 13 complete SHA-v2 fields, grade 中1, subject 社会, history major, 鎌倉・統治 minor, 4 unique nonempty choices and answer matching exactly one choice. digest(q,v2Fields) equals the recorded SHA. ID/version match the values above. Grade suitability and factual content belong to independent content roles and are not certified here.

Read the local adapter change: explicit 鎌倉・統治 → 中世. Calling actual applyToWeb with this candidate preserves topic_name 鎌倉・統治 and creates unit 歴史・中世. Existing ID collision absent. On current-main-legacy-study.html snapshot, SOCIAL 628 becomes 629, with deepStrictEqual of all 628 preceding objects (order and all fields). Only one new item, within maximum 5. In-memory review calculation only: the supplied candidate ID list is not a real READY selection or staging attestation.

Executed actual submitChoice function from that snapshot in Node VM with candidate options: outcomes correct, incorrect, incorrect, incorrect. This verifies scoring logic with the candidate data, not browser operation.

Ran test-adapt-drive-to-web.cjs, check-history.cjs, test-select-ready-candidates.cjs and test-real-new-ready-release.cjs successfully. These cover safe append, HOLD exclusion, maximum-five and duplicate protection, unsupported unit and invalid grade rejection, preservation of existing questions, legacy history display retention, mismatched SHA and nonindependent review blocking. They are local checks, not GitHub CI.

Both root HTML files have identical local blob 793af430002c15bdf077e5bd9d0b478436555226 and SOCIAL 623. They are old mirrors, not the current 628 baseline. Adapter and scoring checks also pass against both old HTMLs; no root HTML was written.

## Pending / limits

Parent corrected the snapshot's extra terminal newline. Re-read current-main-legacy-study.html and independently recomputed exact Git blob e42968612079326902eeb3730b245df40fa84698; SOCIAL=628. This now matches the supplied main ac1be611c0da43261e1fbcad624ccf7312b55ddd baseline blob. Total 2598 and current-main index/legacy exact identity are not independently established here. The initial discrepancy was resolved before this evidence revision.

Candidate review-only local preview browser checks for all 3 modes and narrow/mobile layout have not been performed; real browser scoring, persisted history and reload retention remain PENDING. Local history unit checks do not establish full user interface persistence. Candidate-bound successful CI not verified, and mapping is not proven integrated into main. Current GitHub main public configuration and activation approval were not independently fetched; local enabled=true is not evidence of current remote state.

No Sheets, GAS, schedules, GitHub or publishing settings were modified. No paid API used. To resume: obtain byte-verifiable current HTML pair, construct explicitly REVIEW ONLY preview outside root HTML, exercise candidate across 3 modes and mobile via CUA, verify history persistence and candidate-bound CI. Then reissue this technical record with actual results. Until those checks complete this record cannot be a PASS input to READY.
