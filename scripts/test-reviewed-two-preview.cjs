'use strict';
// Real corrected MASTER proposals, in an isolated preview. This is never release authority.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const {digest,v2Fields,selectReady}=require('./select-ready-candidates.cjs');
const root=path.join(__dirname,'..'),evidence=path.join(root,'docs/audits/evidence-20261016');
const rows=JSON.parse(fs.readFileSync(path.join(evidence,'revised-two.json'),'utf8')).items;
const questions=rows.map(q=>({...q,id:q.question_id}));
const ids=questions.map(q=>q.id);assert.equal(ids.length,2);
for(const role of ['accuracy','quality']){
 const review=JSON.parse(fs.readFileSync(path.join(evidence,role+'-revised-two.json'),'utf8'));
 const bytes=fs.readFileSync(path.join(evidence,role+'-revised-two.md'));
 const sha=crypto.createHash('sha256').update(bytes).digest('hex');
 for(const q of questions){const r=review.records.find(x=>x.id===q.id);assert(r&&r.result==='PASS');assert.equal(r.version,q.version);assert.equal(r.question_sha256,digest(q,v2Fields));assert.equal(r.evidence_sha256,sha);}
}
// An accuracy/quality PASS never fills in a missing technical or release decision.
assert.equal(selectReady({candidate:{items:questions},audit:{records:[]}}).ready.length,0);
const retained=Boolean(process.argv[2]);
const out=retained?path.resolve(root,process.argv[2]):fs.mkdtempSync(path.join(os.tmpdir(),'study-two-review-'));
fs.mkdirSync(out,{recursive:true});
try{
 const report={mode:'review_preview_only',production_updated:false,release_authorized:false,questions:ids,files:[]};
 for(const file of ['index.html','legacy-study.html']){
  const raw=fs.readFileSync(path.join(root,file),'utf8'),tag='const SOCIAL = ',start=raw.indexOf(tag)+tag.length,end=raw.indexOf(';',start);
  assert(start>=tag.length&&end>start);
  const before=JSON.parse(raw.slice(start,end));assert(ids.every(id=>!before.some(q=>q.id===id)));
  const after=applyToWeb(before,questions,ids);
  assert.deepEqual(after.slice(0,before.length),before,'Existing questions or order changed');
  assert.deepEqual(after.slice(before.length).map(q=>q.id),ids);
  for(const q of after.slice(before.length)){
   assert.equal(q.unit,'歴史・古代');
   assert.equal(q.topic_name,questions.find(x=>x.id===q.id).unit_minor,'Detailed topic lost');
  }
  assert.equal(after.length,before.length+2);
  fs.writeFileSync(path.join(out,file),raw.slice(0,start)+JSON.stringify(after)+raw.slice(end));
  report.files.push({file,before:before.length,after:after.length,added:ids,edited:[]});
 }
 assert.throws(()=>applyToWeb([], [{...questions[0],unit_minor:'未対応単元'}], [ids[0]]),/Unsupported new question Web unit/);
 for(const file of ['data/release/withheld-ids.json','beta-storage.js','generated-practice.html','written-practice.html']){
  fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(out,file));
 }
 for(const script of ['check-question-release.cjs','check-history.cjs','check-beta.cjs'])execFileSync(process.execPath,[path.join(root,'scripts',script)],{cwd:out,stdio:'pipe'});
 report.checks=['question structure and withheld IDs','existing and withdrawn history','scoring and storage regression'];
 fs.writeFileSync(path.join(out,'preview-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{if(!retained)fs.rmSync(out,{recursive:true,force:true});}
