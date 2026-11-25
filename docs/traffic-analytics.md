# SHIRUNOERA 匿名アクセス集計 V1

## 有効化の前提（2026-11-25）
Cloudflareのエラー10089により初回公開は拒否された。学習サイトを止めないため、2026-11-25に利用者がCloudflare管理画面で有効化操作を実施したと報告。以降は既定でバインディングを有効化する。アカウント未有効化エラー10089が再発した場合のみ、バインディングなしで再デプロイし、学習サービスを維持する。停止したい場合は GitHub Actions Variables に `SHIRUNOERA_ANALYTICS_ENABLED=false` を設定する。データセットの生成・実際の集計値の取得を確認するまでは計測開始と扱わない。停止は変数を false にして再デプロイする。閲覧用トークンは別途最小権限で作成し、一般公開しない。

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

## 運営者専用レポート（初期版）

実測データの読取はまだ未確認。Cloudflare公式の Analytics Engine SQL API を利用するローカル専用CLIを追加した。第三者への送信、公開GitHub Actionsでの実測値出力、Web公開API、認証情報の保存は行わない。

1. CloudflareのAPIトークン画面でアカウントを限定した Account / Account Analytics / Read のカスタムトークンを作成する。既存のデプロイ用トークンは流用しない。
2. 信頼できるPCでリポジトリを取得し、`python scripts/traffic-report.py --days 7` を実行する。アカウントIDと非表示入力のトークンを入力する。
3. 3種類の集計が取得できたときだけ実測として扱う。エラーは未取得、空データは対象期間に記録がない状態と区別する。

定例レビュー：直近7日を毎週確認し、外部流入元・ページ別・教科指定演習ページの件数を比較する。最初の1週間は基準値の確立を優先し、少数のアクセスから優劣を断定しない。ページリクエスト数からユニーク訪問者数や学習完了率を算出しない。トークンはチャット・公開ファイル・URLに貼らない。
