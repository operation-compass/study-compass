# 荘園 v2 独立技術監査 r2

- reviewer_id: /root/shoen_technical
- checked_at: 2026-10-19T04:15:32Z
- question_id: SC-SOC-HIS-GAP10-000006
- version: gap10-shoen-review-v2
- question_sha256 (v2/13 fields): e393a6bf3c2788d2047bd7a233fde005507a0023d852a8440207b84126e5f53b
- result: PASS / risk: LOW / exception: none
- 適用範囲: PR26 head f9012684b212b88777a0b2adf18675ae223eaab3 のadapter修正を適用した固定候補。未修正mainへのPASSではない。公開前に当該修正の統合・同一性確認が必要。

## 独立再確認

他役割の結論は読んでいない。初回の現main技術HOLDはshoen-technical-v2.md/jsonに保持し、本r2が削除・上書きしていない。候補13フィールドSHAに変更なし。

現main 800ce3156cd6decc0a1b4e7d0fefc048204ccfedをGitHubで直接取得し、index.html/legacy-study.htmlのblobが双方4c5f21a37a039abe8319ee697503e0660b0bf702で一致すること、実本文629問・候補未掲載を確認した。ローカル隔離baselineはgit blob再計算でも一致した。古いroot問題集を判定基準にしていない。

PR26固定headのadapterとtestをGitHubから直接再取得して内容レビューした。変更は平安・荘園のperiodを古代、Web topicを平安へ対応付け、master_topic_nameに元詳細を保存するもの。既存の鎌倉・統治、最大5問、READY除外、型・学年・subject・未対応unit拒否を緩和していない。全adapter回帰を実行し成功。実629問に固定候補を適用して先頭629オブジェクト・順序の完全一致、630問への1問追加、平安18→19、unit歴史・古代/detail平安・荘園を確認した。HISTORY_CHAPTERSの完全一致条件に平安が存在し、対象が古代章・平安ボタンに含まれる。

GitHubで固定headのworkflowを直接取得し、39180693404「Verify automatic publication safety (offline)」completed/successを確認した。これはコード候補CIであり、問題の本番公開の証明とは別である。

## UIと履歴：親operatorの生証拠を独立評価

ブラウザ操作は親/rootがoperatorとして実行した。私は候補適用した隔離HTMLを作成し、その生trace・画像・UI exportを独立レビューした。自分が全操作を行ったとは主張しない。

隔離previewは上記main HTMLに候補SOCIAL・review title・隔離KEYのみを変更し、3mode開始用scriptを加えたもの。KEYはstudy-compass-shoen-review-v2-history。DAY=86400000定数を保持。SOCIAL/KEY/title差分を戻すと元main HTMLとバイト一致することをassertで確認した。

operator-trace.jsonのDOM実測は全mode innerWidth390/innerHeight844。4択clientWidth375/scrollWidth375、問題だけ390/390、カード390/390で横はみ出しなし。MCQ、誤答フィードバック、正答結果、問題だけ解答表示、カード裏の実画像を視認し、長い対比選択肢・解答・解説が読めることを確認した。誤答は0/1・0%、リロード後の正答は1/1・100%、個人記録は累積1/2・50%。選択肢順序が変わっても文字列で正答採点される。問題だけは4肢を隠して答えを表示、カードは表から裏への解答・解説表示が成立。history-hub traceに平安19問を確認した。

history-before.jsonの2 graded events（incorrect/correct）がhistory-after.jsonの先頭2件と全フィールド完全一致し、question-onlyのviewed1件だけが正規追加されたことをassertした。さらにページ再読み込み後UIから保存したhistory-reloaded.jsonはhistory-after.jsonと実バイト一致し、SHA双方9e8e87b3aca7c4d1bc402f17f848c8dcecfdbd304c29ef612d7240259b581ba5。記録を削除・改変せず維持できている。

## 未確認範囲

本PASSは候補と修正adapterの隔離検証であり、PR統合、正本更新、GAS認証同期、本番配信・本番照合の完了を主張しない。簡易HTTP previewはCloudflare workerの配信経路を実行していない。実障害復旧や予約実行完走も本監査対象外。既存の固定候補CI・認証同期・公開ガードを引き続き要求する。正本・外部状態を本監査者は変更していない。

## 生証拠保存先

outputs/shoen-route-fix/operator-trace.json、各390.png、history-before.json、history-after.json、history-reloaded.json。生成・基準説明はbuild-preview.cjsとshoen-preview/manifest.json。下記は監査時の実バイトSHA。

- correct-result390.png: a7b3cc2848a4a3d0c08780c0d8ad120c7fece69e3cd4a8fd1707a8ce895b784c
- flashcard-answer390.png: a18f6612a4078e40cc2e17becd94046156652f7b83762b89089f7178ea5f39cb
- flashcard390.png: 263d7dd93ed0a83c7485e16a731b03606c533e03efa0e45712f2aa35928b62ae
- history-after.json: 9e8e87b3aca7c4d1bc402f17f848c8dcecfdbd304c29ef612d7240259b581ba5
- history-before.json: c59af7ba872a9dac60ac50c86350ef011406f56708ea1a9fddf9f2bceb653b21
- history-hub390.png: 2995ff0f262d410fe30f8586a24e080fa0a10595c6b093535ce158432b4bb518
- history-reloaded.json: 9e8e87b3aca7c4d1bc402f17f848c8dcecfdbd304c29ef612d7240259b581ba5
- mcq390.png: 8605927059adda80c41a66c07e0d3833fed97ee628483f3b6c7abc699816548a
- operator-trace.json: 8ad198b72f771587863dc6b66bf0eb9516939b3d394348692730f508928d14f6
- question-answer390.png: cca87c87323e0d895459dbefcc27ee47855a7fbda2fd1a209fcd9de5541afcdc
- question390.png: 572501e6ee90cc5bd924cd93d56710f704ab09eaee533e67662156ba1c05c289
- wrong-result390.png: b0a54502258da7b65e39770f7235a227450b9b2c6cad1d48a3240dafbbf96242
- wrong390.png: 8d430dd95815f64dfbc4974de354db811ed14ebfd43b36aa52a1c89595168534
