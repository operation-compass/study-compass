# 徳政要求 v2 独立技術監査
- reviewer_id: codex-agent:/root/tokusei_technical
- role: technical
- checked_at: 2026-10-19T06:24:17Z
- id: SC-SOC-HIS-GAP10-000010
- version: gap10-tokusei-demand-v2
- question_sha256 (13-field v2): 7972abd5af2c1712c5d1b65c3bec928602102444152d4de6fd7427ef8a588e72
- result: PENDING / final_decision: HOLD
- risk: HIGH
- exceptions: 未対応単元による新規追加失敗。実UI・両HTML・履歴保持・候補CI未検証。

## 独立性と取得
本実行主体 /root/tokusei_technical が技術のみを独立審査。他役割の報告は参照していない。コード・正本・GitHub・公開設定への変更は行わず、ローカル証拠だけ保存した。
GitHub fetch_commit(main)が現在mainを6b41724063a08f5dddb7c5d7620bd4184e23bfbdと返した。GitHub fetch_file(main)でadapter、selector、verify-auto-publication、auto-publication設定を直接取得した。設定enabled=trueと、参照承認JSONのexplicit_user_activation_approved=trueを確認した。過去報告の引用ではない。
直接取得コードのローカルコピーは outputs/codex-proof-inputs/tokusei-current-main-{adapt-drive-to-web,select-ready-candidates,verify-auto-publication}.cjs。GitHub blob SHAは順にed722173faf729001ae88df02783b31c121c56fb、1c71c64c4acf3c2b4935d54ec61f8a515369aaee、d4c6e861a4d978dfe5cab2c3cf9e49351252794d。
取得URL:
https://github.com/operation-compass/study-compass/blob/6b41724063a08f5dddb7c5d7620bd4184e23bfbd/scripts/adapt-drive-to-web.cjs
https://github.com/operation-compass/study-compass/blob/6b41724063a08f5dddb7c5d7620bd4184e23bfbd/scripts/select-ready-candidates.cjs
https://github.com/operation-compass/study-compass/blob/6b41724063a08f5dddb7c5d7620bd4184e23bfbd/scripts/verify-auto-publication.cjs

## 実行観測
固定候補 outputs/codex-proof-inputs/tokusei-candidate-v2.json を取得したselectorのdigest(q,v2Fields)へ渡し、上記SHAと完全一致した。ID・教科・学年・大単元・小単元・問題形式・問題文・4選択肢・正答・解説の13フィールド。versionは別途一致が必要。
4選択肢の重複なし、正答「借金を帳消しにすること」は選択肢に1個だけ存在する。これは文字列とメタデータの静的確認であり採点UIの成功証拠ではない。
取得したadapter.applyToWeb([], [candidate], [candidate.id])をNodeで実行し、実際に「Unsupported new question Web unit: 歴史/室町・一揆」で停止した。新規分類は未対応で、現在コードでは公開候補を作れない。
selectorへ監査記録なしの候補を渡した実結果はready=[]、held=[SC-SOC-HIS-GAP10-000010]。PASS・証拠を捏造した試験は行っていない。

## 必要最小修正（提案のみ）
adapterのperiodsに「室町・一揆」:「中世」を追加し、webTopicに「室町・一揆」→「室町」を追加する。既存の鎌倉・統治、平安・荘園と同じ詳細保持方式でmaster_topic_name「室町・一揆」を残す必要がある。periodsだけ追加するとtopic_nameが「室町・一揆」のままとなり既存の室町章への厳密トピック振り分けを満たさない懸念がある。
参照ローカルindexではHISTORY_ORDERと中世章topicsが「室町」を使用していた。ただし現mainの巨大indexはconnector fetch_fileが空content、raw fetchがtoo large/unsupportedを返し、現main UIソースとの完全照合は未達。上記ルーティング修正は実UIで確定させること。コードを変更していない。

## 既存保持と公開ガードの確認範囲
adapterは既存配列mapで元の順序を保持し、READY対象外は各オブジェクトをコピー、既存READY対象は問題・正答・選択肢・解説だけ更新しメタデータを保持、新規は末尾pushする。重複ID、READY件数>5、選択肢重複、正答不在をassertで拒否する。学習履歴の保存先へ書くコードはこのadapterにはない。これを履歴実保持のPASSとは扱わない。
selectorはv2メタデータ、同一版・13フィールドSHA、3役割ごと1つのPASS、異なるreviewer_id、証拠SHA、未来でない日時、risk LOW・例外なし・READYを要求する。
verify-auto-publicationは実MDのバイトSHA・一意性・宣言パス・本文のIDとreviewer、対JSON recordsのid/version/role/result/reviewer/日時/問題SHA/証拠SHAを確認する。両HTMLの追加編集ID一致・最大5問・再生成Git blob一致・許可2ファイル限定を要求する。selector単体は証拠ファイル実在を保証しない。
参照ローカルindexは623問、対象ID未掲載だったが現main本番の未掲載確認には数えない。

## PASSへ必要な生証拠
1. 室町・一揆の対応修正後のmainまたは固定候補コードSHAと、同じ固定問題SHAでのadapter成功出力。unit=歴史・中世、topic_name=室町、master_topic_name=室町・一揆。
2. 現mainおよび本番の両HTML bank全量、対象IDの新規性、追加前後全既存ID・順序・内容保持の機械比較。最大5問と同一差分の報告。
3. 同一候補の3モードを実際に起動した記録。室町章から当該問題へ到達し、正答選択で正解、各誤答で不正解、解説一致が分かる画面または操作ログ。
4. 狭幅画面の実寸スクリーンショットと問題/4肢/採点/解説の欠け・横溢れなしの確認。
5. 同一ブラウザの既存学習履歴を追加前後で比較する生の保存値と、再読込後の履歴継続記録。
6. 同一ID/version/question SHAを束縛した実MD・JSON 3役割、および候補CIの該当run URL・結論・成果物。現候補は未実行。
これら未取得のため技術PASS、LOW、例外なし、READY、公開成功とは判定しない。

