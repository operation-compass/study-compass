# 徳政碑 v3 独立 technical audit

- reviewer_id: codex:/root/tokusei_source_technical
- checked_at: 2026-10-19T08:19:55.994Z
- id: SC-SOC-HIS-GAP10-000010
- version: gap10-tokusei-source-v3
- question_sha256: ba2b66a5d479a0289648461560fa8a0f2d61c0f7edbd376bba429d74d6a10e29
- result: PENDING

GitHub connectorのbranches/mainとgit/trees/mainを直接取得し、main 6b41724063a08f5dddb7c5d7620bd4184e23bfbd、index.html/legacy-study.html両blob 419d74909bd19737345d7457b55c0baf8d98507cを確認。親が保存したbase-main.htmlについて自分でGit blob SHA1を再計算し一致を確認。currentmain adapter、adapter regression、selector、prepareをコミット固定URLから直接取得。ローカル旧adapterは基準にしていない。公開enabled=trueと既存の明示承認記録も現在mainから直接取得。公開ガード変更と外部更新なし。

現行adapterは室町・一揆を拒否するため、このままでは公開不可。隔離outputs/tokusei-source-route/adapt-drive-to-web.cjsでperiod室町・一揆→中世、topic→室町、master_topic_name→室町・一揆の2行最小修正。未対応単元・地理・不正学年の拒否、最大5問、READY集合を維持。現行main regressionを隔離adapterに対して実行し全成功。独立したbuild-preview.cjsで既存630件をdeepEqual、全ID順序保持、1問appendにより631件、室町23→24、候補未監査時のselector HOLD、13フィールドv2 SHA一致を確認。

両preview HTMLとtest-mcq/question/flashcard.htmlを作成。history KEYだけstudy-compass-tokusei-source-v3-historyへ隔離し、DAY=86400000維持。REVIEW ONLY title付与。bank/key/titleの差分を戻したbytesが基準HTMLと一致。候補は中1、歴史・中世、室町章へルーティングしMASTER詳細保持。

保留: 実ブラウザでの3モード採点・狭幅レイアウト・保存/再読と既存履歴保持のraw証拠を未受領。現行mainへのadapter修正反映と候補CIも未実行。以上をPASSと扱わずPENDING/HOLD。独立内容監査の他役割報告は参照していない。
