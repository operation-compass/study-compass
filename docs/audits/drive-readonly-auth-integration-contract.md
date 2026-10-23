# Study COMPASS — authenticated Drive read-only integration contract (draft)

**Status:** design only. No credentials, production publishing, new GAS file, or schedule modification.

## Required trust chain

1. GitHub Actions obtains a **short-lived Google access token** using GitHub OIDC → Google Workload Identity Federation, with an explicitly configured provider and a least-privilege service account.
2. The Google service account is granted **Viewer** access only to the specific Study COMPASS spreadsheet; use Sheets `spreadsheets.readonly` scope. Do not use an editor OAuth scope or broad Drive write scope.
3. A protected workflow downloads fresh responses for `問題MASTER`, `Web自動公開｜新3チェック記録`, and `Web公開承認台帳｜人手最終承認` (plus the applicable full independent audit records). A header-only or missing tab is a failure, never approval.
4. Validate the complete expected sheet schema, ID uniqueness, timestamp freshness, and hashes **recomputed** from the authenticated MASTER values. Reject empty/truncated pagination/range results, duplicate records, inconsistent hashes and missing approvals. Preserve immutable capture metadata, but a timestamp alone is not source authenticity.
5. Reconstruct the current published baseline from an authenticated deployment artifact, not an arbitrary JSON supplied by the workflow caller. Compare only proposed new/modified/deleted question IDs. An unknown or unverified baseline must prohibit publishing.
6. Require separate authenticated independent reviews and an explicit authorized production release for each changed question and its exact ID/version/SHA. `CHECK/FALSE`, HOLD, approval conflict or any unavailable Google API response must prohibit publication.
7. Integrate into deployment only after independent review, a dry run on actual read-only Sheets data, roll-back test, and explicit authorization. Deployment gate must not accept caller-provided `() => true` as attestation.

## Minimum GitHub configuration (not provisioned)

- Google Cloud project with Workload Identity Pool/Provider trusting the **exact** `operation-compass/study-compass` repository and a protected environment/ref.
- Dedicated service account, Sheets read-only OAuth scope, permission limited to the identified Spreadsheet.
- GitHub Actions `id-token: write` for the dedicated audit job (not global); no service-account JSON key, OAuth refresh token, or private values committed to Git.
- Stable baseline attestation process and authorized reviewer identity source; currently unimplemented.

## Acceptance tests

- Valid read-only fetch in a protected, isolated test job must **not** grant release.
- Missing Sheets permission, expired token, missing audit row, stale data, altered question hash, explicit HOLD, wrong approval ID/version/SHA, reused reviewer evidence, and absent production authorization all fail closed.
- Publish counts remain zero throughout integration testing; existing web content and user history remain unaffected.

**Open blocker:** Authentication and authorization configuration cannot be demonstrated from code alone. No Google Cloud or GitHub secrets/environments were changed.
