# Independent technical audit v3 — FAIL: chapter routing defect

ID: SC-SOC-HIS-GAP10-000008
Version: gap10-codex-proof-v3
reviewer_id: /root/codex_technical_v2
checked_at: 2026-10-18T01:45:07Z
Question SHA256 v2: b6cbeeb897cc79b2322fef9cca12b43aed23f3172457799ce8f6ca697fcd3b34
Result: FAIL

## Directly verified

Candidate v3 JSON read independently, v2Fields digest recomputed and exact SHA verified. Metadata: 社会/中1/歴史/鎌倉・統治/4択. Four distinct options 六波羅探題, 鎮西探題, 政所, 評定衆; correct_answer equals exactly one choice. No factual or educational role conclusion is imported.

GitHub connector fetch_file for each of index.html and legacy-study.html, ref ac1be611c0da43261e1fbcad624ccf7312b55ddd, returned sha e42968612079326902eeb3730b245df40fa84698. Local current-main-legacy-study.html bytes independently produce the same Git blob. Parsed bank sizes via Node VM: SOCIAL 628, WORDS 900, ENGLISH_GRAMMAR 213, JAPANESE 326, MATH 307, SCIENCE 224, total 2598. Identical upstream blob proves both current HTML bodies equal.

Actual applyToWeb adapter uses explicit 鎌倉・統治 → 中世 while preserving detailed topic_name. Candidate ID absent from 628 existing social records. Candidate append yields 629; deepStrictEqual confirms all 628 preceding records unchanged in content and order. Delta one ≤ five. Since both upstream HTMLs are byte-identical, same adapter input yields the same output. This is review-only in-memory calculation, not selection of a real READY record.

Actual snapshot submitChoice executed in Node VM on candidate's four choices. Outcomes: correct, incorrect, incorrect, incorrect. These are logic checks, not browser clicks. Local adapter/history/selector/new-question-release checks previously executed in this reviewer session passed; no paid AI/API or live publication invoked.

## Isolated preview and actual browser attempts

Prepared outputs/codex-proof-technical-preview/ from verified current-main snapshot and exact v3 candidate. Both copied HTMLs have REVIEW ONLY v3 banner. Entry points test-mcq.html, test-question.html, test-flashcard.html call unchanged app start(false,[candidate ID]) after setting the mode. Local history key is isolated as study-compass-codex-review-only-history-v3. Root HTML unchanged. Assets and worker.js copied, but worker.js is not executed by this simple local server: worker runtime/CSS is not represented by the basic HTML preview.

Started serve.cjs on 127.0.0.1:8788 (Node exec session 95115). GET /test-mcq.html returned HTTP 200 and REVIEW ONLY v3 banner. Preview URL: http://127.0.0.1:8788/test-mcq.html (and test-question.html/test-flashcard.html).

Actual CUA attempts: cua.getState() returned apps:[], browsers:[]. cua.createBrowserTab('iab','about:blank',{visible:true}) returned Browser is not available: iab. cua.createBrowserTab('chrome','about:blank',{sessionName:'🔎 技術監査'}) returned Browser is not available: chrome. Thus this agent cannot take browser screenshots or manipulate the runtime. Parent has offered to act solely as operator and share raw evidence; this reviewer will evaluate it independently. Other roles' judgments/evidence remain unread.

## Remaining

3-mode visible behavior, 390px/mobile layout, real correct/incorrect interaction, and persistent history after reload await operator evidence. Direct GitHub connector fetch_commit_workflow_runs for head 8feb2913a87f0e92121e8df82960c2ecaf820b98 independently returned run 39087519650, Verify automatic publication safety (offline), completed/success. This proves mapping-PR safety CI, not candidate publication CI. Candidate-bound publication CI belongs to later prepublication checks; no such CI or READY/publication is claimed here. Current result remains PENDING until practical checks are evidenced.

## Preview harness repair

Parent operator reported ReferenceError DAY is not defined on finishDefault after a real incorrect-answer click. This was caused by this reviewer's KEY-declaration replacement removing the comma-declared DAY=86400000 constant. It was a preview harness defect, not a production defect. Restored DAY in all five copied HTMLs. Verified full byte comparison: reverting only SOCIAL array, REVIEW ONLY banner and isolated KEY makes copied index.html exactly equal to verified baseline. No other app code changes remain. Operator was instructed to reload the same URLs and repeat checks; erroneous pre-repair behavior is not used to assess production.

## Independently reproduced routing defect

Parent operator observed history hub total increment but medieval chapter/kamakura counts did not increment. Direct code review and Node VM reproduction confirm: topicOf(q) returns q.topic_name verbatim; candidate returns 鎌倉・統治. HISTORY_CHAPTERS[2].topics is 世界の中世/鎌倉/室町. Chapter pools use includes(topicOf(q)); chapterTest uses equality with those topics; 鎌倉 topic selection likewise expects exact match. Reproduction yielded {topic:"鎌倉・統治",chapterIncluded:false,kamakuraIncluded:false,globalHistoryIncluded:true}. Thus the adapter period mapping alone does not make this new candidate available in the appropriate chapter/topic paths. This is a real routing defect in candidate integration, not the repaired DAY preview error. Technical result FAIL pending a reviewed routing fix and renewed same-candidate checks. Parent owns code fixes; this reviewer changed only isolated preview/evidence files.
