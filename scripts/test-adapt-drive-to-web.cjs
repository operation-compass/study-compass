'use strict';
const assert=require('node:assert/strict'),{applyToWeb}=require('./adapt-drive-to-web.cjs');
const old=[{id:'A',subject:'社会',grade:'中2',unit:'歴史・中世',q:'Original',answer:'A',options:['A','B','C','D'],ex:'Old'}, {id:'B',subject:'数学',q:'Keep',answer:'2'}];
const candidate={id:'A',subject:'社会',question_type:'4択',question_text:'Updated',choice_a:'C',choice_b:'A',choice_c:'D',choice_d:'B',correct_answer:'A',explanation:'Explained'};
assert.deepEqual(applyToWeb(old,[candidate],[]),old);
const out=applyToWeb(old,[candidate],['A']);
assert.equal(out[0].grade,'中2');assert.equal(out[0].unit,'歴史・中世');assert.equal(out[0].q,'Updated');
assert.equal(out[1].q,'Keep');assert.equal(out.length,old.length);
assert.throws(()=>applyToWeb(old,[{...candidate,correct_answer:'Missing'}],['A']),/Answer/);
assert.throws(()=>applyToWeb(old,[candidate],['Unknown']),/Missing ready candidate|not found/);
assert.throws(()=>applyToWeb(old,[{...candidate,subject:'国語'}],['A']),/Subject/);
console.log('Drive-to-Web adapter preservation tests passed; no production changes.');

const newCandidate={...candidate,id:'NEW-001',grade:'中2',unit_major:'歴史',unit_minor:'近世'};
const expanded=applyToWeb(old,[newCandidate],['NEW-001']);
assert.equal(expanded.length,old.length+1);
assert.equal(expanded[2].unit,'歴史・近世');
assert.deepEqual(expanded.slice(0,old.length),old);
assert.throws(()=>applyToWeb(old,[{...newCandidate,grade:''}],['NEW-001']),/grade required/);
assert.throws(()=>applyToWeb(old,[{...newCandidate,unit_minor:''}],['NEW-001']),/unit metadata/);
assert.deepEqual(applyToWeb(old,[newCandidate],[]),old);
console.log('New READY question safe append and HOLD exclusion passed.');

assert.throws(()=>applyToWeb(old,[candidate],['A','A']),/Duplicate READY ID/);
assert.throws(()=>applyToWeb(old,[candidate],['A','B','C','D','E','F']),/exceeds five-question limit/);
console.log('Release adapter batch limits and duplicate protections passed.');

for(const topic of ['律令・軍事','奈良・文化']){
 const q={...newCandidate,unit_minor:topic};
 assert.deepEqual(applyToWeb(old,[q],[]),old,'Unapproved topic must remain excluded');
 const mapped=applyToWeb(old,[q],[q.id]);
 assert.equal(mapped.at(-1).unit,'歴史・古代');
 assert.equal(mapped.at(-1).topic_name,topic);
 assert.deepEqual(mapped.slice(0,old.length),old);
 assert.throws(()=>applyToWeb(old,[{...q,unit_major:'地理'}],[q.id]),/Unsupported new question Web unit/);
}
assert.throws(()=>applyToWeb(old,[{...newCandidate,unit_minor:'未対応単元'}],[newCandidate.id]),/Unsupported new question Web unit/);
console.log('Ancient military and Nara culture route correctly; approval and subject boundaries remain enforced.');

const kamakura={...newCandidate,unit_minor:'鎌倉・統治'};
const kamakuraOut=applyToWeb(old,[kamakura],[kamakura.id]);
assert.equal(kamakuraOut.at(-1).unit,'歴史・中世');
assert.equal(kamakuraOut.at(-1).topic_name,'鎌倉');
assert.equal(kamakuraOut.at(-1).master_topic_name,'鎌倉・統治');
assert.deepEqual(kamakuraOut.slice(0,old.length),old);
assert.deepEqual(applyToWeb(old,[kamakura],[]),old);
assert.throws(()=>applyToWeb(old,[{...kamakura,grade:'中1〜中3'}],[kamakura.id]),/grade required/);
assert.throws(()=>applyToWeb(old,[{...kamakura,unit_major:'地理'}],[kamakura.id]),/Unsupported new question Web unit/);
console.log('Kamakura governance routes to medieval history without losing MASTER topic or weakening approval/grade gates.');

const shoen={...newCandidate,grade:'中1',unit_minor:'平安・荘園'};
const shoenOut=applyToWeb(old,[shoen],[shoen.id]);
assert.equal(shoenOut.at(-1).unit,'歴史・古代');
assert.equal(shoenOut.at(-1).topic_name,'平安');
assert.equal(shoenOut.at(-1).master_topic_name,'平安・荘園');
assert.deepEqual(shoenOut.slice(0,old.length),old);
assert.deepEqual(applyToWeb(old,[shoen],[]),old);
assert.throws(()=>applyToWeb(old,[{...shoen,grade:'中1〜中3'}],[shoen.id]),/grade required/);
assert.throws(()=>applyToWeb(old,[{...shoen,unit_major:'地理'}],[shoen.id]),/Unsupported new question Web unit/);
console.log('Heian estate questions route to Heian chapter with MASTER detail preserved.');

const muromachi={...newCandidate,grade:'中1',unit_minor:'室町・一揆'};
const muromachiOut=applyToWeb(old,[muromachi],[muromachi.id]);
assert.equal(muromachiOut.at(-1).unit,'歴史・中世');
assert.equal(muromachiOut.at(-1).topic_name,'室町');
assert.equal(muromachiOut.at(-1).master_topic_name,'室町・一揆');
assert.deepEqual(muromachiOut.slice(0,old.length),old);
assert.deepEqual(applyToWeb(old,[muromachi],[]),old);
assert.throws(()=>applyToWeb(old,[{...muromachi,unit_major:'地理'}],[muromachi.id]),/Unsupported new question Web unit/);
console.log('Muromachi uprising questions retain MASTER detail and require READY IDs.');

