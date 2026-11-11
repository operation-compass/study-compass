'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {validate}=require('./verify-independent-release.cjs');
const sha='a'.repeat(64),id='EXAMPLE';
const row={question_id:id,status:'PUBLIC',publish_flag:'TRUE',version:'v1',content_sha256:sha};
const approval={question_id:id,approval_status:'APPROVED',approved_by:'reviewer',approved_at:'2026-10-22',approved_version:'v1',approved_sha256:sha};
const audit={question_id:id,question_version:'v1',content_sha256:sha,audit_1_accuracy:'PASS',audit_2_quality:'PASS',audit_3_technical:'PASS'};
const release={question_id:id,production_permission:'ALLOW',authorized_by:'human',authorized_at:'2026-10-22',version:'v1',content_sha256:sha};
const snap={source_sha:'source',main_sha:'main',verified_source:'authenticated_google_sheets_readonly',rows:[row],approvals:[approval],audits:[audit]};
const permissions={permissions:[release]};
const keys=crypto.generateKeyPairSync('ed25519');
const key=keys.publicKey.export({type:'spki',format:'pem'});
const payload=JSON.stringify({snapshot:snap,permission:permissions,ids:[id],sourceSha:'source',mainSha:'main'});
const provenance={signature:crypto.sign(null,Buffer.from(payload),keys.privateKey).toString('base64')};
assert(validate(snap,permissions,[id],'source','main',provenance,key));
assert(!validate(snap,permissions,[id],'source','main',provenance));
assert(!validate(snap,permissions,[id],'source','main',{...provenance,signature:'ZmFrZQ=='}));
assert(!validate(snap,permissions,[id],'source','main',provenance,'wrong'));
assert(!validate(snap,permissions,[id],'stale','main',provenance,key));
assert(!validate({...snap,verified_source:'staging_claim'},permissions,[id],'source','main',provenance,key));
assert(!validate({...snap,approvals:[{...approval,approval_note:'本番反映は行わない'}]},permissions,[id],'source','main',provenance,key));
assert(!validate(snap,{permissions:[]},[id],'source','main',provenance,key));
assert(!validate(snap,{permissions:[{...release,production_permission:'HOLD'}]},[id],'source','main',provenance,key));
assert(!validate(snap,permissions,[id,id],'source','main',provenance,key));

// Re-sign realistic adverse states: authentication by itself must not authorize release.
const signedProvenance=(snapshot,permissionsValue=permissions)=>{
 const data=JSON.stringify({snapshot,permission:permissionsValue,ids:[id],sourceSha:'source',mainSha:'main'});
 return {signature:crypto.sign(null,Buffer.from(data),keys.privateKey).toString('base64')};
};
for(const denied of [
 {...row,status:'CHECK',publish_flag:'FALSE'},
 {...row,status:'PUBLIC',publish_flag:'FALSE'},
 {...row,status:'CHECK',publish_flag:'TRUE'},
 {...row,version:'v2'},
 {...row,content_sha256:'b'.repeat(64)}
]){
 const candidate={...snap,rows:[denied]};
 assert(!validate(candidate,permissions,[id],'source','main',signedProvenance(candidate),key),'Signed unauthorized master row was accepted');
}
const forbidden={...snap,approvals:[{...approval,approval_note:'本番反映は行わない'}]};
assert(!validate(forbidden,permissions,[id],'source','main',signedProvenance(forbidden),key),'Explicit no-publication instruction was bypassed');
const noAudit={...snap,audits:[]};
assert(!validate(noAudit,permissions,[id],'source','main',signedProvenance(noAudit),key),'Missing real audit should be HOLD');
console.log('PASS independent release gate negative and positive fixture cases');
