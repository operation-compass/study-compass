'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('gas/sc-live-master-drift-preview.gs','utf8');
const ids=['SC-SOC-HIS-WEB26-000001','SC-SOC-HIS-WEB26-000002','SC-SOC-HIS-WEB26-000003'];
const header=['question_id','status','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation','memory_tip','difficulty','importance','source_type','source_url','verified_date','reviewer','version','publish_flag'];
const rows=[
[ids[0],'CHECK','社会','中1','歴史','奈良・文化','4択','708年に発行され、律令国家が普及を進めた日本の銅銭は？','和同開珎','富本銭','開元通宝','寛永通宝','和同開珎','和同開珎は708年発行。富本銭はそれ以前に作られた貨幣であり、和同開珎を日本最初の貨幣と断定するのは不適切。','','1','A','公的資料','https://www.imes.boj.or.jp/cm/history/content/index.html','2026-10-18','','v0.1','FALSE'],
[ids[1],'CHECK','社会','中1','歴史','奈良・文化','4択','飛鳥池遺跡で作られ、和同開珎より古い7世紀後半の貨幣は？','和同開珎','富本銭','開元通宝','永楽通宝','富本銭','富本銭は飛鳥池遺跡で製造され、和同開珎より古い7世紀後半の鋳造貨幣。','','2','A','公的資料','https://kunishitei.bunka.go.jp/heritage/detail/201/00012104','2026-10-18','','v0.1','FALSE'],
[ids[2],'CHECK','社会','中1','歴史','奈良・文化','4択','708年の和同開珎がモデルにした唐の貨幣は？','富本銭','永楽通宝','開元通宝','寛永通宝','開元通宝','日本銀行貨幣博物館によれば、和同開珎は唐の開元通宝をモデルとして発行された。','','2','A','公的資料','https://www.imes.boj.or.jp/cm/history/content/index.html','2026-10-18','','v0.1','FALSE']
];
function run(data=rows,headers=header){
 const sheet={getLastRow(){return data.length+1},getRange(row,col,numRows,numCols){assert.equal(col,1);assert.equal(numCols,23);return {getDisplayValues(){return row===1?[headers]:data.slice(0,numRows)}}}};
 const context={SpreadsheetApp:{openById(id){assert.equal(id,'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88');return {getSheetByName(name){assert.equal(name,'問題MASTER');return sheet}}}},Logger:{log(){}},Date};
 vm.runInNewContext(source,context,{timeout:2000});
 return JSON.parse(JSON.stringify(context.studyPreviewThreeCoinsLiveDriftReadOnly()));
}
test('current MASTER snapshot matches and ALWAYS holds publication',()=>{const r=run();assert.equal(r.unchanged,true);assert.equal(r.blockers.length,0);assert.equal(r.release_authorized,false);assert.equal(r.production_permission,'HOLD')});
test('text change is detected',()=>{const r=rows.map(x=>x.slice());r[0][7]+='変更';assert(run(r).blockers.some(x=>x.issue==='MASTER_FIELD_CHANGED'&&x.column===8))});
test('duplicate/missing IDs block',()=>{assert(run([...rows,rows[0]]).blockers.some(x=>x.issue==='ID_COUNT'));assert(run(rows.slice(1)).blockers.some(x=>x.issue==='ID_COUNT'))});
test('READY or TRUE never lifts HOLD',()=>{const r=rows.map(x=>x.slice());r[1][1]='READY';r[1][22]='TRUE';const out=run(r);assert.equal(out.unchanged,false);assert.equal(out.release_authorized,false);assert(out.blockers.some(x=>x.issue==='MASTER_NOT_CHECK'));assert(out.blockers.some(x=>x.issue==='MASTER_PUBLISH_FLAG_NOT_FALSE'))});
test('column schema change fails closed',()=>{const h=header.slice();h[7]='renamed';assert.throws(()=>run(rows,h),/MASTER_SCHEMA_CHANGED_COLUMN_8/)});
