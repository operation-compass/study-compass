const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const denied=new Set(JSON.parse(fs.readFileSync('data/release/withheld-ids.json','utf8')).ids);
const names=['SOCIAL','WORDS','ENGLISH_GRAMMAR','JAPANESE','MATH','SCIENCE'];
let reference;
for(const path of ['legacy-study.html','index.html']){
  const html=fs.readFileSync(path,'utf8');
  const script=html.split('<script>')[1]?.split('</script>')[0];
  assert(script?.includes('const KEY='),'Question bank script missing: '+path);
  const prefix=script.slice(0,script.indexOf('const KEY='));
  const bank=vm.runInNewContext(prefix+';({items,BANK_ISSUES})',{}, {timeout:15000});
  assert.equal(bank.BANK_ISSUES.length,0,path+': '+bank.BANK_ISSUES.join(','));
  assert(!bank.items.some(q=>denied.has(q.id)),path+': withheld item reintroduced');
  assert(html.includes("const KEY='studyCompassAlphaV3'"),path+': history storage key changed');
  const arrays=[...script.matchAll(/const (SOCIAL|WORDS|ENGLISH_GRAMMAR|JAPANESE|MATH|SCIENCE)\s*=\s*(\[[^\n]*\]);/g)];
  assert.equal(arrays.length,names.length,path+': missing array');
  const canonical=JSON.stringify(Object.fromEntries(arrays.map(m=>[m[1],JSON.parse(m[2])])));
  if(reference)assert.equal(canonical,reference,'Index and routed question banks differ');
  reference=canonical;
  console.log(path+': '+bank.items.length+' items; structure and known-withheld checks passed');
}
