#!/usr/bin/env python3
"""Read-only operator report. No external dependencies, no credential or result files."""
import argparse
import datetime as dt
import getpass
import json
import os
import re
import sys
import urllib.request
import urllib.error

DATASET = "shirunoera_traffic_v1"
JST = dt.timezone(dt.timedelta(hours=9))
SOURCES = {"instagram":"Instagram","tiktok":"TikTok","youtube":"YouTube","x":"X","google":"Google","bing":"Bing","yahoo":"Yahoo","facebook":"Facebook","threads":"Threads","chatgpt":"ChatGPT","other":"その他","direct_or_unknown":"直接・不明","internal":"サイト内"}
PAGES = {"portal":"総合ホーム","high_school":"高校受験","quiz":"一問一答"}
SUBJECTS = {s:s for s in ("国語","数学","英語","理科","社会")}

def queries(days):
    if type(days) is not int or not 1 <= days <= 30:
        raise ValueError("days must be 1..30")
    where = f"timestamp >= NOW() - INTERVAL '{days}' DAY"
    return {
        "source": f"SELECT blob2 AS label, SUM(_sample_interval) AS requests FROM {DATASET} WHERE {where} AND blob2 != 'internal' GROUP BY label ORDER BY requests DESC",
        "page": f"SELECT blob1 AS label, SUM(_sample_interval) AS requests FROM {DATASET} WHERE {where} GROUP BY label ORDER BY requests DESC",
        "subject": f"SELECT blob3 AS label, SUM(_sample_interval) AS requests FROM {DATASET} WHERE {where} AND blob1='quiz' AND blob3!='none' GROUP BY label ORDER BY requests DESC",
    }

def query(account, token, sql):
    if not re.fullmatch(r"[a-fA-F0-9]{32}", account):
        raise ValueError("Cloudflare account ID must be 32 hexadecimal characters")
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{account}/analytics_engine/sql"
    req = urllib.request.Request(endpoint, data=(sql+" FORMAT JSON").encode(),
        headers={"Authorization":"Bearer "+token,"Content-Type":"text/plain"}, method="POST")
    # Never forward an authorization header to a redirect target.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):
            return None
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=25) as resp:
            payload=json.loads(resp.read(1024*1024))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Cloudflare HTTP {e.code}: 権限・データセット・設定を確認してください") from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError("Cloudflareの応答を取得または解析できません") from None
    if not isinstance(payload,dict) or not isinstance(payload.get("data"),list):
        raise RuntimeError("集計結果の形式が不正です")
    return payload["data"]

def validated(rows, labels):
    result={}
    for row in rows:
        if not isinstance(row,dict) or row.get("label") not in labels:
            raise ValueError("未知の集計分類")
        k=row["label"]
        raw=row.get("requests")
        if isinstance(raw,bool) or not re.fullmatch(r"[0-9]+",str(raw)):
            raise ValueError("不正な件数")
        if k in result:
            raise ValueError("重複した分類")
        result[k]=int(raw)
    return result

def report(results, days, now=None):
    now=now or dt.datetime.now(JST)
    chunks=[f"SHIRUNOERA 運営アクセスレポート | 直近{days}日 | {now:%Y-%m-%d %H:%M} JST",
      "ページリクエストの推計値。訪問者数・セッション数・完了率ではありません。"]
    for key,title,labels in (("source","外部流入元（直接・不明を含む）",SOURCES),("page","ページ別",PAGES),("subject","教科指定の演習ページ",SUBJECTS)):
        rows=validated(results[key],labels)
        total=sum(rows.values())
        chunks.append(f"\n{title} | {total:,}件")
        if not total:
            chunks.append("  対象期間の記録なし（計測状態の確認が必要）")
            continue
        for k,n in sorted(rows.items(),key=lambda p:(-p[1],p[0])):
            chunks.append(f"  {labels[k]}: {n:,}件 ({n/total:.1%})")
    chunks.append("\n注意：未判別流入・ボット・計測除外・サンプリングの影響があります。")
    return "\n".join(chunks)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--days",type=int,choices=range(1,31),default=7)
    p.add_argument("--account",default=os.environ.get("CLOUDFLARE_ACCOUNT_ID"))
    args=p.parse_args()
    account=args.account or input("Cloudflare account ID: ").strip()
    token=os.environ.get("CLOUDFLARE_ANALYTICS_READ_TOKEN") or getpass.getpass("Analytics read-only token (hidden): ")
    if not token:
        print("読み取りトークンが必要です。",file=sys.stderr);return 2
    try:
        results={key:query(account,token,sql) for key,sql in queries(args.days).items()}
        print(report(results,args.days))
    except (RuntimeError,ValueError,TypeError,KeyError) as e:
        print("取得失敗: "+str(e),file=sys.stderr);return 1
    return 0

if __name__=="__main__":
    sys.exit(main())
