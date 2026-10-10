# Drive → Web 同期安全ゲート（試験導入・2026-10-11）

このブランチは **監査専用**。main/公開Worker/Drive正本には自動反映しません。

## 正本と基本契約
- 正本: [問題MASTER](https://docs.google.com/spreadsheets/d/1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88/edit#gid=1614367071)
- GitHubとDriveの双方向一括上書きは禁止。
- question_idの変更・再採番は禁止。既存の学習履歴に紐づきます。
- 新規設問は status=CHECK / publish_flag=FALSE を維持。個別監修後の採用判断は別工程。
- 公開するのは「監修承認」「差分レビュー」「ステージングでの採点・履歴検証」をすべて満たしたものだけ。
- 公開ページに存在する問題数とDrive全件数を混同しないこと。

## 事前比較（手動で書き出した、スキーマが確認済みのJSON同士）
`node scripts/check-question-sync.mjs baseline.json candidate.json`

入力は列名をキーにした設問オブジェクトの配列、または `{"questions":[...]}`。
このスクリプトは読取専用で、ネットワークにもデプロイにも触れません。

停止条件：
1. IDの欠落・重複
2. 既存IDの削除、本文または正答の無断変更
3. 既存publish_flagの変更
4. 新規IDがCHECK・非公開ではない
5. 4択の選択肢の欠落・重複、正答欠落、解説空欄

同一問題文は警告として表示。教科横断の意図的重複や別問題形式を機械判断で削除しません。

**未対応事項**: この比較は意味的重複、事実正確性、履歴互換、選択肢の別表記、著作権、GitHub教材データとの実差分を自動保証しません。JSON変換時の列ずれも別途検証が必要です。

## 実際の公開まで
1. Drive正本とWeb搭載問題を別々にエクスポートし、件数とIDを突き合わせる。
2. 監査・監修完了の問題のみ同期候補にする。
3. 差分だけを新しい作業ブランチに置く（巨大HTML全置換は禁止）。
4. 履歴保存・4択シャッフル・URL・スマホ表示をステージングで確認する。
5. レビュー後に手動でmain統合。GitHub ActionsのDeploy / Production routes / Rendered study pageをすべて確認する。

2026-10-11時点でDrive問題MASTERの確認済み行数は2,218問（最終追加バッチまで）。これはWeb公開問題数を意味しません。
