'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {prepare}=require('./prepare-ready-release.cjs');
const bundle=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/staging/drive-sync-bundle.json'),'utf8'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-safe-release-'));
try {
 const original=JSON.parse(JSON.stringify(bundle));
 original.approval.exported_at='2020-01-01T00:00:00.000Z';
 assert.throws(()=>prepare(original,dir),/Stale or invalid/);
 const recent=JSON.parse(JSON.stringify(bundle));
 recent.approval.exported_at=new Date().toISOString();
 assert.throws(()=>prepare({...recent,approval:{...recent.approval,export_source:'hand-edited'}},dir),/Untrusted export/);
 assert.throws(()=>prepare({...recent,approval:{...recent.approval,source_spreadsheet_id:'wrong'}},dir),/Wrong source/);
 assert.throws(()=>prepare({...recent,approval:{...recent.approval,exported_at:'3000-01-01'}},dir),/Stale or invalid/);
 assert.throws(()=>prepare({...recent,audit:{records:[]}},dir),/No READY/);
 assert.throws(()=>prepare({...recent,candidate:{items:[...recent.candidate.items,...recent.candidate.items]}},dir),/Duplicate candidate/);
 console.log('Fail-closed release prerequisites passed; no production changes.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
