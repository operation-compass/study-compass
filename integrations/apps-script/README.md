# Study COMPASS — GAS → GitHub staging setup

This integration is **opt-in** and **staging only**. It does not alter production HTML, Cloudflare or original sheet cells.

1. Open the Study COMPASS problem MASTER in Google Sheets. Open **Extensions → Apps Script**.
2. Create a script file and paste `integrations/apps-script/StudyCompassSync.gs`.
3. From GitHub, create a fine-grained personal access token with **Contents: Read and write** restricted to **operation-compass/study-compass**. Never paste it into the sheet or this chat.
4. In Apps Script **Project Settings → Script Properties**, add `STUDY_GITHUB_TOKEN`. You must have rights to the selected repository and branch.
5. Select `studyPreview` and run once. Consent to Sheets access. Check execution log; when approved=0 it is correct to do nothing.
6. Only after manual approvals exist (MASTER PUBLIC/TRUE and independent ledger APPROVED, approved_by, approved_at, approved_version and approved_sha256), run `studyStageApproved` to write one atomic staging JSON bundle to the **feature** branch only.
7. Check the change and CI results in draft PR #10 before planning any production release.

No recurring trigger is created by this code. Do **not** automatically create a trigger until the staging path has been end-to-end validated. The separate ChatGPT 2-hour audit schedule does not invoke Apps Script automatically.

Known limitations:
- The Github token needs to be installed manually in Apps Script Script Properties; the token is never included in repo files.
- The prototype stages the candidate and approval manifest in one atomic GitHub file; this prevents partial pair updates but does not establish trusted Google provenance and **must not** be used for production release as-is.
- Future production gating must require freshness/provenance, known-withheld IDs, content integrity and successful render tests. Staging artifacts are not an authorization to publish.
- Existing live HTML embeds its question bank. A migration or safe runtime data loader is still needed.
- Never treat source verification date as human approval date.
