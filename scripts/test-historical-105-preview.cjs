'use strict';
// Dry-run against both real Web files; deliberately does not change or deploy anything.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const id='SC-SOC-HIS-000105';
const c={id,subject:'社会',question_type:'4択',question_text:'江戸幕府が大名を統制するために定めた法令は？',choice_a:'公事方御定書',choice_b:'武家諸法度',choice_c:'御成敗式目',choice_d:'十七条の憲法',correct_answer:'武家諸法度',explanation:'武家諸法度は江戸幕府が大名を統制するために定めた法令です。1615年に徳川秀忠の時代に最初の法度が出され、城の修築や婚姻など、大名の行動に幕府の統制を及ぼしました。参勤交代は別の大名統制の制度です。',version:'v0.3'};
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const sha=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(c[k]??'')))).digest('hex');
assert.equal(sha,'5448c673dec635f8ce3d45205654a064ee932d1d5a7e2c549743d503924d27f4');
function extract(s){const k='const SOCIAL = ',p=s.indexOf(k);assert(p>=0);const start=p+k.length;return JSON.parse(s.slice(start,s.indexOf(';',start)))}
for(const file of ['index.html','legacy-study.html']){
 const before=extract(fs.readFileSync(path.join(__dirname,'..',file),'utf8')),after=applyToWeb(before,[c],[id]);
 assert.equal(before.length,623);assert.equal(after.length,before.length);
 assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id),'IDs and order preserved');
 const changes=before.filter((x,i)=>JSON.stringify(x)!==JSON.stringify(after[i]));
 assert.equal(changes.length,1,'Only the intended question may change');
 assert.equal(changes[0].id,id);
 assert.deepEqual(applyToWeb(before,[c],[]),before,'HOLD must be a complete no-op');
 assert.equal(after.find(x=>x.id===id).answer,'武家諸法度');
 console.log(file+': dry-run 1 updated / 623 preserved, SHA and HOLD verified');
}
