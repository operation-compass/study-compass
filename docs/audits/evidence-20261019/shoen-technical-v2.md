# 独立技術監査：荘園 v2

- reviewer_id: /root/shoen_technical
- checked_at: 2026-10-19T00:23:34.520Z
- ID: SC-SOC-HIS-GAP10-000006
- version: gap10-shoen-review-v2
- question_sha256 (13 fields / v2): e393a6bf3c2788d2047bd7a233fde005507a0023d852a8440207b84126e5f53b
- 判定: HOLD。公開不可。既知のadapter阻害と未確認UIがある。

## 直接確認した範囲

GitHub fetch_commit(main)で800ce3156cd6decc0a1b4e7d0fefc048204ccfedを取得し、その固定refでscripts/adapt-drive-to-web.cjs、index.html、legacy-study.htmlを直接取得した。両HTMLのblobは4c5f21a37a039abe8319ee697503e0660b0bf702で一致。fetch_blobで実本文も取得した。ローカルoutputs/aux-ci-fix/liveの両HTMLはgit blob SHAを再計算してこの取得blobと完全一致することを確認した。古いroot HTMLは使用していない。

両HTMLのSOCIALは各629問。対象IDは存在しない。固定候補の13フィールドを現selector digestで再算出し、上記SHAと一致した。grade中1、4択型、空欄なし・異なる4肢、正答の選択肢包含を確認した。

## 公開阻害を再現

取得したmain adapterをそのまま実行し、両HTMLの実SOCIALと候補1問をapplyToWebに渡したところ、どちらも次の例外で停止した。

`Unsupported new question Web unit: 歴史/平安・荘園`

periodsに平安・荘園のキーがない。grade修正のみでは公開できない。既存問題を返す処理や公開ガードの緩和で回避してはならない。

## 必要な最小修正と再検証

候補の単元は平安・荘園のまま維持し、adapterで歴史・古代へ対応付け、Web topic_nameを平安、master_topic_nameを平安・荘園として保持する必要がある。HISTORY_CHAPTERSの「日本の始まり・古代国家」はtopicの完全一致で抽出する。現在平安は18問で、詳細topicをそのまま渡すだけでは章と平安ボタンから脱落する。単にperiodsの1キー追加だけでは十分でない。

修正を行う場合は、既存629問の全オブジェクト・順序・ID不変、対象1問だけ追加、平安18→19、古代および該当章への包含、未対応topicの拒否維持、両HTML一致を独立に再確認すること。

## 未確認・独立性

現adapterでは候補を実装できないため、候補の3mode表示、正誤採点、実測390px幅での横はみ出し、履歴UI exportと再読保持はPENDING。以前の別候補のUI証拠を流用してPASSとしていない。親operatorが修正後の固定候補で生証拠を取得する場合には、コード/実行基準SHA、実時刻、実測寸法、画像、正答・誤答結果、export前後の同一対象履歴を保存した後に再監査が必要である。

他役割の結論を参照していない。固定候補・正本・公開コード・外部状態は変更していない。本監査は構造の一部PASSを公開可能なtechnical PASSへ読み替えない。

再現用ローカルスクリプト: outputs/codex-proof-inputs/shoen-technical-check.cjs。取得adapter: outputs/codex-proof-inputs/shoen-current-main-adapter.cjs。
