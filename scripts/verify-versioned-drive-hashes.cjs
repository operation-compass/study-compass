'use strict';
/**
 * Read-only verification of real Drive CSV exports.
 * Legacy approval hash and new v2 audit hash are separate contracts.
 * This tool NEVER grants production release authorization.
 */
const crypto=require('node:crypto');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {parseCSV}=require('./audit-drive-export.cjs');
const HASH_FIELDS={
  legacy:['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'],
  v2:['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation']
};
function hash(row,version){
  if(!Object.hasOwn(HASH_FIELDS,version))throw Error('Unsupported hash version: '+version);
  const fields=HASH_FIELDS[version];
  const values=fields.map(k=>String((k==='id'?row.question_id:row[k])??''));
  if(!values[0]||!values[fields.indexOf('question_text')])throw Error('Missing required question values');
  return crypto.createHash('sha256').update(JSON.stringify(values),'utf8').digest('hex');
}
function inspect(master,approvals,audits){
  const index=(rows,label)=>{const m=new Map();for(const row of rows){const id=row.question_id;if(!id||id.startsWith('【'))continue;if(m.has(id))throw Error(label+' duplicate ID '+id);m.set(id,row)}return m};
  const a=index(approvals,'approval'),t=index(audits,'audit');
  const out=[];
  for(const row of master){
    if(!row.question_id)continue;
    if(row.status!=='PUBLIC'||String(row.publish_flag).toUpperCase()!=='TRUE')continue;
    const approval=a.get(row.question_id),audit=t.get(row.question_id);
    const hLegacy=hash(row,'legacy'),hV2=hash(row,'v2');
    const oldMatches=Boolean(approval&&approval.approved_sha256===hLegacy&&approval.approved_version===row.version);
    const auditMatchesLegacy=Boolean(audit&&audit.content_sha256===hLegacy&&audit.question_version===row.version);
    const auditMatchesV2=Boolean(audit&&audit.content_sha256===hV2&&audit.question_version===row.version);
    const noPublish=/(本番反映は行わない|公開禁止|HOLD|do not publish)/i.test(approval?.approval_note||'');
    const approvalComplete=Boolean(approval?.approval_status==='APPROVED'&&approval?.approved_by&&approval?.approved_at);
    const auditsPass=Boolean(audit&&['audit_1_accuracy','audit_2_quality','audit_3_technical'].every(key=>audit[key]==='PASS'));
    out.push({id:row.question_id,approval_version:approval?.approved_version||null,master_version:row.version||null,
      legacy_hash_matches_approval:oldMatches,approval_record_complete:approvalComplete,three_audits_pass:auditsPass,audit_hash_matches_legacy:auditMatchesLegacy,
      audit_hash_matches_v2:auditMatchesV2,has_explicit_no_publish: noPublish,
      publication_authorized:false,
      decision:'HOLD',reason:noPublish?'EXPLICIT_NO_PUBLISH':!oldMatches?'HASH_OR_VERSION_MISMATCH':!approvalComplete?'APPROVAL_INCOMPLETE':!auditsPass?'AUDIT_INCOMPLETE':!(auditMatchesLegacy||auditMatchesV2)?'AUDIT_HASH_MISMATCH':'PRODUCTION_PERMISSION_NOT_VERIFIED'});
  }
  return {checked:out.length,records:out,note:'Diagnostics only. No result from this script authorizes production publishing.'};
}
if(require.main===module){
 if(process.argv.includes('--self-test')){
  const row={question_id:'Q1',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'古代',question_type:'4択',question_text:'誰？',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'説明',version:'v1',status:'PUBLIC',publish_flag:'TRUE'};
  const legacy=hash(row,'legacy'),v2=hash(row,'v2');
  assert.notEqual(legacy,v2);
  const a={question_id:'Q1',approved_version:'v1',approved_sha256:legacy,approval_status:'APPROVED',approved_by:'reviewer',approved_at:'2026-10-16',approval_note:'本番反映は行わない'};
  const t={question_id:'Q1',question_version:'v1',content_sha256:legacy,audit_1_accuracy:'PASS',audit_2_quality:'PASS',audit_3_technical:'PASS'};
  const result=inspect([row],[a],[t]).records[0];
  assert(result.legacy_hash_matches_approval&&result.audit_hash_matches_legacy);
  assert(!result.audit_hash_matches_v2&&result.has_explicit_no_publish&&!result.publication_authorized);
  assert(result.approval_record_complete&&result.three_audits_pass);
  assert.equal(inspect([row],[{...a,approval_note:'',approval_status:'HOLD'}],[t]).records[0].reason,'APPROVAL_INCOMPLETE');
  assert.equal(inspect([row],[{...a,approval_note:''}],[{...t,audit_3_technical:'PENDING'}]).records[0].reason,'AUDIT_INCOMPLETE');
  assert.equal(inspect([{...row,question_text:'別問題'}],[a],[t]).records[0].legacy_hash_matches_approval,false);
  assert.throws(()=>hash(row,'unknown'),/Unsupported/);
  console.log('PASS versioned SHA comparison / explicit HOLD / content drift tests');process.exit(0);
 }
 if(process.argv.length!==5){console.error('Usage: node scripts/verify-versioned-drive-hashes.cjs master.csv approvals.csv audits.csv');process.exit(2)}
 const [m,a,t]=process.argv.slice(2).map(path=>parseCSV(fs.readFileSync(path,'utf8')));
 console.log(JSON.stringify(inspect(m,a,t),null,2));
}
module.exports={hash,inspect,HASH_FIELDS};
