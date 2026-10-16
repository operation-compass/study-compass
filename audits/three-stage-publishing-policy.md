# Study COMPASS: Three-stage audit release policy (draft; non-production)

## Goals
Accurate and useful entrance-exam practice, scalable auditing, and no premature publishing. Google Drive remains the source of truth. COMPASS LISTEN is out of scope.

## Stage 1 — Factual accuracy and traceable evidence
- Validate question wording, one unambiguous correct answer, all alternatives, explanation, context, official/primary sources or credible corroboration.
- Record source URL and actual verification date, not merely search hits or bibliographic listings.
- Failure, disputed wording, missing source => HOLD.

## Stage 2 — Educational quality / editorial independence
- Check duplicate/near-duplicate, curriculum and subject taxonomy, grade, difficulty, clear explanations, copyright/attribution, and accessibility.
- Require a different rubric/check than stage 1. Repeating one AI response three times is not independent review.
- Any questionable historical interpretation, ambiguous answer, original copyrighted reproduction, or high-stakes calculation => HOLD for review.

## Stage 3 — Machine-enforced delivery checks
- Exact ID uniqueness; status eligibility; choices/answer consistency; version/hash; schema and encoding; known-withheld IDs; runtime compatibility in QA, four-choice and flashcards; nonempty output and regression thresholds.
- Validate source version/hash is unchanged since stages 1–2.
- Never replace embedded live question banks with an empty or partial dataset.

## Proposed automatic release eligibility
- Only low-risk, independently sourced, objective MCQ/short recall questions; all three checks must be current for the exact content digest.
- One ambiguous/missing field, risky item, or failed test => HOLD, not an automatic waiver.
- Editorial human approval remains mandatory in the **currently deployed design**. A distinct policy and code change plus monitored pilot are required before permitting automated final approval for low-risk questions.
- Maintain source-of-truth approval ledger; NEVER synthesize a fake human reviewer or falsely set approved_by.
- New audit log (Drive tab: 'Web自動公開｜3段階監査ログ') records quality evidence and READY_FOR_REVIEW/HOLD/REJECTED; it is **not** a production authorization.

## Rollout stages
1. Observe-only: classify existing questions and write audit evidence.
2. 5–20 human-approved pilot items: verify atomic GAS staging bundle, GitHub gate, correct mode counts, no 404/blank page, rollback.
3. Pilot risk-scoped auto approvals only after a separate explicit user decision and independent quality review.
4. Production incremental sync at two-hour intervals after data loader migration and fail-safe deployment/rollback tests.

## Important current limitations
- The Apps Script staging branch is not the production site, and staging alone cannot update Web.
- GitHub Secrets and Apps Script Script Properties must be configured by an authorized person.
- Existing ChatGPT 2-hour task does not automatically execute GAS.
