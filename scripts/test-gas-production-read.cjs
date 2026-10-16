'use strict';
// Real production HTML; mocked HTTP only. No credentials, Sheets writes or deployment.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
assert(Buffer.byteLength(html)>1024*1024,'Regression requires the actual large HTML');
const revision='cd24371108556d549e3645ff7276618dd613cb43';
let calls=[],mode='ok';
const response=(code,text)=>({getResponseCode:()=>code,getContentText:()=>text});
const context={UrlFetchApp:{fetch(url,opts){
 calls.push({url,accept:opts.headers.Accept});
 assert(!opts.method,'Read-only GET required');
 if(url.endsWith('/git/ref/heads/main'))return response(200,JSON.stringify({object:{sha:mode==='bad-revision'?'main':revision}}));
 assert(url.endsWith('?ref='+revision),'Both reads must pin the same immutable main revision');
 assert.equal(opts.headers.Accept,'application/vnd.github.raw+json');
 if(mode==='http-error')return response(403,'denied');
 if(mode==='empty-content')return response(200,JSON.stringify({encoding:'none',content:''}));
 if(mode==='mirror-mismatch'&&url.includes('legacy-study'))return response(200,html.replace('const SOCIAL = [','const SOCIAL = [{"id":"unexpected"},'));
 return response(200,html);
}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('integrations/apps-script/StudyCompassSync.gs','utf8'),context);
const batch=context.studyUnpublishedBatch_([],[],'fixture-token');
assert.equal(batch.items.length,0);
assert.equal(calls.length,3);
assert.equal(context.studyProductionSocial_('index.html','fixture-token',revision).size,623);
for(const [value,message] of [['bad-revision',/Invalid production revision/],['http-error',/HTTP 403/],['empty-content',/HTML unavailable/],['mirror-mismatch',/different question counts|disagree/]]){
 mode=value;assert.throws(()=>context.studyUnpublishedBatch_([],[],'fixture-token'),message);
}
assert.throws(()=>context.studyProductionSocial_('index.html','fixture-token','main'),/Pinned production revision/);
console.log('PASS: actual >1 MB production HTML, immutable revision, mirror mismatch and read failures; no writes.');
