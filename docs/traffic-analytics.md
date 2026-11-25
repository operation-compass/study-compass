# SHIRUNOERA 匿名アクセス集計 V1

## 有効化の前提（2026-11-25）
Cloudflareのエラー10089により初回公開は拒否された。学習サイトを止めないため、既定ではバインディングを無効化する。Cloudflare管理画面で Workers Analytics Engine を有効化し、料金・利用条件を確認した後、GitHubリポジトリの Actions Variables に `SHIRUNOERA_ANALYTICS_ENABLED=true` を設定して Deploy ワークフローを再実行する。データセットの生成・実際の集計値の取得を確認するまでは計測開始と扱わない。停止は変数を false にして再デプロイする。閲覧用トークンは別途最小権限で作成し、一般公開しない。

Cloudflare Workers Analytics Engine: `shirunoera_traffic_v1`

対象は正常に返された総合ホーム・高校受験・一問一答の GET ページリクエスト。閲覧の近似値であり、ユニーク訪問者数・セッション数・完了率ではない。内部遷移は internal。外部流入は許可済みUTM媒体名を優先、次に参照元ドメインの分類、判別不能は direct_or_unknown。生URL、IP、個人ID、回答内容、学習履歴、自由入力のUTM値は独自集計に書き込まない。DNT/GPC、既知のボット、プリフェッチ、自動検証用アクセスを除外するが完全な除外は保証しない。Cloudflare自体の通常のインフラ処理とは別。

|列|内容|
|---|---|
|blob1|portal / high_school / quiz|
|blob2|許可済み媒体 / internal / other / direct_or_unknown|
|blob3|quizの指定教科（5教科）または none|
|double1|1|
|index1|ページ分類|

管理者専用SQL API（Account Analytics Read権限。公開ページやGitHubリポジトリにトークンを記載しない）:

```sql
SELECT blob2 AS source, SUM(_sample_interval) AS requests
FROM shirunoera_traffic_v1
WHERE timestamp >= NOW() - INTERVAL '7' DAY AND blob2 != 'internal'
GROUP BY source ORDER BY requests DESC
```

```sql
SELECT blob1 AS page, SUM(_sample_interval) AS requests
FROM shirunoera_traffic_v1
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY page ORDER BY requests DESC
```

```sql
SELECT blob3 AS subject, SUM(_sample_interval) AS requests
FROM shirunoera_traffic_v1
WHERE timestamp >= NOW() - INTERVAL '7' DAY AND blob1='quiz' AND blob3!='none'
GROUP BY subject ORDER BY requests DESC
```

集計の閲覧はCloudflare管理画面または認証されたSQL API。データセットは最初の書き込み時に作成される。閲覧権限とデータ取得は別途確認する。公開レポートAPIは設けない。媒体別リンクは utm_source=instagram/tiktok/youtube/x を使用。過去の未計測データは復元しない。
