# 未掲載5問の実データ監査とGAS取得修正

正本: https://docs.google.com/spreadsheets/d/1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88/edit

本番基準: main `cd24371108556d549e3645ff7276618dd613cb43`。両HTMLのGit blob SHAは `793af430002c15bdf077e5bd9d0b478436555226`。全体2593問、SOCIAL 623問。正本ID5208件との比較でSOC-HISの未掲載IDは91件。これは意味重複を除いた知識数ではない。

## 実データ5問

問題MASTER A2256:X2260、SC-SOC-HIS-GAP10-000001〜000005を認証済みコネクターで取得。両本番HTMLに5IDが存在しないことを検証した。スナップショットと取得日時は `evidence-20261016/master-unpublished.json`、各問題のSHA v2・判断理由は `evidence-20261016/review.json` に保存。

| 末尾ID | 正確性の今回確認 | 品質課題 | 技術・判定 |
|---|---|---|---|
| 000001 租 | 国税庁PDFが14.7MBで取得不可。本文未再確認 | 意味重複未監査 | HOLD |
| 000002 調 | 同上 | 口分田・防人は税名ではなく肢の型が不均一 | HOLD |
| 000003 防人 | 九州国立博物館本文で663年敗戦後の防人設置と大宰府防衛強化を確認。定義全体は追加照合待ち | 他時代の地頭を含む肢、類題を要確認 | HOLD |
| 000004 正倉院 | 指定ページ403。前回の照合済メモだけでPASSにしない | 蒸気機関車・明治の地券・戦後憲法は時代差が大きい | HOLD |
| 000005 国司 | NDL書誌・目次まで。職務の直接典拠本文ではない | 意味重複未監査 | HOLD |

全5問のgradeは `中1〜中3`。現行v2公開スキーマ `中1/中2/中3` に不適合。今回、学年を推測して書換えていない。独立3監査の実施者と証拠ファイルも未登録。今回の単一セッションの事前確認を独立3PASSとして扱わない。公開可能差分は0問。原本CHECK/FALSEと既存監査欄を変更していない。

根拠:
- https://www.kyuhaku.jp/dazaifu/d-map/kaisetu01.html 「大宰府政庁の創設と大宰府の防衛」（該当内容を要約保存。全文転載なし）
- https://www.nta.go.jp/about/introduction/torikumi/week/download/r05zeishukan_all.pdf （今回取得失敗）
- https://www.narahaku.go.jp/exhibition/special/special_exhibition/202410_shosoin/ （今回403）
- https://ndlsearch.ndl.go.jp/books/R100000002-I025769130 （書誌・目次のみ）

## 実装修正

GASの本番HTML取得はContents JSONのBase64を要求していたが、実HTMLは1,311,718 bytes。GitHub公式仕様では1MB超のJSON contentは空になるため、この経路は停止する。`Accept: application/vnd.github.raw+json` に変更し、mainを一度SHAに解決して両HTMLの取得を同じコミットに固定した。HTTP失敗・JSON応答・不正SHA・両HTMLの不一致では停止。

仕様: https://docs.github.com/en/rest/repos/contents#get-repository-content

既存CIが実行する `test-gas-check-ready.cjs` から新しい実HTML取得テストと実データHOLDテストを実行する。最大5件制限、既存問題・掲載順保護、HOLD無変更の既存回帰も維持。

## PR/GAS/実行状態の照合

- PR #12はmain向けの提案workflow導入用。head `d4ff7fbe51aef1fafd66d67d13725909aafda336`、open/unmerged。検証run `38875828100` はsuccess。実際の問題公開成功を意味しない。
- featureの既存同期bundleは5件、exported_at `2026-10-16T08:54:58.317Z`。SheetsのREADY表記1件にもindependent_reviewsがなく、selectorはREADY 0、HOLD 5。
- リポジトリGASとSheetsの列構成は照合済み。実行中GASのコード版・Script Properties・トリガー数は今回取得できず未確認。コード修正の稼働反映や同期実行を成功と報告しない。
- 既存GASトリガー、ChatGPT定期タスク、オプチャテンプレートは変更なし。main、両HTML、Cloudflareも変更なし。

ローカル検証: 18テストファイル成功、check-question-release / check-history / check-beta成功。本番基準の全2593問を維持。GitHub CI結果はこの変更のコミットSHAと照合して別途確認する。

次の実作業: 各問題の学年選定・直接典拠・誤答肢・意味重複を監査し、実体のある独立証拠を作成。その後に実GAS版を照合して同期し、READYが生じた時だけ最大5問の公開差分を生成する。
