'use strict';
// Pinned snapshot derived from MASTER A5210:W5212, read-only as of 2026-10-23.
// Detects edits in browser fixtures; this does NOT re-fetch live Drive.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('scripts/test-browser-learning-isolated.cjs','utf8');
const rows=[
 ['SC-SOC-HIS-WEB26-000001','708年に発行され、律令国家が普及を進めた日本の銅銭は？','和同開珎','富本銭','開元通宝','寛永通宝','和同開珎','和同開珎は708年発行。富本銭はそれ以前に作られた貨幣であり、和同開珎を日本最初の貨幣と断定するのは不適切。'],
 ['SC-SOC-HIS-WEB26-000002','飛鳥池遺跡で作られ、和同開珎より古い7世紀後半の貨幣は？','和同開珎','富本銭','開元通宝','永楽通宝','富本銭','富本銭は飛鳥池遺跡で製造され、和同開珎より古い7世紀後半の鋳造貨幣。'],
 ['SC-SOC-HIS-WEB26-000003','708年の和同開珎がモデルにした唐の貨幣は？','富本銭','永楽通宝','開元通宝','寛永通宝','開元通宝','日本銀行貨幣博物館によれば、和同開珎は唐の開元通宝をモデルとして発行された。']
];
test('candidate browser fixtures match pinned MASTER snapshot',()=>{
 for(const [id,q,a,b,c,d,answer,ex] of rows){
  assert(source.includes("id:'"+id+"'"),id+' missing');
  assert(source.includes("q:'"+q+"'"),id+' question mismatch');
  assert(source.includes("answer:'"+answer+"'"),id+' answer mismatch');
  assert(source.includes("options:['"+[a,b,c,d].join("','")+"']"),id+' options mismatch');
  assert(source.includes("ex:'"+ex+"'"),id+' explanation mismatch');
 }
});
test('pinned snapshot is not confused with authenticated current Drive evidence',()=>{
 assert.equal(rows.length,3);
 assert(!source.includes('監査専用の仮解説'));
});
