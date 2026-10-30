# Study COMPASS PR #37 本番反映・復旧チェック

## 前提
- 対象: PR #37「教科選択・一問一答履歴・ホーム集計」
- 公開用Google Sheets（WEB QUESTIONS）と正本、監査タスクは**変更しない**。
- Cloudflare Worker名は `study-compass`。本番デプロイは `main` push で起動する。
- CI成功は実機での動作保証ではない。PRは確認完了までDraftのまま。

## 反映前チェック（すべて確認してから）
1. PRの最新SHAと `main` のSHAを記録する。別作業の更新があれば差分を再検証。
2. PRの公開CSV検査、Chromium操作テスト、本番配信と同じpreflightがすべて成功。
3. 直前の本番Cloudflareデプロイ識別子・GitHubコミット・復旧権限を確認し、実際に復旧できる担当を確保する。
4. 本番 `/api/questions.csv` の問題ID集合・件数と公開シートのID集合・件数を照合。未一致・取得不可は公開保留。
5. 本番で既存学習履歴を消さないことを確認。別端末やブラウザのデータ消去をまたぐ同期は提供しない。

## 公開後確認
1. `/study.html?subject=社会` に社会の単元のみ表示される。
2. 4択回答→ホームの解答済み問題数・累計回答回数・正答率→再読み込みで同じ数字。
3. 記述式・生成資料の既存β履歴を保持。
4. `/api/questions.csv` と学習画面に公開承認済みIDだけ存在し、既存IDの欠落・重複なし。
5. 直近の追加問題が公開CSVへ転記され、学習画面にも反映される。

## 障害時
- **学習画面のコード不具合:** 追加変更を止め、現在の `main` と本番デプロイを確認する。正常な直前コミットに対応する安全なrevert PRを作り、CI合格後に通常の `main` デプロイ経路で復帰させる。別の人の後続修正をreset/force pushで消さない。
- **緊急復旧:** Cloudflareの既知の正常デプロイへの復帰機能と必要権限を担当者が事前に確認している場合に限り、その機能を使用する。復帰できたことは本番のスモークチェックで確認する。
- **公開CSV側の異常:** 未監査問題を投入したり監査条件を緩めたりしない。原本や既存公開行を無断で削除・上書きしない。
- **ブラウザの保存異常:** ユーザーのlocalStorageを削除・初期化しない。問題IDに基づくデータの保持を最優先。
- いずれも「復旧手順を記載した」だけでは復旧成功とみなさない。

## 無変更範囲
OC/K3、X/Buffer/GAS、既存の問題収集・監査・公開スケジュール、Webのデザイン方針。

## Cloudflareの復旧方法（公式仕様・2026-10-31確認）
- 公式: https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- 公式コマンド: https://developers.cloudflare.com/workers/wrangler/commands/workers/
- 復旧可能な正常版は、Cloudflare管理画面の Workers & Pages → `study-compass` → Deployments から選ぶか、読み取り操作 `npx wrangler deployments list --name study-compass` で確認する。
- 直前に**正常動作を確認したVersion ID**を必ず記録。単純に1つ前のバージョンを正常と決めつけない。
- 明示的に選んだVersion IDへ `npx wrangler rollback <VERSION_ID> --name study-compass` で戻せる仕様。ただしこれは本番トラフィックを即変更する操作であり、ユーザー確認と権限・Version ID検証なしに実行しない。
- ダッシュボードからは対象バージョンの3点メニューのRollbackで復帰できる。最新100バージョンの制約、既存バインディングの互換性制約に注意。
- Cloudflareのロールバックは接続先のGoogle Sheetsを以前の状態に戻すものではない。公開データ破壊・学習履歴削除の復旧を兼ねると誤認しない。
- 本番実行権限・正常Version ID・復旧実証は**未確認**。本書は「公式手順確認済み」であって「ロールバック実施済み」ではない。
