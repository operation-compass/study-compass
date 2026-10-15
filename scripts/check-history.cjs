const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const path of ['legacy-study.html','index.html']){
 const lines=fs.readFileSync(path,'utf8').split(/\r?\n/);
 const code=['graded','series','status','dashboard','improvement'].map(n=>lines.find(x=>x.startsWith('function '+n+'('))).join('\n');
 const now=Date.now(),date=new Date(now+9*3600000).toISOString().slice(0,10);let html='';
 const context=vm.createContext({period:7,filterSubject:'すべて',DAY:86400000,localDay:()=>date,items:[{id:'current',q:'current question',subject:'社会',unit:'歴史',skill:'recognition',method:'auto'}],events:[],unitLearningSignals:()=>[],miniMockOverview:()=>'',note:()=>'',esc:String,nav:()=>{},view:{querySelectorAll:()=>[{},{}]},mount:s=>html=s});
 vm.runInContext(code,context);
 for(const id of ['SC-SOC-HIS-GAP17-000004','current']){
  context.events=[{id,at:now,date,subject:'社会',unit:'歴史',skill:'recognition',method:'auto',event_type:'graded',outcome:'correct'}];
  vm.runInContext('dashboard()',context);
  assert(html.includes(id==='current'?'current question':'現在は出題対象外・履歴は保持'));
  assert.equal(context.events.length,1);
 }
 console.log('PASS retained current and withdrawn history:',path);
}
