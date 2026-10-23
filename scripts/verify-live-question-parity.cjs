'use strict';
// READ-ONLY: independently compare live Cloudflare question banks against
// the checked-out trusted repository revision. No deployment, no writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {questions}=require('./verify-auto-publication.cjs');
const BASE='https://study-compass.occompass-info.workers.dev';
async function fetchLive(path){
 const response=await fetch(BASE+'/'+path+'?parity='+encodeURIComponent(process.env.GITHUB_SHA||Date.now().toString()),{signal:AbortSignal.timeout(30000),cache:'no-store'});
 assert(response.ok,'Live fetch failed '+path+' HTTP '+response.status);
 return response.text();
}
async function main(){
 const names=['index.html','legacy-study.html'];
 const expected=names.map(name=>questions(fs.readFileSync(name,'utf8')));
 assert.deepEqual(expected[0],expected[1],'Checked-out question banks disagree');
 const actual=await Promise.all(names.map(fetchLive)).then(xs=>xs.map(questions));
 assert.deepEqual(actual[0],actual[1],'Live routes have different question banks');
 for(let i=0;i<names.length;i++)assert.deepEqual(actual[i],expected[i],'Live '+names[i]+' differs from checked-out main revision');
 const ids=['SC-SOC-HIS-WEB26-000001','SC-SOC-HIS-WEB26-000002','SC-SOC-HIS-WEB26-000003'];
 const present=ids.filter(id=>actual[0].some(q=>q.id===id));
 process.stdout.write(JSON.stringify({mode:'read_only_live_parity',parity:true,question_count:actual[0].length,candidate_ids_present:present,production_updated:false})+'\n');
}
if(require.main===module)main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
module.exports={fetchLive,main};
