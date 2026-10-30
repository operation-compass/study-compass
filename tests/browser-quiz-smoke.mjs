import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import worker from '../worker.js';

const header='question_id,version,subject,grade,unit_major,unit_minor,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation,source_url';
const row=['SC-BROWSER-001','1','社会','中3','歴史','江戸','4択','江戸幕府を開いた人物は？','徳川家康','豊臣秀吉','織田信長','源頼朝','A','1603年','https://example.org'].join(',');
const csv=header+'\n'+row+'\n';
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>String(url).includes('docs.google.com/spreadsheets/')?new Response(csv,{status:200}):originalFetch(url,options);
const home=await readFile(new URL('../home-v2.html',import.meta.url),'utf8');
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    let text, status=200;
    if(url.pathname==='/study.html'){
      const result=await worker.fetch(new Request('https://study.example'+req.url),{ASSETS:{fetch:async()=>new Response('asset')}});
      status=result.status;text=await result.text();
    }else if(url.pathname==='/'){text=home;}else{status=404;text='Not found';}
    res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});res.end(text);
  }catch(err){res.writeHead(500);res.end(String(err));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto(base+'/study.html?subject='+encodeURIComponent('社会'));
  await assert.equal(await page.locator('#unit-title').innerText(),'社会｜単元を選ぶ');
  await page.locator('#unit-buttons button').first().click();
  await assert.equal(await page.locator('#choices button').count(),4);
  await page.locator('#choices button').nth(1).click();
  await assert.equal(await page.locator('#next').isVisible(),true);
  await page.goto(base+'/');
  await assert.equal(await page.locator('#quizDistinct').innerText(),'1問');
  await assert.equal(await page.locator('#quizAttempts').innerText(),'1回');
  await assert.equal(await page.locator('#quizAccuracy').innerText(),'0%');
  await page.goto(base+'/study.html?subject='+encodeURIComponent('社会'));
  await page.locator('#unit-buttons button').first().click();
  await page.locator('#choices button').first().click();
  await page.goto(base+'/');
  await assert.equal(await page.locator('#quizDistinct').innerText(),'1問');
  await assert.equal(await page.locator('#quizAttempts').innerText(),'2回');
  await assert.equal(await page.locator('#quizAccuracy').innerText(),'50%');
  await page.reload();
  await assert.equal(await page.locator('#quizAttempts').innerText(),'2回');
  console.log('PASS: browser subject, answers, progress, reload and persisted localStorage');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));globalThis.fetch=originalFetch;}
