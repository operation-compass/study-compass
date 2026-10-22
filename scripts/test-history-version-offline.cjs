'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {patch}=require('./patch-history-version-offline.cjs');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const base={id:'SC-SOC-HIS-WEB26-000001',version:'v0.1',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'奈良・文化',question_type:'4択',question_text:'708年に発行された銅銭は？',choice_a:'和同開珎',choice_b:'富本銭',choice_c:'開元通宝',choice_d:'寛永通宝',correct_answer:'和同開珎',explanation:'708年発行'};
test('new Web data retains actual version without touching previous entries',()=>{const old=[{id:'LEGACY',q:'old',answer:'甲',options:['甲','乙','丙','丁'],ex:'old',subject:'社会'}];const result=applyToWeb(old,[base],[base.id]);assert.deepEqual(result[0],old[0]);assert.equal(result[1].version,'v0.1');assert.equal(result[1].answer,'和同開珎')});
for(const filename of ['index.html','legacy-study.html']){
 test(filename+' actual response recorder uses version, retains legacy fallback and storage key',()=>{
 const raw=fs.readFileSync(filename,'utf8'),edited=patch(raw);
 assert(edited.includes("question_version:q.version||'v0.3-CHECK'"));
 assert(edited.includes("const KEY='studyCompassAlphaV3'"));
 assert.equal(edited.split("question_version:q.version||'v0.3-CHECK'").length-1,1);
 assert.equal(edited.split("question_version:'v0.3-CHECK'").length-1,raw.split("question_version:'v0.3-CHECK'").length-2);
 assert.equal(edited.length>0,true);
 });
}
test('ambiguous old source or storage key changes are rejected',()=>{assert.throws(()=>patch("question_version:'v0.3-CHECK'"),/storage key/);assert.throws(()=>patch("const KEY='studyCompassAlphaV3'"),/exactly one/)});
