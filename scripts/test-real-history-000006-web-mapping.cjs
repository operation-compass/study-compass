'use strict';
// Actual MASTER question fixture; verifies only Web mapping, NOT audit approval.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const q={id:'SC-SOC-HIS-000006',subject:'社会',grade:'中2',unit_major:'歴史',unit_minor:'近世',question_type:'4択',question_text:'江戸幕府を開いた人物は？',choice_a:'豊臣秀吉',choice_b:'徳川家康',choice_c:'徳川吉宗',choice_d:'織田信長',correct_answer:'徳川家康',explanation:'徳川家康は1603年に征夷大将軍となり、江戸幕府を開きました。',version:'v0.1'};
const anchor='const SOCIAL = ';
const load=file=>{const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const start=html.indexOf(anchor);assert(start!==-1,'Missing SOCIAL');const from=start+anchor.length,to=html.indexOf(';',from);assert(to>from,'Missing SOCIAL terminator');return JSON.parse(html.slice(from,to))};
for(const file of ['index.html','legacy-study.html']){
 const before=load(file);
 assert(!before.some(x=>x.id===q.id),'Target already present in '+file);
 const after=applyToWeb(before,[q],[q.id]);
 assert.equal(after.length,before.length+1);
 assert.deepEqual(after.slice(0,before.length),before,'Existing questions must not change');
 const added=after.at(-1);
 assert.equal(added.id,q.id);
 assert.equal(added.grade,'中2');
 assert.equal(added.unit,'歴史・近世');
 assert.equal(added.answer,'徳川家康');
 assert.deepEqual(added.options,['豊臣秀吉','徳川家康','徳川吉宗','織田信長']);
 assert.equal(added.ex,q.explanation);
 console.log(file+': '+before.length+' existing unchanged; SC-SOC-HIS-000006 appended in memory only.');
}
console.log('PASS: actual question Web mapping verified. Not approved, committed or deployed.');
