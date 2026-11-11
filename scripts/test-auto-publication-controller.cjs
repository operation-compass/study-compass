'use strict';
// Runs the actual publication controller against local Git repos and a closed HTTP simulator.
// No real API, remote Git host, production deployment or authentication is used.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),scenario=process.argv[3];
const cases=['disabled','success-new-pr','success-existing-draft','candidate-ci-failure','candidate-ci-wrong-run','delivery-mismatch','deploy-failure','newer-main','merge-race'];
const git=(dir,args)=>cp.execFileSync('git',args,{cwd:dir,encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']}).trim();
const init=dir=>{fs.mkdirSync(dir,{recursive:true});git(dir,['init','-b','main']);git(dir,['config','user.name','Offline Test']);git(dir,['config','user.email','offline@example.invalid']);};
async function child(){
 assert(cases.includes(scenario));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'study-controller-offline-')),live=path.join(temp,'live'),source=path.join(temp,'source'),bare=path.join(temp,'remote.git'),admin=path.join(temp,'admin');
 init(live);init(source);fs.mkdirSync(bare);git(bare,['init','--bare']);
 // Copy only the public project assets and scripts needed by the actual prepublication checks.
 for(const ent of fs.readdirSync(root,{withFileTypes:true}))if(ent.isFile())fs.copyFileSync(path.join(root,ent.name),path.join(live,ent.name));
 fs.cpSync(path.join(root,'scripts'),path.join(live,'scripts'),{recursive:true});fs.cpSync(path.join(root,'data/release'),path.join(live,'data/release'),{recursive:true});
 fs.mkdirSync(path.join(live,'data/publishing'),{recursive:true});fs.writeFileSync(path.join(live,'data/publishing/auto-publication.json'),JSON.stringify({schema_version:1,enabled:scenario!=='disabled'}));
 const fixtures=path.join(root,'test/fixtures/audited-release-20261016'),bundle=JSON.parse(fs.readFileSync(path.join(fixtures,'bundle.json'),'utf8'));
 const verifier=require(path.join(live,'scripts/verify-auto-publication.cjs')),ids=new Set(bundle.candidate.items.map(q=>q.id));
 for(const f of verifier.files){const raw=fs.readFileSync(path.join(live,f),'utf8'),tag='const SOCIAL = ',start=raw.indexOf(tag)+tag.length,end=raw.indexOf(';',start),bank=verifier.questions(raw);const prior=bank.filter(q=>!ids.has(q.id));assert(prior.length>=623,'Expected actual historical bank');fs.writeFileSync(path.join(live,f),raw.slice(0,start)+JSON.stringify(prior)+raw.slice(end));}
 fs.writeFileSync(path.join(live,'unrelated.txt'),'preserve this work');git(live,['add','.']);git(live,['commit','-m','offline baseline before reviewed two questions']);const base=git(live,['rev-parse','HEAD']);git(live,['remote','add','origin',bare]);git(live,['push','-u','origin','main']);
 fs.cpSync(path.join(fixtures,'evidence'),path.join(source,'docs/audits/evidence-20261016'),{recursive:true});git(source,['add','.']);git(source,['commit','-m','actual historical audit evidence']);fs.mkdirSync(path.join(source,'data/staging'),{recursive:true});fs.copyFileSync(path.join(fixtures,'bundle.json'),path.join(source,'data/staging/drive-sync-bundle.json'));git(source,['add','.']);git(source,['commit','-m','Stage audited Drive snapshot (NOT production)']);const sourceSha=git(source,['rev-parse','HEAD']);
 git(temp,['clone','--branch','main',bare,admin]);git(admin,['config','user.name','Offline Test']);git(admin,['config','user.email','offline@example.invalid']);
 // Reproduce the historical authenticated snapshot's original time only inside this test.
 // This does not renew its evidence or export anything into actual staging.
 const realNow=Date.now;Date.now=()=>Date.parse(bundle.approval.exported_at)+1000;
 const realTimer=global.setTimeout;global.setTimeout=(cb,ms,...args)=>realTimer(cb,ms===10000?0:ms,...args);
 process.env.GH_TOKEN='offline-placeholder-not-a-real-token';process.env.GITHUB_EVENT_NAME='workflow_dispatch';process.env.GITHUB_RUN_ID='offline-'+scenario;process.env.STUDY_LIVE_ROOT=live;process.env.STUDY_SOURCE_ROOT=source;process.env.RUNNER_TEMP=path.join(temp,'run');process.env.GITHUB_EVENT_PATH=path.join(temp,'event.json');fs.writeFileSync(process.env.GITHUB_EVENT_PATH,'{}');
 let pr=null,dispatches=0,mergedSha=null,requests=0,graphql=0,candidateCI=null;
 const mainSha=()=>git(bare,['rev-parse','refs/heads/main']);
 const bankAt=sha=>git(bare,['show',sha+':legacy-study.html']);
 const bumpUnrelated=label=>{git(admin,['fetch','origin']);git(admin,['checkout','-B','main','origin/main']);fs.writeFileSync(path.join(admin,'unrelated.txt'),label);git(admin,['add','unrelated.txt']);git(admin,['commit','-m',label]);git(admin,['push','origin','main']);};
 if(scenario==='success-existing-draft'){
  const output=path.join(temp,'expected');require(path.join(live,'scripts/prepare-ready-release.cjs')).prepare(bundle,output);
  git(admin,['switch','-c','study-ready-existing']);for(const f of verifier.files)fs.copyFileSync(path.join(output,f),path.join(admin,f));git(admin,['add','--',...verifier.files]);git(admin,['commit','-m','offline existing draft']);git(admin,['push','origin','HEAD']);const head=git(admin,['rev-parse','HEAD']);pr={number:123,node_id:'PR_offline',draft:true,user:{login:'github-actions[bot]'},head:{sha:head,ref:'study-ready-existing'}};git(admin,['checkout','main']);
 }
 const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body,text:async()=>body});
 global.fetch=async(url,options={})=>{
  requests++;const u=new URL(url),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
  if(u.origin==='https://study-compass.occompass-info.workers.dev'){
   assert.equal(u.pathname,'/legacy-study.html');let content=bankAt(mainSha());if(scenario==='delivery-mismatch'&&dispatches===1){const original=bundle.candidate.items[0].correct_answer;content=content.replace('"answer":"'+original+'"','"answer":"OFFLINE_DELIVERY_CORRUPTION"');}return response(content);
  }
  assert.equal(u.origin,'https://api.github.com','Unexpected external host: no network permitted');
  if(u.pathname==='/graphql'){graphql++;assert(pr?.draft);pr.draft=false;return response({data:{markPullRequestReadyForReview:{pullRequest:{isDraft:false}}}});}
  assert(u.pathname.startsWith('/repos/operation-compass/study-compass/'));const route=decodeURIComponent(u.pathname.slice('/repos/operation-compass/study-compass/'.length));
  if(route==='branches/main')return response({commit:{sha:mainSha()}});
  if(route.startsWith('branches/feature/'))return response({commit:{sha:sourceSha}});
  if(route==='commits'&&u.searchParams.get('path'))return response([{sha:sourceSha}]);
  if(route==='commits/'+sourceSha)return response({author:{login:'operation-compass'},commit:{message:'Stage audited Drive snapshot (NOT production)'},files:[{filename:'data/staging/drive-sync-bundle.json',sha:verifier.gitBlob(fs.readFileSync(path.join(fixtures,'bundle.json'),'utf8'))}]});
  if(route.startsWith('commits/')){const sha=route.split('/')[1],parents=git(bare,['show','-s','--format=%P',sha]).split(' ').filter(Boolean);return response({parents:parents.map(sha=>({sha}))});}
  if(route==='actions/workflows/verify-publication-candidate.yml/dispatches'){
   assert.equal(method,'POST');assert.equal(body.ref,'main');assert.equal(body.inputs.base_sha,base);assert.equal(body.inputs.source_sha,sourceSha);assert.equal(body.inputs.candidate_sha,pr.head.sha);
   const candidate=path.join(temp,'ci-candidate'),ciLive=path.join(temp,'ci-trusted-main');git(temp,['clone',bare,candidate]);git(candidate,['checkout',pr.head.sha]);git(temp,['clone',bare,ciLive]);git(ciLive,['checkout',base]);
   const result=require(path.join(ciLive,'scripts/verify-publication-candidate.cjs')).verify(source,candidate,base,pr.head.sha);assert.equal(result.verified,true);
   candidateCI={id:77,head_sha:base,event:'workflow_dispatch',display_title:'Verify publication candidate '+body.inputs.request_id,status:'completed',conclusion:scenario==='candidate-ci-failure'?'failure':'success',created_at:new Date(Date.now()).toISOString()};
   if(scenario==='candidate-ci-wrong-run')candidateCI.display_title+='-unrelated';
   return response(null,204);
  }
  if(route==='actions/workflows/verify-publication-candidate.yml/runs')return response({workflow_runs:candidateCI?[candidateCI]:[]});
  if(route==='pulls'&&method==='GET')return response(pr?[pr]:[]);
  if(route==='pulls'&&method==='POST'){assert.equal(body.base,'main');const sha=git(bare,['rev-parse','refs/heads/'+body.head]);pr={number:123,node_id:'PR_offline',draft:false,user:{login:'github-actions[bot]'},head:{sha,ref:body.head}};return response(pr,201);}
  if(route==='pulls/123/files'){return response(git(bare,['diff','--name-only',base,pr.head.sha]).split('\n').filter(Boolean).map(filename=>({filename,sha:git(bare,['rev-parse',pr.head.sha+':'+filename])})));}
  if(route==='pulls/123/merge'){
   assert.equal(candidateCI?.conclusion,'success');assert(!['candidate-ci-failure','candidate-ci-wrong-run'].includes(scenario),'Unverified candidate must never merge');assert.equal(method,'PUT');assert.equal(body.sha,pr.head.sha);if(scenario==='merge-race')bumpUnrelated('concurrent work before merge');git(admin,['fetch','origin']);git(admin,['checkout','-B','main','origin/main']);git(admin,['merge','--no-ff','origin/'+pr.head.ref,'-m','offline verified merge']);git(admin,['push','origin','main']);mergedSha=mainSha();return response({merged:true,sha:mergedSha});
  }
  if(route==='actions/workflows/deploy-cloudflare.yml/dispatches'){assert.equal(method,'POST');assert.equal(body.ref,'main');dispatches++;if(scenario==='newer-main'&&dispatches===1)bumpUnrelated('newer work after merge');return response(null,204);}
  if(route==='actions/workflows/deploy-cloudflare.yml/runs'){const sha=u.searchParams.get('head_sha');const fail=dispatches===1&&['deploy-failure','newer-main'].includes(scenario);return response({workflow_runs:[{id:dispatches,status:'completed',conclusion:fail?'failure':'success',created_at:new Date(Date.now()).toISOString(),head_sha:sha}]});}
  throw Error('Unimplemented simulator request: '+method+' '+route);
 };
 let error;try{await require(path.join(live,'scripts/auto-publish-ready.cjs')).main();}catch(e){error=e;}
 Date.now=realNow;global.setTimeout=realTimer;
 const receipt=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,'study-auto-release/publication-receipt.json'),'utf8'));
 const current=mainSha(),bank=verifier.questions(bankAt(current)),present=bank.filter(q=>ids.has(q.id));
 if(scenario==='disabled'){assert(!error);assert.equal(current,base);assert.equal(dispatches,0);assert.equal(pr,null);assert.equal(receipt.result,'verified-not-published');}
 else {
  // The live Drive approval verifier is not connected, so the controller
  // must stop even after candidate CI passes. Previous positive-path
  // merge/recovery simulations remain archived as scenarios, but are
  // deliberately unreachable while fail-closed authorization is active.
  assert(error);
  assert.equal(current,base);
  assert.equal(dispatches,0);
  assert.equal(present.length,0);
  assert.equal(receipt.production_updated,false);
  assert.equal(receipt.result,'failure');
  assert(receipt.reason.includes('LIVE_DRIVE_INDIVIDUAL_APPROVAL_GATE_NOT_CONNECTED'));
 }
 console.log('OFFLINE_RESULT '+JSON.stringify({scenario,passed:true,requests,dispatches,production_host_contacted:false,real_git_host_contacted:false,main_changed_in_disposable_repo:current!==base,recovery_verified:receipt.recovery_verified??null}));
}
if(process.argv[2]==='--scenario')child().catch(e=>{console.error(String(e.message).slice(0,1200));process.exitCode=1;});else{
 const results=cases.map(name=>{const text=cp.execFileSync(process.execPath,[__filename,'--scenario',name],{encoding:'utf8',maxBuffer:8*1024*1024});const line=text.split(/\r?\n/).find(x=>x.startsWith('OFFLINE_RESULT '));assert(line);const result=JSON.parse(line.slice('OFFLINE_RESULT '.length));console.log(JSON.stringify(result));return result;});
 console.log('PASS: fail-closed controller, no remote merge or deploy without live Drive approval; '+results.length+' scenarios');
}
