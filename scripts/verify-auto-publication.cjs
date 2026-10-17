'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {selectReady}=require('./select-ready-candidates.cjs');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(b)+'\0'),Buffer.from(b)])).digest('hex');
const files=['index.html','legacy-study.html'];
function questions(html){const tag='const SOCIAL = ',i=html.indexOf(tag);assert(i>=0,'Missing SOCIAL');const start=i+tag.length,end=html.indexOf(';',start);assert(end>start,'Missing SOCIAL terminator');const q=JSON.parse(html.slice(start,end));assert(Array.isArray(q),'Invalid SOCIAL');return q;}
function evidenceIndex(root){
 const result=[];let total=0;
 function walk(dir){for(const name of fs.readdirSync(dir)){const full=path.join(dir,name),s=fs.lstatSync(full);assert(!s.isSymbolicLink(),'Evidence symlink rejected');if(s.isDirectory())walk(full);else if(/\.(json|md)$/.test(name)){assert(s.size<=1024*1024,'Oversized evidence');total+=s.size;assert(total<=32*1024*1024,'Evidence set too large');const bytes=fs.readFileSync(full);result.push({path:path.relative(root,full).replaceAll('\\','/'),sha:sha256(bytes),text:bytes.toString('utf8')});}}}
 for(const dir of [path.join(root,'docs'),path.join(root,'docs/audits')])assert(!fs.lstatSync(dir).isSymbolicLink(),'Evidence root symlink rejected');
 walk(path.join(root,'docs/audits'));return result;
}
function verifyEvidence(bundle,index){
 const selected=selectReady(bundle),map=new Map(bundle.audit.records.map(x=>[x.id,x]));
 for(const id of selected.ready){const audit=map.get(id);assert.equal(audit.hash_version,'v2','Automatic release requires SHA v2');
  for(const r of audit.independent_reviews){assert.equal(r.id,id,'Review ID mismatch');assert.equal(r.version,audit.version,'Review version mismatch');
   const matches=index.filter(x=>x.sha===r.evidence_sha256&&x.path.endsWith('.md'));
   assert.equal(matches.length,1,'Missing or ambiguous review evidence artifact');
   const declared=String(r.evidence_file||'');assert(declared&&!declared.includes('..')&&(declared===matches[0].path||declared===path.posix.basename(matches[0].path)),'Review evidence path mismatch');
   assert(matches[0].text.includes(id)&&matches[0].text.includes(r.reviewer_id),'Review artifact identity missing');
   const signed=index.filter(x=>x.path.endsWith('.json')).some(x=>{try{const doc=JSON.parse(x.text);return Array.isArray(doc.records)&&doc.records.some(v=>v.id===id&&v.version===r.version&&v.role===r.role&&v.result==='PASS'&&v.reviewer_id===r.reviewer_id&&v.checked_at===r.checked_at&&v.question_sha256===r.question_sha256&&v.evidence_sha256===r.evidence_sha256);}catch{return false;}});
   assert(signed,'Missing matching independent review record');
  }
 }
 return selected;
}
function verifyDiff(report,expected,prFiles){
 assert.equal(report.files.length,2);const changed=[...report.files[0].added,...report.files[0].edited];assert(changed.length>0&&changed.length<=5,'Invalid publication batch');
 assert.deepEqual(report.files[0].added,report.files[1].added);assert.deepEqual(report.files[0].edited,report.files[1].edited);
 assert.deepEqual(prFiles.map(x=>x.filename).sort(),files.slice().sort(),'PR contains non-question changes');
 for(const f of files)assert.equal(prFiles.find(x=>x.filename===f).sha,gitBlob(expected[f]),'PR differs from regenerated release');
 return changed;
}
function verifyPublished(expected,actual){assert.deepEqual(questions(actual),questions(expected),'Published question bank differs from expected release');}
module.exports={sha256,gitBlob,files,questions,evidenceIndex,verifyEvidence,verifyDiff,verifyPublished};

