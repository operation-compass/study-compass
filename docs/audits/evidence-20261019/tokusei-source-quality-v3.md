# 徳政碑史料問題 v3 独立教材品質監査

- id: SC-SOC-HIS-GAP10-000010
- version: gap10-tokusei-source-v3
- question_sha256: ba2b66a5d479a0289648461560fa8a0f2d61c0f7edbd376bba429d74d6a10e29
- role: quality
- reviewer_id: codex-agent-/root/tokusei_source_quality
- checked_at: 2026-10-19T17:19:26+09:00
- result: PASS
- risk: LOW
- exception_reason: （空文字）

この実在サブエージェント実行が独立して判断した。他役割の報告は読んでいない。外部サービスへの変更は行っていない。

## 直接読取と固定条件

Google Sheetsメタデータを読み、問題MASTER sheetId 1614367071、6000行42列を確認。その後正本 1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88 の問題MASTER A1:X6000を直接再読し、ヘッダーを含む5215行（データ5214行）を得た。返却末尾以降は値なし。取得値は outputs/tokusei-source-quality-v3/master-fresh.json に保存。

GitHub APIでmainを直接再読し、6b41724063a08f5dddb7c5d7620bd4184e23bfbdを確認。index.html と legacy-study.html を個別に直接取得して両方のblob SHAが419d74909bd19737345d7457b55c0baf8d98507cであることを確認。file APIの本文が空だったため同じblobをfetch_blobで直接取得した。本文は outputs/tokusei-source-quality-v3/main-shared-blob.html に保存し、Git blob SHA1を実バイトで再計算して同一値を得た。両HTMLは同じblobなので両方に同じ比較結果が成立する。SOCIAL 630件、他5配列を含む計2600項目を解析し確認。候補IDは未掲載。

現在mainの公開設定 enabled=true、参照先 activation approval の explicit_user_activation_approved=true を直接読取。現在mainの docs/audited-sheet-to-web.md も直接取得した。ローカルAGENTS.md、three-stage policy、scheduled promptを読んだ。候補13フィールドをselectorのv2Fieldsとdigestで再計算し指定SHAに一致した。

## 学習目標と学年・難度

目標は室町の民衆の動きに関する短い史料から「負債をなくす措置」を読み取ること。徳政や土一揆という用語だけの再生ではなく、当時の要求内容を理解する。設問自身に室町時代と負目（負債）の注釈があり、碑の正式名や正長の年号を暗記する必要はない。「あるべからず」という短い歴史表現を、選択肢の平易な現代語に対応させる課題であり、中1歴史の標準的な導入史料問題として適切。室町を中2に置く既存レコードがあるが、既存の配当の混在だけで中1不適切とはしない。候補は地侍・土倉等の未注釈専門語を判断条件にしない。

## 全正本・両Webの意味重複

全件の問い・正答・解説を対象に、徳政、負目、負債、正長、借金、一揆および周辺学習内容を照合した。関係行とWebの比較は outputs/tokusei-source-quality-v3/comparison.json。完全同文の別IDも、同じ短い碑文から同じ措置を読み取る別IDもなかった。

正本2265行の同一IDはgap10-draft-v1（要求の名称を「徳政」と答える旧稿）。これは同じIDの改稿元であり別問題との重複ではない。固定候補はまだ正本に反映されていないことを区別する。

近い既存ID SC-SOC-HIS-000145 は農民らの団結行動の名称「土一揆」、000146 は浄土真宗信者の「一向一揆」を問う。候補は碑文の負債取消しの意味を問うため、同じ単元でも必要な判断が異なり、単なる固有名詞の置換問題ではない。応仁の乱、秀吉の刀狩、天保改革の背景等の一揆言及も同一目標ではない。他教科の配列に徳政・負目・正長・借金の関連項目はなかった。

## 四肢・正答・説明・権利

四肢はすべて借金に対する措置であり、取消し・返済期限・利息・返済方法の異なる作用を示す。文字列も意味も4つが独立する。年代違いの用語等を混ぜた消去だけの問題より、負債が残るかどうかを問える。Aのみ負債そのものが消える。B/C/Dは負債が残るため、引用の意味と一致しない。最長文のみを選べるような極端な長さの偏りもない。

奈良市公式 https://www.city.nara.lg.jp/site/bunkazai/95331.html 本文をこの実行で直接開いた。釈文と負債の取り消しという説明を確認。解説は借金取消しと期限延長・利息軽減を区別し、誤答の理由を学習者に返す。碑文の陰刻時期に諸説ある点を断定せず、正長元年の徳政一揆を伝える史料と記す表現で問題ない。古い碑文の短い必要引用と独自の設問・選択肢・要約解説で、現代の問題文や画像の転載はない。教育品質上の権利懸念はLOW。

## 範囲と未主張事項

このPASSは上記ID・版・SHAの教材品質のみ。別実行の正確性・技術、Sheetsへの反映、READY、CI、本番公開成功を代替しない。本文取得のため試みたraw GitHubのshell通信はソケット拒否で未取得となったが、認証コネクタfetch_blobで公式blob本文を取得し実SHAを照合して解消した。ツール自動承認審査の拒否ではない。

