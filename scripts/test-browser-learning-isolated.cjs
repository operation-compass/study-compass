'use strict';
// Browser E2E with ephemeral file origin: NO production hostname, publishing, or Drive writes.
// Requires Playwright in CI. Fail closed if Chromium cannot launch or selectors change.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const http=require('node:http');
const {patch}=require('./patch-history-version-offline.cjs');
async function main(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-browser-'));
 const input=fs.readFileSync('legacy-study.html','utf8');
 const patched=patch(input);
 const html=path.join(temp,'study.html');
 fs.writeFileSync(html,patched);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(patched)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/study.html';
 let browser;
 try{browser=await chromium.launch({headless:true});}catch(error){server.close();throw error}
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const key='studyCompassAlphaV3';
  const baseline={id:'legacy-e2e-preserved',event_type:'graded',outcome:'correct',at:42};
  await page.evaluate(({key,baseline})=>localStorage.setItem(key,JSON.stringify([baseline])),{key,baseline});
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).length,key),1);
  // Exercise the ACTUAL app submitChoice -> record -> save chain on an isolated
  // injected candidate, while keeping the earlier browser history unchanged.
  const graded=await page.evaluate(key=>{
   const candidate={id:'SC-SOC-HIS-WEB26-000001',version:'v0.1',subject:'社会',unit:'歴史・古代',unit_id:'ancient',skill:'recognition',method:'auto',answer:'和同開珎',options:['和同開珎','富本銭','開元通宝','寛永通宝'],q:'708年に発行された銅銭は？',ex:'708年に発行された銅銭は和同開珎'};
   const original={queue,index,currentOptions,locked,selectedAnswer,session,historyTestContext,miniMockActive,active,timingValid};
   const prior=JSON.parse(localStorage.getItem(key));
   try{
    queue=[candidate];index=0;currentOptions=['和同開珎','富本銭','開元通宝','寛永通宝'];
    locked=false;selectedAnswer=null;session='isolated-browser';historyTestContext=null;miniMockActive=false;active=1500;timingValid=true;
    // Real renderQ creates the choice buttons and feedback container.
    renderQ();submitChoice(currentOptions.indexOf(candidate.answer));
    const correct=JSON.parse(localStorage.getItem(key));
    locked=false;renderQ();submitChoice(currentOptions.findIndex(x=>x!==candidate.answer));
    const incorrect=JSON.parse(localStorage.getItem(key));
    return {prior,correct,incorrect};
   } finally {
    queue=original.queue;index=original.index;currentOptions=original.currentOptions;locked=original.locked;selectedAnswer=original.selectedAnswer;session=original.session;historyTestContext=original.historyTestContext;miniMockActive=original.miniMockActive;active=original.active;timingValid=original.timingValid;
   }
  },key);
  assert.deepEqual(graded.correct[0],baseline,'Existing history changed by real browser grading');
  assert.equal(graded.correct.length,2);
  assert.equal(graded.correct[1].outcome,'correct');
  assert.equal(graded.correct[1].question_version,'v0.1');
  assert.deepEqual(graded.incorrect[0],baseline);
  assert.equal(graded.incorrect.length,3);
  assert.equal(graded.incorrect[2].outcome,'incorrect');
  assert.equal(graded.incorrect[2].question_version,'v0.1');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).length,key),3);

  const result={mode:'isolated_chromium',mobile_viewport:'390x844',page_title:await page.title(),baseline_history_preserved:true,real_grading_correct_and_incorrect:true,history_events_after_reload:3,production_updated:false,release_authorized:false};
  assert.equal(failures.length,0,'Browser runtime errors: '+failures.join('; '));
  console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
