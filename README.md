# Study COMPASS α Prototype

スマホ向けの最小実働デモです。

## 実装済み
- HOME
- 今日の10問
- 社会の○× / 一問一答
- 回答直後の解説
- 10問結果
- 間違いだけ復習
- 英単語カード
- Web Speech API による英単語読み上げ
- localStorage による端末内学習履歴

## 注意
- これはα版のUI/挙動確認用です。
- 問題は公開前のCHECKデータ相当です。正式公開前に教材・公的資料で検証してください。
- GitHub/Cloudflare公開前に問題DBからREADYデータのみを書き出す処理へ置き換える想定です。

## 次の実装
1. Drive問題DB → 公開JSONの生成
2. 問題のREADY/HOLD反映
3. 5教科対応
4. PWA manifest / service worker
5. OGP / sitemap / privacy
6. ログインは後回し
