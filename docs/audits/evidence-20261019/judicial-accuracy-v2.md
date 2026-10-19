# 独立正確性監査：御成敗式目 v2

- reviewer_id: /root/judicial_accuracy
- checked_at: 2026-10-19T06:19:33.999Z
- ID: SC-SOC-HIS-GAP10-000007
- version: gap10-judicial-purpose-v2
- question_sha256 (13 fields SHA v2): 7a8c5f2ad4349e7eb8aac90065638749d4b3ab81ba855ad014ecf3079a6d4cd6
- role: accuracy
- result: PASS
- risk: LOW
- exception_reason: 空欄

固定候補を読み、リポジトリの13フィールドSHA v2実装で再計算し一致した。他役割の判定・監査証拠は参照していない。候補と正本・外部サービスは変更していない。

## 史実と正答の検証

神奈川県立公文書館の所蔵資料紹介の御成敗式目項目を本文取得した。1232年、鎌倉幕府第3代執権北条泰時、頼朝以来の先例と武家慣習法、御家人の権利義務・裁判基準という説明が一致する。Aはこの特徴を適切に要約している。
https://archives.pref.kanagawa.jp/business/document-guide/chuse.html

神奈川県立図書館の御成敗式目資料解題PDF全2頁を本文取得した。p96は泰時を中心に評定衆が編纂し1232年に公布、裁判規範の性格、所領・訴訟等を扱い幕府御家人を対象とすることを示す。従って解説の土地争いなどを裁く基準という主張は支持される。「北条泰時が定めた」は編纂に関わった他者を排除する表現ではなく、中学教材として許容できる。全領民を一律対象とするとの過剰な主張もない。
https://www.klnet.pref.kanagawa.jp/uploads/2020/12/031goseibaisikimoku.pdf

## 各誤答肢の内容確認

Bは古代律令制度を指す。国土交通省地籍調査サイト本文は701年大宝律令と口分田配分を説明し、国税庁札幌国税局の公式教材検索取得本文は口分田と租庸調の関係を説明する。PDF直接本文抽出は不完全であったが、公式教材の検索取得本文を確認した。御成敗式目には該当せず、朝廷という主体もAと区別できる。
https://www.chiseki.go.jp/about/history/index.html
https://www.nta.go.jp/about/organization/sapporo/education/kyozai/pdf/11.pdf

Cは江戸幕府の武家諸法度を指す。文化庁公式文化遺産データベース本文は、江戸幕府による大名統制と、居城修補・新築制限・婚姻許可を明示している。御成敗式目ではない。
https://online.bunka.go.jp/db/heritages/detail/135304

Dは江戸幕府の公事方御定書を指す。国立国会図書館リサーチ・ナビ本文は1742年成立、吉宗の命、裁判手続・刑罰・判決の基準を説明する。御成敗式目も裁判基準だが、Dは江戸幕府を明記するため第二正答にはならない。国立公文書館の棠蔭秘鑑解説本文でも1742年と刑罰規定を確認した。
https://ndlsearch.ndl.go.jp/rnavi/humanities/post_644
https://www.archives.go.jp/exhibition/digital/shogunnoarchives/contents/30.html

## 判定

正答はAだけで一意。解説の1232年・北条泰時・武士慣習・御家人の土地争いの裁判基準は上記公的機関公式本文で整合する。律令・武家諸法度・公事方御定書との時代および対象の違いも適切。source_urlは固定候補では空欄のままとし、正確性の出典証拠は本MDのURLに保存した。source_url追記など候補SHAを変える編集を行う場合には再監査が必要。

本監査は正確性だけを判定し、重複・画面・公開経路の承認は行わない。
