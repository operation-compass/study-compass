'use strict';
// Offline, read-only comparison of three Google Sheets CSV exports.
// No publishing, credential access, or writes to Drive.
const fs = require('node:fs');
function parseCSV(input) {
  input = input.replace(/^\uFEFF/, '');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(quoted){if(ch==='"'&&input[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}
    else if(ch==='"')quoted=true;
    else if(ch===','){row.push(field);field='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&input[i+1]==='\n')i++;row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];}
    else field+=ch;
  }
  if(quoted)throw Error('Invalid CSV: unmatched quote');
  row.push(field);if(row.some(x=>x!==''))rows.push(row);
  if(!rows.length)throw Error('Empty CSV');
  const header=rows.shift().map(s=>s.trim());
  if(new Set(header).size!==header.length)throw Error('Duplicate CSV headers');
  return rows.map(r=>Object.fromEntries(header.map((h,i)=>[h,(r[i]||'').trim()])));
}
function unique(records, key, label){
 const map=new Map();
 for(const r of records){const id=r[key];if(!id)continue;if(map.has(id))throw Error('Duplicate '+label+': '+id);map.set(id,r);}
 return map;
}
function auditFiles(master, approvals, audits){
 const m=unique(master,'question_id','master question_id');
 const a=unique(approvals.filter(r=>r.question_id&&!r.question_id.startsWith('【')),'question_id','approval question_id');
 const t=unique(audits,'question_id','audit question_id');
 const metadataMatched=[],hold=[],unapproved=[];
 for(const [id,row] of m){
   if(row.status!=='PUBLIC'||String(row.publish_flag).toUpperCase()!=='TRUE')continue;
   const approval=a.get(id),audit=t.get(id);
   // MASTER CSV has no authoritative content_sha256 column. Never borrow the audit hash as proof of the source text.
   // Metadata agreement is a review candidate ONLY, not permission to publish.
   const claimedHash=audit?.content_sha256;
   const validHash=typeof claimedHash==='string'&&/^[a-f0-9]{64}$/i.test(claimedHash);
   const matched=approval?.question_id===id&&approval?.approval_status==='APPROVED'&&approval?.approved_version===row.version&&approval?.approved_sha256===claimedHash&&validHash&&
     Boolean(approval?.approved_by&&approval?.approved_at)&&audit?.question_id===id&&audit?.question_version===row.version&&
     ['audit_1_accuracy','audit_2_quality','audit_3_technical'].every(k=>audit[k]==='PASS');
   if(matched)metadataMatched.push(id);
   else hold.push(id);
 }
 for(const id of a.keys())if(!m.has(id))unapproved.push(id);
 return {master:m.size,approvalRows:a.size,auditRows:t.size,metadataMatchedAwaitingContentHash:metadataMatched,blocked:hold,approvalWithoutMaster:unapproved,
   note:'Review only. NEVER publish based on this report: source-version hash must be independently recalculated and existing Web content audited.'};
}
if(require.main===module){
 if(process.argv.includes('--self-test')){
   const rows=parseCSV('a,b\n"hello, world","a""b"\n');if(rows[0].a!=='hello, world'||rows[0].b!=='a"b')throw Error('CSV parse failed');
   const x=auditFiles([{question_id:'X',status:'CHECK',publish_flag:'FALSE'}],[],[]);
   if(x.master!==1||x.metadataMatchedAwaitingContentHash.length)throw Error('unsafe approve');console.log('PASS read-only CSV audit self-test');process.exit(0);
 }
 if(process.argv.length!==5){console.error('Usage: node scripts/audit-drive-export.cjs master.csv approvals.csv audits.csv');process.exit(2);}
 const [master,approvals,audits]=process.argv.slice(2).map(p=>parseCSV(fs.readFileSync(p,'utf8')));
 console.log(JSON.stringify(auditFiles(master,approvals,audits),null,2));
}
module.exports={parseCSV,auditFiles};
