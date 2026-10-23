import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = await readFile(new URL('../public-questions.html',import.meta.url),'utf8');
const header = 'question_id,version,subject,grade,unit_major,unit_minor,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation,source_url';
const sample = ['SC-PREVIEW-001','1','社会','中3','歴史','江戸','mcq','江戸幕府を開いた人物は？','徳川家康','豊臣秀吉','織田信長','源頼朝','A','1603年に江戸幕府を開きました。','https://example.org'].join(',');
let responseStatus=200, responseBody=header+'\n'+sample+'\n';
const server=createServer((req,res)=>{
 if(req.url==='/api/questions.csv'){res.writeHead(responseStatus,{'Content-Type':'text/csv; charset=utf-8'});res.end(responseBody);}
 else if(req.url==='/public-questions.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
 else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();
const root='http://127.0.0.1:'+address.port+'/public-questions.html';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(root);
 await page.getByText('江戸幕府を開いた人物は？').waitFor();
 assert.equal(await page.locator('#choices button').count(),4);
 await page.getByRole('button',{name:/A．徳川家康/}).click();
 assert.equal(await page.locator('#feedback').textContent(),'正解！');
 assert.match(await page.locator('#explanation').textContent(),/1603年/);
 await page.screenshot({path:'public-question-browser.png',fullPage:true});
 responseBody=header+'\n';await page.reload();
 await page.getByText('現在、公開承認済みの新規問題は0問です。').waitFor();
 assert.equal(await page.locator('#quiz').isVisible(),false);
 responseStatus=503;responseBody='Unavailable';await page.reload();
 await page.getByText(/公開問題を表示できません/).waitFor();
 assert.equal(await page.locator('#quiz').isVisible(),false);
 console.log('PASS: 4 choices, answer, explanation, empty feed, unavailable feed (390px viewport)');
} finally {
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
