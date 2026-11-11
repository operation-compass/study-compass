# GAS本体へ適用する最小パッチ（shadow収集だけ・本番公開ゲート不変）

2026-10-19に受け取った実際の Code.gs を基準にした**明確な3か所**の変更案。実GASにはまだ未適用。PR #27をmainへマージしただけではGASに反映されない。

## 前提
GASプロジェクトへ `gas/sc-simple-check-export.gs`、`gas/sc-attach-simple-checks.gs` を別ファイルとして追加する。ただしSheets正本に `Web自動公開｜新3チェック記録` が**まだないため**、追加直後の `simple_checks.records` は `[]` となる。これをPASSやREADYとして解釈しない。

## 変更1: studyStageApproved() の既存ステージングJSON作成箇所

既存の `const put=studyPutGitHub_('data/staging/drive-sync-bundle.json',{...},token);` を次の形に置き換える。元の `{schema_version,candidate,audit,approval}` のフィールド・値をそのまま維持する。

```javascript
const bundle = {
  schema_version: 1,
  candidate: {items: batch.items},
  audit: audit,
  approval: {
    mode: 'ai_three_stage',
    source_spreadsheet_id: STUDY.spreadsheetId,
    export_source: 'authenticated-drive-export',
    exported_at: new Date().toISOString()
  }
};
const extended = scAttachSimpleChecksToStaging_(bundle, book);
const put = studyPutGitHub_('data/staging/drive-sync-bundle.json', extended, token);
```

これだけでは、新3チェックだけを持つ問題が旧READY候補0件の場合は**送信されない**。既存の旧READY公開経路を保つため、旧READYフィルタを削除しない。

## 変更2: studyPutGitHub_() 内の差分比較

既存の
```javascript
if(studySameSnapshot_(old,data))return {unchanged:true};
```
を
```javascript
if(scSameSnapshotWithSimpleChecks_(old,data))return {unchanged:true};
```
へ置き換える。新監査データの変更のみでも次回ステージングに反映できる。比較時の12時間期限は元の `studySameSnapshot_` が維持する。

## 変更3: 安全確認（公開とは別）

現在の `studyStageApproved()` は旧READY候補が0件のとき早期returnする。**この条件は変えない。** 新方式の候補探索には、別の読み取り専用 `studySimpleThreeMigrationPreview()` / `scBuildSimpleShadowCandidates_()` を利用する。後者は新監査タブがない現在の正本では明示エラーでHOLD。

## 実施前の必須条件

- Apps Scriptエディタのファイルをバックアップしてから変更する。
- 新監査タブ・実際の審査証拠・ID/version/SHA束縛のある承認台帳・審査主体の真正性を実証するまでは本番公開ゲートを変更しない。
- 現行の `STUDY.branch='feature/drive-approval-gate-20261016'` と二時間トリガーは変更しない。
- 検証・変更はステージングJSON拡張までであり、本番への新方式による公開数は0問のまま。

## 認識すべき導入上の注意
- 現行ステージングはGitHubの厳しい旧READYセレクタに接続され、自動公開設定は有効。上記を稼働中GASへ適用するとステージングpushが実際の旧公開ワークフローを起動し得る。**本番影響を避けるには、先に隔離環境で確認する。**
- `simple_checks.records` は監査の主張を表すデータであり、認証された承認の証拠ではない。
- GASエディタへの反映と接続テストは未実施。コード片を保存しただけで接続完了と報告しない。
