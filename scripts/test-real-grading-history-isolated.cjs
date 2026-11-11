'use strict';
// Exercise actual deployed HTML function bodies in an isolated Node VM.
// No browser, external network, production storage, or publishing.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {patch}=require('./patch-history-version-offline.cjs');
function extractLine(html,name){
 const matches=html.split(/\r?\n/).filter(line=>line.startsWith('function '+name+'('));
 assert.equal(matches.length,1,'Expected one real function '+name);
 return matches[0];
}
for(const filename of ['legacy-study.html','index.html']){
 test(filename+' actual quiz grading saves new version, retains old event and legacy fallback',()=>{
  const html=patch(fs.readFileSync(filename,'utf8'));
  const code=['save','series','graded','submitChoice','record'].map(name=>extractLine(html,name)).join('\n');
  const stored=new Map(),baseline={id:'previous-question',event_type:'graded',outcome:'correct',at:10,skill:'recognition',method:'auto'};
  const buttons=()=>({disabled:false,classList:{add(){}}});
  const choices=[buttons(),buttons(),buttons(),buttons()];
  const document={
   querySelectorAll(sel){assert(['.quiz-actions button','.choice'].includes(sel));return sel==='.choice'?choices:[buttons()]},
   getElementById(id){assert.equal(id,'feedback');return {set innerHTML(v){this.value=v},get innerHTML(){return this.value}}}
  };
  const q={id:'SC-SOC-HIS-WEB26-000001',version:'v0.1',subject:'社会',unit:'歴史・古代',unit_id:'ancient',skill:'recognition',method:'auto',answer:'和同開珎'};
  const context=vm.createContext({KEY:'studyCompassAlphaV3',readError:false,msg:{textContent:'',innerHTML:''},localStorage:{setItem(k,v){stored.set(k,v)}},storageOK:true,
   events:[baseline],sessionEvents:[],queue:[q],index:0,locked:false,review:false,currentOptions:['和同開珎','富本銭','開元通宝','寛永通宝'],selectedAnswer:null,
   tick(){},uid(){return 'test-attempt'},session:'test-session',series:null,localDay(){return '2026-10-23'},historyTestContext:null,miniMockActive:false,
   miniMockSection(){throw Error('mock should be off')},miniMockPoints(){throw Error('mock should be off')},active:300,timingValid:true,
   document,historyExplanation(){return ''},esc:String});
  vm.runInContext(code,context,{timeout:2000});
  vm.runInContext('submitChoice(0)',context,{timeout:2000});
  let events=JSON.parse(stored.get('studyCompassAlphaV3'));
  assert.equal(events.length,2);
  assert.deepEqual(events[0],baseline,'existing stored event was modified');
  assert.equal(events[1].outcome,'correct');
  assert.equal(events[1].question_version,'v0.1');
  assert.equal(events[1].selected_answer,'和同開珎');
  vm.runInContext("locked=false;queue[0]={...queue[0],version:undefined};submitChoice(1)",context,{timeout:2000});
  events=JSON.parse(stored.get('studyCompassAlphaV3'));
  assert.equal(events.length,3);
  assert.deepEqual(events[0],baseline);
  assert.equal(events[2].outcome,'incorrect');
  assert.equal(events[2].question_version,'v0.3-CHECK');
  assert.equal(events[2].selected_answer,'富本銭');
 });
}
