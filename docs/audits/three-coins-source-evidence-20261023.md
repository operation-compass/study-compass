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
