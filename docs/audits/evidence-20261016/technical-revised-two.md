# 改訂2問・技術監査

実施者: codex-root-technical-20261016。正確性・品質担当の別実行による証拠を照合した。人手の承認を代替したとは扱わない。

- 対象: 租 GAP10-000001、国司 GAP10-000005、gap10-reviewed-v2。13フィールドSHA v2は独立2担当の計算と一致。
- 両HTMLの既存社会623問すべてと掲載順を保持し、隔離された審査用プレビューだけで625問へ2件追記。既存全2593問も保持し、総数2595問の構造、公開禁止ID、履歴互換、採点・ストレージ回帰を検査。
- 実データを通した結果、詳細単元「律令・税制」「平安・地方制度」がWebの単元ID解決に未対応である不具合を検出。adapterで既存の「歴史・古代」へ明示的に対応付け、topic_nameには正本の詳細単元を保持。未対応の単元は例外停止。既存問題への変換処理は不変更。
- 正確性・品質の証拠ファイルSHAも実体から再計算して照合。独立2PASSだけでは公開selectorのREADYに入らないことを検査。
- Apps Script既存プロジェクトのコードをUIから取得し、古いHTML取得と監査証拠検査未反映を確認した。検証済み318e5c2のGASへ更新。保存後全文を再読し改行正規化後の期待コードと一致。関数ごとの比較と全体FNV32=444542788をリポジトリ側と照合（FNVはコード照合補助であり承認署名ではない）。
- 実GAS studyPreview: 2026-10-16 20:09:05〜08 JST、scanned5208、eligible5、preview_only、production_updated=false。
- 実GAS studyStageApproved: 20:09:58〜20:10:02 JST、正常完了。ログは `No unpublished candidates in current staging selection; production unchanged`。既存の公開5問から差分0、未完成監査を昇格させない。今回2問の修正版が同期された証拠とは扱わない。
- 既存時間トリガーは更新前に1件（studyStageApproved、Head）をUI確認。追加・編集・削除はしていない。実行前の一覧には過去実行エラー率100%が表示されていたが、今回の手動同期成功を確認した。今後の時間実行成功は未確認。
- PR #12は本番mainへの提案workflow導入用で未マージ。本番反映・Cloudflare公開・実本番の新規2問の全モード/スマホ動作は未実証。

技術判定: PENDING（審査用2問差分・回帰は成功、公開経路/全モードは未完）。最終判定: HOLD。監査台帳の現行validationはREADY_FOR_REVIEW/HOLD/REJECTEDで、READYは許容されていない。入力規則を緩めたりREADYを直接書込まない。

プレビュー生成は `scripts/test-reviewed-two-preview.cjs`。mode=review_preview_only、release_authorized=false、production_updated=false。生成HTMLはローカルoutputs配下だけで、本番HTMLやGASステージングbundleを置換していない。
