import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const src=await fs.readFile(new URL('../worker.js',import.meta.url),'utf8');
const {trafficSource,recordTraffic}=await import('data:text/javascript;base64,'+Buffer.from(src+'\nexport {trafficSource,recordTraffic};').toString('base64'));
const origin='https://shirunoera.occompass-info.workers.dev';
const event=(path,headers={},page='portal',method='GET')=>{const request=new Request(origin+path,{headers,method});const points=[];recordTraffic(request,{TRAFFIC_ANALYTICS:{writeDataPoint:p=>points.push(p)}},new URL(request.url),page);return points};
test('allowlisted UTM and known referrers classify without raw inputs',()=>{
 assert.deepEqual(event('/?utm_source=instagram&utm_content=private')[0],{indexes:['portal'],blobs:['portal','instagram','none'],doubles:[1]});
 assert.equal(event('/',{referer:'https://m.youtube.com/watch?v=private'})[0].blobs[1],'youtube');
 assert.equal(event('/',{referer:'https://instagram.com.fake.example/secret'})[0].blobs[1],'other');
 assert.equal(event('/?utm_source=person@example.com')[0].blobs[1],'direct_or_unknown');
 assert.equal(event('/high-school?utm_source=x',{referer:origin+'/'},'high_school')[0].blobs[1],'internal');
 assert.equal(event('/study.html?subject='+encodeURIComponent('社会'),{},'quiz')[0].blobs[2],'社会');
 assert.equal(event('/study.html?subject=private',{},'quiz')[0].blobs[2],'none');
});
test('opt-out and diagnostic/non-navigation requests are excluded',()=>{
 for(const h of [{'sec-gpc':'1'},{dnt:'1'},{'user-agent':'HeadlessChrome'},{'sec-purpose':'prefetch'},{'sec-fetch-mode':'cors'},{'sec-fetch-dest':'image'}])assert.equal(event('/',h).length,0);
 for(const q of ['smoke=1','render=1','analytics_test=1'])assert.equal(event('/?'+q).length,0);
 assert.equal(event('/',{},'portal','POST').length,0);
});
test('missing or failing binding never interrupts service',()=>{
 const req=new Request(origin+'/');
 assert.doesNotThrow(()=>recordTraffic(req,{},new URL(req.url),'portal'));
 assert.doesNotThrow(()=>recordTraffic(req,{TRAFFIC_ANALYTICS:{writeDataPoint(){throw Error('unavailable')}}},new URL(req.url),'portal'));
});
