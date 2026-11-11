# Study COMPASS — Drive正本5問の旧SHA照合実測（2026-10-22）

## 対象と根拠
Google Sheets「問題MASTER」の SC-SOC-HIS-000001〜000005 と「Web公開承認台帳｜人手最終承認」「Web自動公開｜3段階監査ログ」を認証済み読み取りで照合。

旧方式は `[id,subject,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation]` のコンパクトなJSON配列（UTF-8）にSHA-256を計算する。新v2方式は学年・大単元・小単元を含む別仕様。混同してはならない。

## 実測結果
| ID | 独立再計算した旧SHAと承認台帳 | 承認台帳 | 既存監査3項目 | 本番反映 |
|---|---|---|---|---|
| SC-SOC-HIS-000001 | MATCH | APPROVED | PASS×3 | HOLD |
| SC-SOC-HIS-000002 | MATCH | APPROVED | PASS×3 | HOLD |
| SC-SOC-HIS-000003 | MATCH | APPROVED | PASS×3 | HOLD |
| SC-SOC-HIS-000004 | MATCH | APPROVED | PASS×3 | HOLD |
| SC-SOC-HIS-000005 | MATCH | APPROVED | PASS×3 | HOLD |

**全5問の承認メモに「本番反映は行わない」が明記。** ハッシュ一致・承認欄のAPPROVED・監査欄のPASSだけでは公開許可にならない。

## 出力・変更範囲
- 開発用PR #34の読み取り専用診断コードでは `publication_authorized:false`、`decision:'HOLD'` を固定。
- 診断コードの自己テストは追加されているが、この記録作成時点ではGitHub Actionsでの実行成功を確認していない。
- 本番 main / GAS / Sheets / Cloudflare / 学習履歴は変更していない。
- **今回の新規本番公開：0問。**

## 次の本質的な障害
実稼働GASとGitHub公開ゲートが信頼済み承認・本文SHA・公開許可を同一バージョンで照合する配線が未実証。現在の5問のHOLDを解除せず、別途正式に本番公開を許可された候補でステージング→ブラウザ確認→本番照合する必要がある。
