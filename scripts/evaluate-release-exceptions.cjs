'use strict';
// Read-only exception adjudication for adopted auto-three-check policy.
// This NEVER grants release; only reports whether an item is eligible for
// separately authenticated, individual, manual release consideration.
const assert=require('node:assert/strict');
const HEX=/^[a-f0-9]{64}$/;
function assess(record,evidence={}){
 assert(record&&typeof record==='object','Missing source record');
 const blockers=[];
 const id=String(record.id||''),version=String(record.version||'');
 if(!id||!version||!HEX.test(String(record.sha256||'')))blockers.push('IDENTITY_NOT_BOUND');
 if(record.master_status!=='CHECK'||record.publish_flag!==false)blockers.push('MASTER_PENDING_STATE_NOT_CONFIRMED');
 if(record.original_hold===true||record.legacy_hold===true||record.user_release_ban===true)blockers.push('EXPLICIT_HOLD_REQUIRES_SEPARATE_CLEARANCE');
 if(evidence.source?.id!==id||evidence.source?.version!==version||evidence.source?.sha256!==record.sha256||evidence.source?.verified!==true)blockers.push('SOURCE_EVIDENCE_UNVERIFIED');
 if(evidence.duplicate?.id!==id||evidence.duplicate?.version!==version||evidence.duplicate?.sha256!==record.sha256||evidence.duplicate?.live_parity!==true||evidence.duplicate?.semantic_checked!==true)blockers.push('DUPLICATE_EVIDENCE_INCOMPLETE');
 if(evidence.curriculum?.id!==id||evidence.curriculum?.version!==version||evidence.curriculum?.sha256!==record.sha256||evidence.curriculum?.checked!==true)blockers.push('CURRICULUM_EVIDENCE_INCOMPLETE');
 if(evidence.runtime?.id!==id||evidence.runtime?.version!==version||evidence.runtime?.sha256!==record.sha256||evidence.runtime?.mobile_ui!==true||evidence.runtime?.grading!==true||evidence.runtime?.history_preserved!==true)blockers.push('BROWSER_RUNTIME_EVIDENCE_INCOMPLETE');
 if(!Array.isArray(evidence.exception_reviews)||evidence.exception_reviews.length!==3||new Set(evidence.exception_reviews.map(x=>x.role)).size!==3||!['accuracy','quality','technical'].every(role=>evidence.exception_reviews.some(x=>x.role===role&&x.id===id&&x.version===version&&x.sha256===record.sha256&&x.decision==='PASS'&&x.evidence_verified===true)))blockers.push('FORMAL_EXCEPTION_REVIEWS_INCOMPLETE');
 // No automatic release, regardless of supplied flags or all green evidence.
 return Object.freeze({id,version,sha256:record.sha256,review_ready:blockers.length===0,blockers,formal_release_approval:'NOT_EVALUATED',release_authorized:false,production_permission:'HOLD'});
}
module.exports={assess};
