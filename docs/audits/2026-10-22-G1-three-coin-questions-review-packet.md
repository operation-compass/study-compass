# G1: 古代貨幣3問の正式監査用レビュー資料（2026-10-22）

## 状態と境界
- この記録は単独の資料照合と出題仕様点検。独立審査者による正式な accuracy/quality/technical PASS ではない。
- Drive問題MASTER 行5210〜5212、全件 status=CHECK、publish_flag=FALSE、version=v0.1。変更・公開を承認しない。
- 新3チェック記録のタブはヘッダーのみで正式記録0件。監査担当者名、署名、証拠ファイルSHA、承認参照は未取得。

## 確認対象（正本から再取得）
| ID | SHA256-v2（既存整形台帳の値／今後の正本からの再計算が必要） | 正答 | 仕様点検 |
|---|---|---|---|
| SC-SOC-HIS-WEB26-000001 | 99efb7520f1f4502dccff5962b40cdb01d3236d4f45f37c238f13a6a908bb65d | A: 和同開珎 | 708年の発行を特定、4選択肢相異 |
| SC-SOC-HIS-WEB26-000002 | 9fef55d642106a0685e69ddbae6bbd0a2aa9770dabb41196ebde2e2c73bca063 | B: 富本銭 | 飛鳥池遺跡・7世紀後半を特定、4選択肢相異 |
| SC-SOC-HIS-WEB26-000003 | a1f9b53ba6683eac6b6223f772fce39e0352add777a4c1725dbc10a9f7a4b81d | C: 開元通宝 | 唐のモデル貨幣を特定、4選択肢相異 |

## 独立して参照可能な資料
- 日本銀行金融研究所・貨幣博物館 日本貨幣史 https://www.imes.boj.or.jp/cm/history/content/index.html
- 造幣博物館所蔵資料『和同開珎（古和同・銅）』 https://jmapps.ne.jp/zouhei/det.html?data_id=24747
- 三菱UFJ銀行貨幣資料館 富本銭 https://www.bk.mufg.jp/currency_museum/exhibit/fuhonsen/index.html
- 八十二文化財団・日本の貨幣の歴史 https://www.82bunka.or.jp/money/history.php

## G1担当者が別途満たす受入条件
1. Accuracy: 権限・本人性の確認できる監査主体が、各問題ID・v0.1・正本再計算SHA・史実の根拠URL・証拠文書ハッシュに署名または認証イベントを付ける。
2. Quality: 別の独立した審査主体が、5,214問前後の現行MASTER全件を対象に意味近接・正答の一意性・中学生向け表現・選択肢バランスを確認する。語句検索では完全保証にならない。
3. Technical: 選択肢採点、スマホ表示、未掲載問題がWebに出ないこと、履歴非破壊を隔離環境で実測。出題選択肢の期待値A/B/Cを明記して結果を保存。
4. 正本照合と承認: 公開直前にCURRENT Drive正本status/flag、承認注記、版、再計算SHAと独立した公開権限を照合。過去の禁止指示は解除しない。

## 公開判定
**HOLD**。このレビュー資料は一次資料リンクとテスト期待値を受け渡すためだけのものであり、新方式のPASS、READY、production_permission=ALLOW を発行しない。
