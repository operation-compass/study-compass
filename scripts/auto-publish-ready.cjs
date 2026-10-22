'use strict';
// Executed from trusted main only. No AI API and no source-branch code execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {prepare}=require('./prepare-ready-release.cjs');
const {sha256,gitBlob,files,questions,evidenceIndex,verifyEvidence,verifyDiff,verifyPublished}=require('./verify-auto-publication.cjs');
const repo='operation-compass/study-compass',sourceBranch='feature/drive-approval-gate-20261016',bundlePath='data/staging/drive-sync-bundle.json';
const origin='https://study-compass.occompass-info.workers.dev';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function git(args,cwd){return cp.execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']}).trim();}
async function api(route,{method='GET',body}={}){const r=await fetch('https://api.github.com/repos/'+repo+'/'+route,{method,headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});assert(r.ok,'GitHub request failed: '+method+' '+route.split('?')[0]+' HTTP '+r.status);return r.status===204?null:r.json();}
async function dispatchAndWait(sha){
 const after=Date.now()-10000;await api('actions/workflows/deploy-cloudflare.yml/dispatches',{method:'POST',body:{ref:'main'}});
 for(let n=0;n<90;n++){await sleep(10000);const runs=await api('actions/workflows/deploy-cloudflare.yml/runs?head_sha='+sha+'&event=workflow_dispatch&per_page=10');const run=runs.workflow_runs.find(x=>Date.parse(x.created_at)>=after);if(run?.status==='completed'){assert.equal(run.conclusion,'success','Deployment verification failed: '+run.id);return run.id;}}
 throw Error('Deployment verification timed out');
}
async function verifyCandidateAndWait(base,source,head){
 const request='publication-'+process.env.GITHUB_RUN_ID+'-'+head;
 const after=Date.now()-10000;
 await api('actions/workflows/verify-publication-candidate.yml/dispatches',{method:'POST',body:{ref:'main',inputs:{base_sha:base,source_sha:source,candidate_sha:head,request_id:request}}});
 for(let n=0;n<90;n++){
  await sleep(10000);
  const runs=await api('actions/workflows/verify-publication-candidate.yml/runs?head_sha='+base+'&event=workflow_dispatch&per_page=100');
  const run=runs.workflow_runs.find(x=>x.display_title==='Verify publication candidate '+request&&x.head_sha===base&&x.event==='workflow_dispatch'&&Date.parse(x.created_at)>=after);
  if(run?.status==='completed'){assert.equal(run.conclusion,'success','Candidate CI failed: '+run.id);return run.id;}
 }
 throw Error('Candidate CI timed out; nothing merged');
}
async function main(){
 assert(process.env.GH_TOKEN,'Missing workflow token');const root=path.resolve(process.env.STUDY_LIVE_ROOT||'.'),source=path.resolve(process.env.STUDY_SOURCE_ROOT||'../audit-source'),out=path.resolve(process.env.RUNNER_TEMP||'../tmp','study-auto-release');fs.mkdirSync(out,{recursive:true});
 const receipt={production_updated:false,source_branch:sourceBranch};const save=()=>fs.writeFileSync(path.join(out,'publication-receipt.json'),JSON.stringify(receipt,null,2));
 let mergeSha,base,recoveryBase;
 try{
  const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  if(process.env.GITHUB_EVENT_NAME==='workflow_run'){
   const run=event.workflow_run;assert(run&&run.conclusion==='success'&&run.name==='Propose READY Web delta for review (never auto-merge)','Unexpected source workflow');assert.equal(run.path,'.github/workflows/propose-ready-release.yml');assert.equal(run.head_repository.full_name,repo);assert(run.event==='push'&&run.head_branch===sourceBranch||run.event==='workflow_dispatch'&&run.head_branch==='main','Untrusted source workflow event');receipt.source_run=run.id;
  }else assert.equal(process.env.GITHUB_EVENT_NAME,'workflow_dispatch','Unexpected event');
  const sourceSha=git(['rev-parse','HEAD'],source),currentSource=await api('branches/'+encodeURIComponent(sourceBranch));assert.equal(currentSource.commit.sha,sourceSha,'Staging changed during checkout');
  if(event.workflow_run?.event==='push')assert.equal(event.workflow_run.head_sha,sourceSha,'Superseded staging event');
  base=git(['rev-parse','HEAD'],root);assert.equal((await api('branches/main')).commit.sha,base,'main changed during checkout');receipt.base_sha=base;receipt.source_sha=sourceSha;
  const raw=fs.readFileSync(path.join(source,bundlePath),'utf8'),bundle=JSON.parse(raw);
  const changes=await api('commits?sha='+sourceSha+'&path='+bundlePath+'&per_page=1');assert(changes.length===1,'Missing authenticated staging commit');const staged=await api('commits/'+changes[0].sha);
  assert.equal(staged.author?.login,'operation-compass','Unexpected staging actor');assert.equal(staged.commit.message.split('\n')[0],'Stage audited Drive snapshot (NOT production)','Unexpected staging provenance');assert.deepEqual(staged.files.map(x=>x.filename),[bundlePath],'Staging commit modified unrelated files');assert.equal(staged.files[0].sha,gitBlob(raw),'Staging bundle is not the authenticated file');
  const selected=verifyEvidence(bundle,evidenceIndex(source));receipt.selected=selected.ready;
  if(!selected.ready.length){receipt.no_change=true;save();return;}
  assert.equal(sha256(fs.readFileSync(path.join(root,files[0]))),sha256(fs.readFileSync(path.join(root,files[1]))),'Production HTML mirrors disagree');
  const report=prepare(bundle,out);receipt.report=report;
  if(report.no_change){receipt.no_change=true;save();return;}
  const expected=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(out,f),'utf8')]));
  for(const f of files)fs.writeFileSync(path.join(root,f),expected[f]);
  for(const script of ['check-question-release.cjs','check-history.cjs','check-beta.cjs'])cp.execFileSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,stdio:'inherit'});
  const changedPaths=git(['diff','--name-only'],root).split('\n').filter(Boolean).sort();assert.deepEqual(changedPaths,files.slice().sort(),'Unexpected live-tree change');
  // Fail closed: only a separately reviewed change on main may activate publication.
  const config=JSON.parse(fs.readFileSync(path.join(root,'data/publishing/auto-publication.json'),'utf8'));
  assert.equal(config.schema_version,1,'Invalid automatic publication config');
  if(config.enabled!==true){receipt.mode='verify-only';receipt.verified_blobs=Object.fromEntries(files.map(f=>[f,gitBlob(expected[f])]));receipt.result='verified-not-published';save();return;}
  // Fail closed until real Drive publication permissions are authenticated.
  // A READY audit in staging is not the same as a production authorization.
  // Do not rely on a claimed permission field inside the same staging bundle.
  const candidateCount=selected.ready.length;
  // A trusted, independently signed authorization is mandatory before production writes.
  const approved=require('./release-attestation-gate.cjs').authorized(selected.ready,sourceSha,base);
  if(candidateCount>0){
    receipt.result='HOLD_UNVERIFIED_PRODUCTION_PERMISSION';
    receipt.held_candidate_count=candidateCount;
    receipt.no_change=true;
    save();
    return;
  }
  const open=await api('pulls?state=open&base=main&per_page=100');let pr;
  for(const p of open){if(p.user.login!=='github-actions[bot]'||!/^study-ready-/.test(p.head.ref))continue;const f=await api('pulls/'+p.number+'/files');try{verifyDiff(report,expected,f);const c=await api('commits/'+p.head.sha);if(c.parents.length===1&&c.parents[0].sha===base){pr=p;break;}}catch{/* Unrelated/stale PR remains unchanged. */}}
  if(!pr){
   const branch='study-ready-auto-'+process.env.GITHUB_RUN_ID;git(['config','user.name','github-actions[bot]'],root);git(['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],root);git(['switch','-c',branch],root);git(['add','--',...files],root);git(['commit','-m','Publish independently audited question delta'],root);git(['push','origin','HEAD'],root);
   pr=await api('pulls',{method:'POST',body:{base:'main',head:branch,title:'Study COMPASS: audited automatic publication',body:'Regenerated from authenticated staging with three independent evidence artifacts. Maximum five questions; deploy and problem-bank verification follow.',draft:false}});
  }
  verifyDiff(report,expected,await api('pulls/'+pr.number+'/files'));const head=pr.head.sha||git(['rev-parse','HEAD'],root);receipt.pr=pr.number;receipt.head_sha=head;
  if(pr.draft){const r=await fetch('https://api.github.com/graphql',{method:'POST',headers:{Authorization:'Bearer '+process.env.GH_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query:'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{isDraft}}}',variables:{id:pr.node_id}}),signal:AbortSignal.timeout(30000)});assert(r.ok,'Cannot mark verified PR ready');const b=await r.json();assert(!b.errors&&b.data.markPullRequestReadyForReview.pullRequest.isDraft===false,'Draft transition failed');}
  receipt.candidate_ci_run=await verifyCandidateAndWait(base,sourceSha,head);save();
  assert.equal((await api('branches/main')).commit.sha,base,'main advanced before merge; retry with latest baseline');assert.equal((await api('branches/'+encodeURIComponent(sourceBranch))).commit.sha,sourceSha,'Staging advanced before merge');
  const merged=await api('pulls/'+pr.number+'/merge',{method:'PUT',body:{sha:head,merge_method:'merge'}});assert(merged.merged,'Merge rejected');mergeSha=merged.sha;receipt.merge_sha=mergeSha;receipt.production_updated=true;save();
  const mergedCommit=await api('commits/'+mergeSha);assert.equal(mergedCommit.parents.length,2,'Unexpected merge topology');assert.equal(mergedCommit.parents[1].sha,head,'Unexpected merged head');recoveryBase=mergedCommit.parents[0].sha;receipt.recovery_base=recoveryBase;assert.equal(recoveryBase,base,'main advanced during merge; restore actual first parent');
  receipt.deployment_run=await dispatchAndWait(mergeSha);
  const r=await fetch(origin+'/legacy-study.html?release='+mergeSha,{signal:AbortSignal.timeout(30000),cache:'no-store'});assert(r.ok,'Published bank unavailable');verifyPublished(expected['legacy-study.html'],await r.text());receipt.published_bank_verified=true;receipt.result='success';save();
 }catch(error){
  receipt.result='failure';receipt.reason=String(error.message).slice(0,500);save();
  if(mergeSha){
   try{
    assert(recoveryBase,'Merge first parent unverified; automatic rollback stopped');assert.equal((await api('branches/main')).commit.sha,mergeSha,'Newer main changes exist; automatic rollback stopped');git(['restore','--source=HEAD','--staged','--worktree','--',...files],root);git(['fetch','origin','main'],root);git(['checkout','-B','study-auto-recovery','origin/main'],root);git(['config','user.name','github-actions[bot]'],root);git(['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],root);
    // Restore only the two question snapshots; never reset main or overwrite other files.
    git(['restore','--source='+recoveryBase,'--',...files],root);git(['add','--',...files],root);const changed=git(['diff','--cached','--name-only'],root).split('\n').filter(Boolean);assert(changed.every(f=>files.includes(f)),'Recovery contains unrelated files');
    if(changed.length){git(['commit','-m','Restore question snapshots after failed automated publication'],root);git(['push','origin','HEAD:main'],root);const recovery=git(['rev-parse','HEAD'],root);receipt.recovery_sha=recovery;receipt.recovery_deployment_run=await dispatchAndWait(recovery);const r=await fetch(origin+'/legacy-study.html?recovery='+recovery,{signal:AbortSignal.timeout(30000),cache:'no-store'});assert(r.ok,'Recovery bank unavailable');verifyPublished(git(['show',recoveryBase+':legacy-study.html'],root),await r.text());receipt.recovery_verified=true;}
   }catch(recoveryError){receipt.recovery_verified=false;receipt.recovery_reason=String(recoveryError.message).slice(0,500);}
   save();
  }
  throw error;
 }
}
if(require.main===module)main().catch(e=>{console.error('AUTO PUBLICATION STOPPED: '+e.message);process.exitCode=1;});
module.exports={main};
