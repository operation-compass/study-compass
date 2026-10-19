#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'auto-publish-ready.cjs'),'utf8');
const start=source.indexOf('  let selected;\n  try { selected=verifyEvidence(bundle,evidenceIndex(source)); }');
const end=source.indexOf('  receipt.selected=selected.ready;',start);
assert(start>=0&&end>start,'HOLD guard missing from real publication script');
const guard=source.slice(start,end);
function check(errorMessage){
 const receipt={production_updated:false},warnings=[],writes=[];
 const context={bundle:{},source:'fixture',receipt,evidenceIndex:()=>[],verifyEvidence:()=>{throw Error(errorMessage)},save:()=>writes.push({...receipt}),console:{warn:s=>warnings.push(s)}};
 vm.runInNewContext('(function(){'+guard+'})()',context);
 return {receipt,warnings,writes};
}
for(const message of [
 'Review ID mismatch','Review version mismatch','Missing or ambiguous review evidence artifact',
 'Review evidence path mismatch','Review artifact identity missing',
 'Missing matching independent review record','Automatic release requires SHA v2'
]){
 const x=check(message);
 assert.equal(x.receipt.result,'held-invalid-audit-evidence',message);
 assert.equal(x.receipt.production_updated,false,message);
 assert.equal(x.receipt.no_change,true,message);
 assert.equal(x.writes.length,1,message);
 assert.equal(x.warnings.length,1,message);
}
for(const message of ['Unexpected network error','Invalid JSON','Missing workflow token']){
 assert.throws(()=>check(message),new RegExp(message),'unexpected errors must remain fatal');
}
{
 const receipt={production_updated:false},warnings=[],writes=[];
 const context={bundle:{},source:'fixture',receipt,evidenceIndex:()=>[],verifyEvidence:()=>({ready:['test-ready']}),save:()=>writes.push(1),console:{warn:s=>warnings.push(s)}};
 vm.runInNewContext('(function(){'+guard+'})()',context);
 assert.equal(receipt.no_change,undefined,'valid evidence must not be held');
 assert.equal(writes.length,0,'valid evidence must not create a HOLD receipt');
 assert.equal(warnings.length,0,'valid evidence must not warn');
}
console.log('PASS: 7 audit HOLD cases, 3 unexpected failures, valid review continuation');
