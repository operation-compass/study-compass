# Independent technical re-audit v3 r2 — PASS (review candidate)

ID: SC-SOC-HIS-GAP10-000008
Version: gap10-codex-proof-v3
Question SHA256 v2: b6cbeeb897cc79b2322fef9cca12b43aed23f3172457799ce8f6ca697fcd3b34
reviewer_id: /root/codex_technical_v2
checked_at: 2026-10-18T07:38:12Z
role: technical
result: PASS
risk: LOW
exception_reason: none within this review-candidate scope

This is the independent technical judgment on the exact candidate plus the reviewed adapter revision below. Parent /root acted as browser operator only and supplied raw screenshots, AX action trace and UI-exported history; I independently read and assessed them. I did not read other roles' evidence/judgments. This record supersedes the routing FAIL for this code revision only; codex-technical-v3.md/json remain unchanged as historical failure evidence. PASS is not READY, authenticated staging, integration, production publication or a claim that later publication gates have passed.

## Exact baseline and code binding

Direct GitHub fetch_file at baseline commit ac1be611c0da43261e1fbcad624ccf7312b55ddd independently returned index.html and legacy-study.html Git blob e42968612079326902eeb3730b245df40fa84698. Local current-main-legacy-study.html recomputed to exactly that blob after terminal-newline correction. Node VM parsed banks: SOCIAL 628, WORDS 900, ENGLISH_GRAMMAR 213, JAPANESE 326, MATH 307, SCIENCE 224, total 2598. Same upstream blob establishes both HTML bodies equal. Old root mirror has 623 social items and was not used as the final baseline or edited.

Direct GitHub fetch_file for scripts/adapt-drive-to-web.cjs at PR #23 head 883a9f91824e882f212e9948aacd379af391bb75 returned blob 36eaa9afde10602a627956457c2bd2715d08be26. Independently normalized local script CRLF to LF and recomputed exactly that blob. Direct fetch_commit_workflow_runs for the same head returned CI 39087838963, Verify automatic publication safety (offline), completed/success. This is adapter/safety CI; publication-candidate CI has not yet occurred. Main integration was not performed by this reviewer and is not claimed.

## Candidate/schema/routing/order checks

Read codex-proof-candidate-v3.json; independently recomputed digest(q,v2Fields), matching the SHA above. ID/version complete. 社会/中1/歴史/鎌倉・統治/4択 metadata complete. Four distinct nonempty options 六波羅探題, 鎮西探題, 政所, 評定衆; answer equals exactly one. Technical schema/grade validity is verified, while factual and educational suitability remain the other independent roles' responsibilities.

New ID absent from existing bank. Actual adapter call appends exactly one new question, 628→629, total 2598→2599. deepStrictEqual confirms all 628 old social records and order unchanged. Maximum-five assertion, duplicate ID protection, HOLD exclusion, invalid grade and unsupported subject/unit rejection remain active; local test-adapt-drive-to-web.cjs passed including the new case. Earlier same-session check-history, selector and safe-new-release tests passed. App/history code is unchanged.

Original defect: detailed topic 鎌倉・統治 was not included by chapter's exact-match topic filter. Fixed adapter now writes Web unit 歴史・中世, topic_name 鎌倉, master_topic_name 鎌倉・統治 only for this new topic, preserving MASTER metadata. Executed actual snapshot topicOf and HISTORY_CHAPTERS logic: topic=鎌倉, medieval chapterIncluded=true and kamakuraIncluded=true. Other topic behavior remains unchanged. Source question's 13-field SHA is unchanged. Operator r2 history hub independently inspected: medieval chapter 57 questions/1 attempted, 鎌倉27 questions (prior 56/0 and 26), confirming candidate counted in chapter/topic.

## Review-only preview and practical UI evidence

Constructed outputs/codex-proof-technical-preview/ from exact baseline plus one candidate. Both copied HTML banks independently equal adapter expected output and each other. REVIEW ONLY v3 r2 banner/title and isolated KEY study-compass-codex-review-only-history-v3 used. Exact reversal of only SOCIAL replacement, banner and KEY yields byte-identical baseline HTML. DAY=86400000 preserved. Parent-discovered earlier DAY deletion was my harness error, repaired before final checks; it was not a production defect. Old v3 FAIL is retained. Preview server 127.0.0.1:8788 responded HTTP200. This simple server does not execute Cloudflare worker.js; production worker augmentation and actual deployment are later checks.

My own CUA inventory returned no browsers/apps; iab and chrome creation both failed with Browser is not available. Parent then operated CUA and supplied the raw evidence listed below. I viewed all seven r2 390px screenshots plus full hub screenshot and inspected trace, not just parent conclusions. Old images merely named mobile were 1265px desktop captures and were explicitly excluded from mobile conclusion.

Final r2 trace records actual measured innerWidth390/height844 and clientWidth=scrollWidth390 for question/card; mcq clientWidth=scrollWidth375 with innerWidth390 (scrollbar). All 3 modes fit their content width with no horizontal overflow. The 390px images show legible wrapped prompt, all four complete choices, accessible action buttons, answer and explanation. Question-only conceals choices and reveals 六波羅探題/explanation. Card starts concealed, flips to answer/explanation and shows まだ/覚えた controls. Final mcq trace proves selecting 政所 produces incorrect feedback and result0/1; review selecting 六波羅探題 produces correct feedback; choices are locked and correct choice highlighted. Actual submitChoice logic independently tested against all four candidate options returned correct,incorrect,incorrect,incorrect.

History is tested only in isolated preview storage. UI-exported operator-v3-history-before-reload.json and after-reload.json are exactly equal bytes (SHA d06dbc07c9f8d5823cb3f81d7fda7b518795c3053c87075b4e82b65091a29ea2). They contain three actual graded candidate events: 評定衆 incorrect, 政所 incorrect, 六波羅探題 correct, correct retry linked to prior attempt. First incorrect event was created before the DAY harness repair and retained; it is not a fabricated fixture. Navigation/reload then UI history export preserved all three attempt IDs and values. This demonstrates existing recorded candidate history survived page reload; static old-history tests separately confirm unchanged display retention. It does not inspect or change a user's real production history. Final r2 scoring is additionally proved by its later raw trace.

## Outcome and boundary

No unresolved technical defect was found in this candidate with PR head 883a9f91824e882f212e9948aacd379af391bb75 adapter. Prepublication candidate technical PASS/LOW is justified by independent code/data checks plus independently assessed raw operator evidence. Use this PASS only with the exact question ID/version/SHA and reviewed mapping. Before real release, the reviewed adapter must be integrated via the authorized path and authenticated staging, full three-role evidence, bounded proposal/publication CI, deployment and published-bank comparison must still pass. No bypass, READY or production success is asserted. Sheets/GAS/schedules/root HTML/public settings were not changed by this reviewer; no paid API used.

## Raw evidence SHA256 manifest

- operator-v3-trace.json: ace322a3db9c4055c3479be8c54c8a2619f28dc07a12024aa83124ace51c9d1d
- operator-v3-r2-question-390.png: 97417852e768e2d4cbc2c06b3d3ef2fa60ac451f9839d074a8676b9d8078f531
- operator-v3-r2-question-answer-390.png: d0980a1911910c82e4206b648c28efd03eff5773d09f359a1725ff16983e8132
- operator-v3-r2-card-front-390.png: de396bb594c1d75e393bd44614c667149bdc72c23f5d2d052d459a25473c3979
- operator-v3-r2-card-answer-390.png: 0c6049711bee22ced88a46d2ddacf767ac4ec5fdd8e407bfc5a6a7d1723a794c
- operator-v3-r2-mcq-390.png: 13eda162f179a9d3801b55a3a56a5c8de98144cc5043e10440bcdbc27af2d581
- operator-v3-r2-wrong-390.png: 415595ae7f5500bc63ab0d4724f6fd2219547c382145f87bdcbccc8c991d43fb
- operator-v3-r2-correct-390.png: 52eca806abbe8916ab103604a630394c6228cee5fbf7170d1fa36e6793652882
- operator-v3-r2-history-hub-full.png: 0eb3b8c2c7a28b318ec7c311fdfd70f6037d0c236083d75a929d6faec3694905
- operator-v3-history-before-reload.json: d06dbc07c9f8d5823cb3f81d7fda7b518795c3053c87075b4e82b65091a29ea2
- operator-v3-history-after-reload.json: d06dbc07c9f8d5823cb3f81d7fda7b518795c3053c87075b4e82b65091a29ea2
