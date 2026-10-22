#!/usr/bin/env node
'use strict';
// Offline, fail-closed release preparation; NEVER pushes, merges or deploys.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {selectReady}=require('./select-ready-candidates.cjs');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const root=path.join(__dirname,'..');
function extract(html){
 const tag='const SOCIAL = ',p=html.indexOf(tag);assert(p>=0,'SOCIAL array missing');
 const start=p+tag.length,end=html.indexOf(';',start);assert(end>start,'SOCIAL terminator missing');
 return {start,end,questions:JSON.parse(html.slice(start,end))};
}
function prepare(bundle,outDir,now=Date.now()){
 assert(bundle?.schema_version===1,'Unrecognized bundle schema');
 assert(bundle.approval?.mode==='ai_three_stage','Expected three-stage gate');
 assert(bundle.approval?.export_source==='authenticated-drive-export','Untrusted export');
 assert(bundle.approval?.source_spreadsheet_id==='1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88','Wrong source');
 const at=Date.parse(bundle.approval.exported_at);
 assert(Number.isFinite(at)&&at<=now+60000&&now-at<24*60*60*1000,'Stale or invalid authenticated snapshot');
 const selected=selectReady(bundle);
 assert(selected.ready.length>0,'No READY records: no release');
 assert(selected.ready.length<=5,'More than five READY candidates');
 // No authenticated Drive provenance or independent release authorization is
 // wired to this offline preparer. Self-declared export_source is not proof.
 // Do not generate release HTML until an audited verifier is integrated.
 assert(false,'RELEASE_BLOCKED: authenticated Drive evidence and individual authorization not connected');
 const files=['index.html','legacy-study.html'],produced=[],deltas=[];
 for(const filename of files){
  const raw=fs.readFileSync(path.join(root,filename),'utf8'),e=extract(raw);
  const existingIds=new Set(e.questions.map(q=>q.id));
  for(const id of selected.ready)if(!existingIds.has(id))assert(selected.hashVersionById[id]==='v2','New questions require SHA v2 including grade and units: '+id);
  const next=applyToWeb(e.questions,bundle.candidate.items,selected.ready);
  assert(next.length>=e.questions.length,'Deleted existing questions');
  assert.deepEqual(next.slice(0,e.questions.length).map(q=>q.id),e.questions.map(q=>q.id),'Reordered existing questions');
  const edited=e.questions.filter((q,i)=>JSON.stringify(q)!==JSON.stringify(next[i])).map(q=>q.id);
  const added=next.slice(e.questions.length).map(q=>q.id);
  assert([...edited,...added].every(id=>selected.ready.includes(id)),'Unapproved change');
  assert(edited.length+added.length<=5,'Excess delta');
  produced.push({filename,content:raw.slice(0,e.start)+JSON.stringify(next)+raw.slice(e.end)});
  deltas.push({filename,before:e.questions.length,after:next.length,edited,added});
 }
 assert.deepEqual(deltas[0].edited,deltas[1].edited,'HTML edit sets differ');
 assert.deepEqual(deltas[0].added,deltas[1].added,'HTML addition sets differ');
 const noChange=deltas[0].edited.length+deltas[0].added.length===0;
 fs.mkdirSync(outDir,{recursive:true});
 for(const f of produced)fs.writeFileSync(path.join(outDir,f.filename),f.content);
 const report={production_updated:false,no_change:noChange,source:'authenticated-drive-export',ready:selected.ready,held:selected.held,files:deltas};
 fs.writeFileSync(path.join(outDir,'release-report.json'),JSON.stringify(report,null,2));
 return report;
}
if(require.main===module){
 try{
  const input=process.argv[2],output=process.argv[3];
  assert(input&&output,'Usage: prepare-ready-release.cjs <bundle.json> <output-dir>');
  console.log(JSON.stringify(prepare(JSON.parse(fs.readFileSync(input,'utf8')),output),null,2));
 }catch(err){console.error('RELEASE BLOCKED:',err.message);process.exitCode=1}
}
module.exports={prepare};

