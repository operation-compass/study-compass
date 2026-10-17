'use strict';
// Actual MASTER question fixture; verifies only Web mapping, NOT audit approval.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const q={id:'SC-SOC-HIS-000006',subject:'社会',grade:'中2',unit_major:'歴史',unit_minor:'近世',question_type:'4択',question_text:'江戸幕府を開いた人物は？',choice_a:'豊臣秀吉',choice_b:'徳川家康',choice_c:'徳川吉宗',choice_d:'織田信長',correct_answer:'徳川家康',explanation:'徳川家康は1603年に征夷大将軍となり、江戸幕府を開きました。',version:'v0.1'};
const anchor='const SOCIAL = ';
const load=file=>{const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const start=html.indexOf(anchor);assert(start!==-1,'Missing SOCIAL');const from=start+anchor.length,to=html.indexOf(';',from);assert(to>from,'Missing SOCIAL terminator');return JSON.parse(html.slice(from,to))};
for(const file of ['index.html','legacy-study.html']){
 const before=load(file);
 const i=before.findIndex(x=>x.id===q.id);
 assert(i>=0,'Target must already be present in '+file);
 const after=applyToWeb(before,[q],[q.id]);
 assert.equal(after.length,before.length,'Existing question count must not change');
 for(let n=0;n<before.length;n++)if(n!==i)assert.deepEqual(after[n],before[n],'Other questions must not change');
 assert.deepEqual(after.map(x=>x.id),before.map(x=>x.id),'Question ordering must not change');
 const added=after[i];
 assert.equal(added.id,q.id);
 assert.equal(added.grade,'中2');
 assert.equal(added.unit,'歴史・近世');
 assert.equal(added.answer,'徳川家康');
 assert.deepEqual(added.options,['豊臣秀吉','徳川家康','徳川吉宗','織田信長']);
 assert.equal(added.ex,q.explanation);
 console.log(file+': '+before.length+' IDs/order preserved; only SC-SOC-HIS-000006 eligible for in-memory update.');
}
console.log('PASS: actual existing question Web update mapping verified. Not approved, committed or deployed.');
