# 現行 Code.gs に対する最小限の接続箇所（2026-10-19 実コード確認）

**目的:** 既存の公開ルートを変更せず、正本から読んだ新監査記録をステージング用JSONに同梱する準備をする。現在のPRは未マージ、以下も実稼働GASには未適用。

## 元コードで確認した依存関係
- `STUDY.branch` は `feature/drive-approval-gate-20261016`。**これは正しい構成**であり、mainの `.github/workflows/propose-ready-release.yml` がこのブランチへのステージングpushを受け取り、 `.github/workflows/auto-publish-ready.yml` も同じブランチからデータと証拠のみをcheckoutしている。信頼済み実行コードはmainを利用する。PR #27の開発ブランチと異なるのは意図した分離であり、送信先を変更しない。
- `studyCollect_()` は旧 `final_decision === 'READY'` を要求する。単に新監査JSONを付加しても新方式の候補は発生しない。
- `studyUnpublishedBatch_()` は旧監査READYを必要とする。現行の最大5問の選別ロジックを流用しただけでは新方式を処理できない。
- `studyStageApproved()` は未公開候補が0件ならGitHubへの送信より前に終了する。空の旧候補への新監査データの同梱は実行されない。
- `studyPutGitHub_()` が `studySameSnapshot_()` で比較するのは `candidate`, `audit`, 一部の `approval` のみ。新監査記録のみの更新は見逃される。
- `studyPutGitHub_()` の出力先は `data/staging/drive-sync-bundle.json`。**mainの両ワークフローで同じ参照ブランチ・同じファイルパスを使用していることを確認済み**。既存のステージング経路を維持する。
- 現行監査ログ16列から新方式の審査証拠や正本の承認台帳は生成できない。旧PASSから新PASSへの無断変換は禁止。

## 本番を壊さない導入順序
1. **最初はread-onlyのプレビューのみ。** このPRの `gas/sc-simple-check-export.gs` と `gas/sc-simple-three-migration-preview.gs` を既存のスクリプトに加える場合、`studySimpleThreeMigrationPreview()` だけを手動実行する。既存の `studyStageApproved` トリガーや公開フラグは変更しない。新監査シートがまだ存在しなければ0件で止まる。
2. 新記録が正当な監査から作成・承認され、元問題のID・版・SHAに紐づき、署名/独立した承認台帳の検証ができる状態を実証する。
3. **その後**、別PRで `studyStageApproved()` のバッチ生成を新方式と統合する。最大5問、旧方式保全、既存トリガーを厳守する。必要なら `scSameSnapshotWithSimpleChecks_` を既存 `studyPutGitHub_` 内の比較箇所に適用するが、参照しただけでは何も変わらない。
4. GitHubの `selectReady`・公開検証・PRとCloudflareの一致を確認してから本番切替。CI通過だけでは公開の成功を意味しない。

## 現時点でしてはいけない変更
- `STUDY.branch` を理由なくPR #27に向けること（古いステージングと競合し得る）
- `studyCollect_()` または `studyUnpublishedBatch_()` のREADY条件だけを削除すること
- `simple_checks.records` が空のまま新方式をREADY扱いすること
- `studyStageApproved()` の既存トリガーを重複登録すること
- 自動マージや本番デプロイの保護を緩めること

## 検証時の終了条件
公開成功は GitHubの公開PR/マージ、Cloudflare本番配信、2つのHTMLの実問題/正答/解説照合まで行って**初めて**1問と計上する。それまでは0問。
