# 無人内容監査ランナー：導入前の実装

## 実装した部分

`scripts/run-independent-content-audits.cjs` は1〜5問を、正確性と教材品質の別々のステートレスAPI呼び出しへ渡す。双方の判断を相互共有しない。API応答ID、実行時刻、問題SHA v2、出典本文SHA、比較問題集SHA、証拠SHAを保存する。同じ応答ID、拒否、未完了応答、APIエラー、架空の引用、期限切れ入力は合格にならない。APIの保存設定は `store:false`。

内容監査2PASSでも出力は常にHOLD、technical=PENDING、release_ready=false。正本・既存監査ログ・staging・公開HTMLを一切更新しない。既存の3段階ゲートを置き換えたり、AIの判定だけで公開したりしない。

## 必要な接続と入力

ユーザー回答により、2026-10-17時点ではAPI接続は未設定。`OPENAI_API_KEY` と `STUDY_AUDIT_MODEL` が必要。モデルは明示設定を必須とし、既定モデルや課金を勝手に選ばない。キーはチャット・ログ・リポジトリに書かず、実運用時に接続先のシークレット管理へ保存する。今回のCIは模擬APIのみで、外部APIを呼ばない。

入力schema_version=1、正本ID、export_source=authenticated-drive-export、24時間以内のexported_at、items、production_commit、existing_questionsとそのsha256、sourcesを必要とする。sourcesはurl、text、sha256、retrieved_atを持つ。各問題のsource_urlに対応する実際の公的本文が必要で、検索スニペットだけを入力しない。比較問題集の完全性と正本読み出しの真正性は、認証済みエクスポート側で確定する必要がある。任意JSONの自己申告を実運用の認証証拠として受け入れない。

実行：`node scripts/run-independent-content-audits.cjs <authenticated-input.json> <output-dir>`。

## 本番有効化前に残る部分

1. API接続・利用モデル・費用上限を設定して実データで監査を検証。
2. 認証済み正本からの監査対象取得、公的本文の自動取得・保存、全MASTER意味重複比較を接続。
3. 別実行の技術監査で両HTML・採点・3モード・スマホ表示・最大5問・既存履歴・復旧手順を検証。
4. 3段階の同一ID/version/SHA証拠を正本の監査ログへ照合して記録する処理を接続。
5. 公開PRの厳密な内容再生成・最新main照合・証拠ファイル実体確認・公開後検証・失敗時復旧を実装・実証してから無人マージを有効化。

現状は自動内容監査の実装・オフライン安全性検証まで。無人監査〜本番公開の完成とは扱わない。既存のGAS定期同期と下書きPR提案は変更しない。

公式API仕様：

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/docs/guides/conversation-state

