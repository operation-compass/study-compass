'use strict';
// Execute only from the pinned trusted main checkout. Candidate code is never run.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {prepare}=require('./prepare-ready-release.cjs');
const {files,evidenceIndex,verifyEvidence,verifyDiff,gitBlob}=require('./verify-auto-publication.cjs');
const git=(cwd,args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
function verify(source,candidate,base,head){
 assert(/^[a-f0-9]{40}$/.test(base)&&/^[a-f0-9]{40}$/.test(head),'Immutable revisions required');
 assert.equal(git(candidate,['rev-parse','HEAD']),head,'Candidate checkout mismatch');
 const parents=git(candidate,['show','-s','--format=%P',head]).split(' ');
 assert.deepEqual(parents,[base],'Candidate must have exactly the trusted baseline parent');
 const changed=git(candidate,['diff','--name-only',base,head]).split('\n').filter(Boolean).sort();
 assert.deepEqual(changed,files.slice().sort(),'Candidate contains unrelated files');
 const bundle=JSON.parse(fs.readFileSync(path.join(source,'data/staging/drive-sync-bundle.json'),'utf8'));
 verifyEvidence(bundle,evidenceIndex(source));
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'study-candidate-ci-'));
 try{
  const report=prepare(bundle,out);
  const expected=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(out,f),'utf8')]));
  const prFiles=files.map(filename=>{
   const full=path.join(candidate,filename);assert(fs.lstatSync(full).isFile()&&!fs.lstatSync(full).isSymbolicLink(),'Candidate asset must be a regular file');
   return {filename,sha:gitBlob(fs.readFileSync(full))};
  });
  verifyDiff(report,expected,prFiles);
  for(const f of files)fs.writeFileSync(path.join(__dirname,'..',f),expected[f]);
  return {verified:true,base_sha:base,candidate_sha:head,changed:report.files[0].added.concat(report.files[0].edited)};
 }finally{fs.rmSync(out,{recursive:true,force:true});}
}
if(require.main===module)console.log(JSON.stringify(verify(path.resolve(process.argv[2]),path.resolve(process.argv[3]),process.env.BASE,process.env.CANDIDATE)));
module.exports={verify};
