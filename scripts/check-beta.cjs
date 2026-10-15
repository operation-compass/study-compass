const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const helper=fs.readFileSync('beta-storage.js','utf8');
for(const file of ['written-practice.html','generated-practice.html']){
 const code=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0];
 const written=file.startsWith('written');
 for(const scenario of ['normal','malformed','bad-shape','read-denied','write-denied','legacy']){
  const nodes=new Map();let writes=0;
  const node=()=>({textContent:'',innerHTML:'',value:'',style:{},children:[],classList:{add(){}},appendChild(x){this.children.push(x)}});
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,querySelectorAll(){return document.getElementById('choices').children}};
  const saved=written?{i:0,scores:{oldQuestion:2}}:{i:0,score:0,answered:{oldQuestion:true}};
  const storage={getItem(){if(scenario==='read-denied')throw Error('denied');return scenario==='malformed'?'{bad':scenario==='bad-shape'?'null':scenario==='legacy'?JSON.stringify(saved):null},setItem(){writes++;if(scenario==='write-denied')throw Error('quota')}};
  const context=vm.createContext({document,localStorage:storage});
  vm.runInContext(helper+'\n'+code,context,{timeout:3000});
  assert(document.getElementById(written?'q':'question').textContent,'initial render: '+scenario);
  if(written){
   document.getElementById('answer').value='米も土地も争いも関係ありません。';
   document.getElementById('check').onclick();
   assert(document.getElementById('result').innerHTML.includes('参考'));
   assert(!document.getElementById('result').innerHTML.includes('点</div>'));
   assert.equal(vm.runInContext('grade(qs[0],"米も土地も争いも関係ありません。").score',context),undefined);
   if(scenario==='legacy')assert.equal(vm.runInContext('state.scores.oldQuestion',context),2);
  }else{
   vm.runInContext('answer(document.getElementById("choices").children[0],Q[0].a)',context);
   assert(document.getElementById('result').textContent.includes('正解'));
   assert.equal(vm.runInContext('Q.length',context),24);
   assert(vm.runInContext('Q.every(q=>q.o.length===4&&new Set(q.o).size===4&&q.o.filter(x=>x===q.a).length===1&&q.m.length>0)',context));
  }
  assert.equal(document.getElementById('result').style.display,'block');
  document.getElementById('next').onclick();
  assert.equal(vm.runInContext('state.i',context),1);
  if(['malformed','bad-shape','read-denied'].includes(scenario))assert.equal(writes,0,'must preserve unreadable original');
  if(['malformed','bad-shape','read-denied','write-denied'].includes(scenario))assert(document.getElementById('storageNotice').textContent);
  console.log('PASS',file,scenario);
 }
}
