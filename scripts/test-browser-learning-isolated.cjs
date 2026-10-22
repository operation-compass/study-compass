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
  const result={mode:'isolated_chromium',mobile_viewport:'390x844',page_title:await page.title(),baseline_history_preserved:true,production_updated:false,release_authorized:false};
  assert.equal(failures.length,0,'Browser runtime errors: '+failures.join('; '));
  console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
