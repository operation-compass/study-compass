'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {selectReady,digest,v2Fields}=require('./select-ready-candidates.cjs');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const snapshot=JSON.parse(fs.readFileSync('docs/audits/evidence-20261016/master-unpublished.json','utf8'));
assert.equal(snapshot.mode,'read_only_connector_snapshot');
assert.equal(snapshot.rows.length,5);
const items=snapshot.rows.map(row=>{const q=Object.fromEntries(snapshot.headers.map((h,i)=>[h,row[i]??'']));return {...q,id:q.question_id}});
const audits=items.map(q=>({id:q.id,version:q.version,hash_version:'v2',sha256:digest(q,v2Fields),final_decision:'HOLD',independent_reviews:[]}));
const selected=selectReady({candidate:{items},audit:{records:audits}});
assert.equal(selected.ready.length,0);
assert.equal(selected.held.length,5);
for(const file of ['index.html','legacy-study.html']){
 const raw=fs.readFileSync(file,'utf8'),tag='const SOCIAL = ',start=raw.indexOf(tag)+tag.length;
 const before=JSON.parse(raw.slice(start,raw.indexOf(';',start)));
 for(const q of items){
  assert(!before.some(x=>x.id===q.id),'Fixture must be genuinely unpublished');
  assert.equal(q.status,'CHECK');assert.equal(q.publish_flag,'FALSE');
  assert(!/^中[123]$/.test(q.grade),'Broad grade cannot silently pass the current v2 schema');
 }
 assert.deepEqual(applyToWeb(before,items,selected.ready),before,'HOLD must preserve every question and order');
 const blob=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(raw)+'\0'),Buffer.from(raw)])).digest('hex');
 assert(['793af430002c15bdf077e5bd9d0b478436555226','53449e518e4e78aadd8d37d87bf5396d770db67b'].includes(blob),'Known main/staging baseline changed: refresh evidence deliberately');
}
console.log('PASS: 5 actual unpublished MASTER questions stay HOLD; v2 SHA computed; grade mismatch detected; both production banks unchanged.');
