# 正倉院資料読解 v3・独立技術監査

担当: codex-independent-technical-shosoin-v3-20261017。対象: SC-SOC-HIS-GAP10-000004 / gap10-shosoin-source-v3。認証済み正本エクスポートではなく独立審査用草案。

- GitHub本番main 8e8531ba327404d7ccc80b85ede75beb956ad289 のHTML blob 8a74f4d9258465b931bdc4883ca69e0b5fc95166 をconnectorで取得。実体からGit blob SHAを再計算し一致を確認。本番は2597問、社会627問、対象IDは未掲載。
- 13フィールドSHA v2を独立計算し13a2f446b71ee10172039c22393c199af7a1d89ea4e399de9b9b784fd41f0100と一致。4肢は文字列重複なし、記録正答は選択肢1件に一致。内容上の正答一意性は独立正確性・品質監査で別に検証する。
- 対象1件だけを本番基準の隔離プレビューへ追記し2598問・社会628問。既存社会627問のデータと順序を全件比較で保持。問題・選択肢・正答・解説が変換後も一致。詳細単元「奈良・文化」はtopic_nameに保持し、Webの既存「歴史・古代」へ対応。
- 両HTMLの2598問構造・公開禁止ID、現行/除外履歴保全、補助教材の採点・ストレージ失敗系を含む回帰が成功。監査証拠なし草案を公開selectorへ渡すとREADY0件。

技術判定: **PENDING**。最終判定: **HOLD**。全モード・実採点・モバイルUIのroot保存証拠を待ち、独立照合するまで技術PASSを発行しない。

再現: run-technical-shosoin-v3.cjs。プレビュー: outputs/shosoin-v3-preview/。正本・本番・GAS・定期タスクは変更していない。

## UI証拠独立照合後の最終判定

root担当が取得した実ブラウザ証拠を、本監査担当がファイルから独立に検討した。

- shosoin-v3-mcq-correct.txtで正答選択後の「正解。その調子！」、正答全文、草案と一致する解説、回答済み選択肢と補助ボタンの無効化を確認。shosoin-v3-mcq-wrong.txtで農民税負担の誤答選択後の「ここで覚えていこう。」、選択誤答と正答全文・解説の表示を確認。
- shosoin-v3-browser-observations.jsonのmcq/question/flashcard各前後AX全文を照合。4択採点、問題だけの答え・解説展開、カードをめくった後の答え・解説と「まだ/覚えた」が対象v3内容に一致。mcq/questionは歴史・古代、カードは詳細単元奈良・文化として表示される。
- 3枚のshosoin-v3-mobile-{mcq,question,flashcard}.jpg全ページ画像を視認。長い資料文・全選択肢・解説・操作ボタンが欠けず表示。幅390pxに対してscrollWidth375px、内容に応じた縦スクロールで、横方向のはみ出しなし。
- 3個のtest-*.htmlから指定ID/モード起動scriptだけ除去した実体は、監査済みindex.htmlプレビューとtrim後全文一致。試験のために教材bank・描画・採点ロジックを差し替えていない。

最終技術判定: **PASS**。SC-SOC-HIS-GAP10-000004 / gap10-shosoin-source-v3 / SHA v2 13a2f446b71ee10172039c22393c199af7a1d89ea4e399de9b9b784fd41f0100 の内容に限定する。旧v2の内容FAIL/HOLDは旧版の記録として保持し、本判定で書き換えない。

公開成功数は本監査では0。正本・版・SHAの認証済み照合、公開差分のCI、本番デプロイ・実表示確認は後続の公開経路で別に必須。本技術PASSだけで公開済みを意味しない。
