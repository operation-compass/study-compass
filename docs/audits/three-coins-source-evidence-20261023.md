# Three-coins source-evidence register (2026-10-23)

**Status: SOURCE REFERENCE ONLY / NOT FORMAL INDEPENDENT REVIEW.** No reviewer PASS, release approval, or authorization is conferred by this document. Keep all three candidates `CHECK/FALSE`, `HOLD`; no production change.

| Question ID | Version | Answer | Public reference recorded in MASTER | Scope and unresolved review |
| --- | --- | --- | --- | --- |
| SC-SOC-HIS-WEB26-000001 | v0.1 | 和同開珎 | https://www.imes.boj.or.jp/cm/history/content/index.html | Issued 708, distinguish 富本銭; direct factual quotation, scope and curriculum still require authenticated independent review |
| SC-SOC-HIS-WEB26-000002 | v0.1 | 富本銭 | https://kunishitei.bunka.go.jp/heritage/detail/201/00012104 | Earlier than 和同開珎; verify exact source claim and archive evidence independently |
| SC-SOC-HIS-WEB26-000003 | v0.1 | 開元通宝 | https://www.imes.boj.or.jp/cm/history/content/index.html | Check source text describing the 唐貨幣 model independently |

## Evidence limitations and binding rules

- The identifiers and versions above were read from current `問題MASTER` rows 5210–5212 on 2026-10-23.
- The following hashes were computed from the currently read MASTER rows using the existing canonical `hashV2` field order (`id,subject,grade,unit_major,unit_minor,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation`) and `SHA-256(JSON.stringify(values))`. They are **content fingerprints, not verified review decisions**. Any future review or publication must recompute the hash from live MASTER at that time, and reject drift.

| Question ID | Version | SHA-256 (v2) |
| --- | --- | --- |
| SC-SOC-HIS-WEB26-000001 | v0.1 | `99efb7520f1f4502dccff5962b40cdb01d3236d4f45f37c238f13a6a908bb65d` |
| SC-SOC-HIS-WEB26-000002 | v0.1 | `9fef55d642106a0685e69ddbae6bbd0a2aa9770dabb41196ebde2e2c73bca063` |
| SC-SOC-HIS-WEB26-000003 | v0.1 | `a1f9b53ba6683eac6b6223f772fce39e0352add777a4c1725dbc10a9f7a4b81d` |
- Separate roles must supply verifiable reviewer identities, timestamps, substantive comments, distinct review artifacts, and the matching question ID/version/SHA.
- The master drift preview previously returned `unchanged=true`, `blockers=[]`, `release_authorized=false`, `production_permission=HOLD` as reported from a real GAS execution. That detects fixed snapshot drift, not formal approval.
- Still missing: authenticated independent accuracy, educational quality and technical review; live-mobile acceptance evidence; and separate, individual authorized release clearance.
- This document must never be consumed as an independent review PASS or an approval record.


## Independent review handoff — not yet performed

Each review must independently record: reviewer identity and role, UTC/JST checked time, question ID, version, current `hashV2`, specific evidence consulted, conclusion and any correction request. A reviewer must compare the live MASTER content to the SHA above **at review time**. Do not copy the PASS state from another question or another role.

### Accuracy reviewer (all three questions)
- 000001: Confirm issue year 708, what precisely is meant by "普及を進めた", and distinguish 富本銭 from any misleading "first Japanese coin" claim. Open the public reference and capture the precise supporting passage.
- 000002: Verify what the designated cultural-property source establishes about 飛鳥池遺跡, age, manufacturing, and whether the wording "7世紀後半" is directly evidenced.
- 000003: Confirm the museum's description of 開元通宝 as a model and distinguish that from later Chinese coins used as distractors.

### Quality reviewer (all three questions)
- Independently verify choice exclusivity and that all distractors are plausible but unambiguously incorrect.
- Check whether 000001 and 000002 are acceptable complementary questions rather than pedagogical duplicates, and compare all three against existing live MASTER/Web questions for semantic duplication.
- Validate middle-school curriculum fit, Japanese wording, furigana/accessibility requirements as applicable, and explanation sufficiency.

### Technical reviewer (all three questions)
- Recompute canonical `hashV2` against live MASTER, confirm `status=CHECK` and `publish_flag=FALSE`, and prove stable-ID uniqueness.
- Confirm staging and production parity without publication, representative mobile viewport grading, and existing progress/history integrity.
- Clearly mark simulated Chromium checks as simulations; real iPhone verification must be recorded separately if required by acceptance policy.

### Acceptance record — all remain open
| Evidence item | Status |
| --- | --- |
| Authenticated accuracy review, matching ID/version/SHA | PENDING |
| Authenticated quality review, matching ID/version/SHA | PENDING |
| Authenticated technical review, matching ID/version/SHA | PENDING |
| Real-mobile acceptance evidence | PENDING |
| Independently authenticated final release authorization, per ID | NOT GRANTED |

**Release rule:** A document, SHA match, technical test, source URL or chatbot-generated evaluation is not a substitute for a trusted reviewer or explicitly authorized release. Until complete, no READY, no approval row and no publication.
