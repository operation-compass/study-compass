import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const url='http://127.0.0.1:8765/legacy-study.html';
 await page.goto(url);
 await page.waitForFunction(() => typeof start==='function' && typeof renderQ==='function');
 const issues=await page.evaluate(()=>BANK_ISSUES);
 assert.deepEqual(issues,[],'question bank errors');
 const ids=['SC-SCI-EXAM-000002','SC-SCI-EXAM2-000002'];
 for(const id of ids){
   await page.evaluate(id=>{subject='理科';mode='mcq';studyFilter={kind:'all',value:''};start(false,[id]);},id);
   const q=page.locator('.question-card .q');
   await q.waitFor();
   const text=await q.innerText();
   assert.ok(!text.includes('前問'),id+' still refers to previous question');
   const count=await page.locator('.choices .choice').count();
   assert.equal(count,4,id+' missing answer choices');
   const answer=await page.evaluate(()=>queue[index].answer);
   const button=page.locator('.choices .choice').filter({hasText:answer}).first();
   assert.equal(await button.count(),1,'correct button not found');
   await button.click();
   assert.match(await page.locator('#feedback').innerText(),/正解/);
   const persisted=await page.evaluate(id=>JSON.parse(localStorage.getItem('studyCompassAlphaV3')||'[]').some(e=>e.id===id&&e.outcome==='correct'),id);
   assert.ok(persisted,id+' did not save history');
   console.log('PASS',id,'4-choice, correct answer, feedback, history');
 }
 // Question-only mode must show independent question and preserve the material area.
 await page.evaluate(id=>{subject='理科';mode='question';studyFilter={kind:'all',value:''};start(false,[id]);},ids[1]);
 await page.locator('.question-only .question-card .q').waitFor();
 assert.ok(!(await page.locator('.question-only .question-card .q').innerText()).includes('前問'));
 assert.equal(await page.locator('.question-only .choices .choice').count(),0);
 await page.getByRole('button',{name:/答えを見る/}).click();
 const revealed=await page.locator('#feedback').innerText();
 assert.ok(revealed.includes('7.5g'),'question-only answer reveal failed');
 const recallSaved=await page.evaluate(id=>JSON.parse(localStorage.getItem('studyCompassAlphaV3')||'[]').some(e=>e.id===id&&e.event_type==='viewed'),ids[1]);
 assert.ok(recallSaved,'question-only recall history not saved');
 console.log('PASS question-only reveal and recall history');
 await page.reload();
 const restored=await page.evaluate(ids=>ids.every(id=>JSON.parse(localStorage.getItem('studyCompassAlphaV3')||'[]').some(e=>e.id===id)),ids);
 assert.ok(restored,'history lost on reload');
 console.log('PASS reload retained history');
} finally {
 await browser.close();
}
