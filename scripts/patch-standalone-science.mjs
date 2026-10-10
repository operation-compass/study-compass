// Offline patch for two independently unanswerable science questions.
// Run on a freshly checked-out GitHub repository: node scripts/patch-standalone-science.mjs legacy-study.html
// SAFETY: refuses zero-byte or unexpected HTML, duplicate IDs, and changed source.
// No network, no Drive updates, no deployment; review resulting diff before merging.
import fs from 'node:fs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/patch-standalone-science.mjs legacy-study.html');process.exit(2)}
const original=fs.readFileSync(path,'utf8');
if(original.length<500000||!original.includes('const SCIENCE = [')){throw Error('Unexpected or empty legacy HTML; refusing to write')}
const changes=[
['SC-SCI-EXAM-000002','前問の結果から、電圧と電流の関係として最も適切なのは？','一定の抵抗器で、電圧1Vのとき電流0.2A、2Vのとき0.4A、3Vのとき0.6Aだった。この結果から電圧と電流の関係として最も適切なのは？'],
['SC-SCI-EXAM2-000002','前問の関係が成り立つとき、銅6.0gが完全に酸化した場合の生成物の質量は？','銅4.0gを完全に酸化させると生成物は5.0gだった。同じ質量比で銅6.0gを完全に酸化させたとき、生成物は何gになる？']
];
let result=original;
for(const [id,before,after] of changes){
 const start=result.indexOf('"id":"'+id+'"');
 if(start<0)throw Error('ID missing: '+id);
 if(result.indexOf('"id":"'+id+'"',start+1)!==-1)throw Error('ID duplicated: '+id);
 const end=result.indexOf('}',start);
 const snippet=result.slice(start,end+1);
 const old='"q":'+JSON.stringify(before),replacement='"q":'+JSON.stringify(after);
 if(!snippet.includes(old))throw Error('Original question changed: '+id);
 const rewritten=snippet.replace(old,replacement);
 result=result.slice(0,start)+rewritten+result.slice(end+1);
}
if(result===original)throw Error('No modifications');
fs.writeFileSync(path,result,'utf8');
console.log('Updated 2 science questions; inspect git diff and test all learning modes before deployment.');
