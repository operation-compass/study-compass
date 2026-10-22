/**
 * Study COMPASS: adopted automatic 3-stage checks + exception review (SHADOW).
 * Read-only. No writes, GitHub staging, approvals or publication.
 * Requires existing STUDY, studyRows_, and studyMasterPreflightPreview.
 */
function studyPreviewThreeCoinsExceptionsReadOnly() {
  var ids=['SC-SOC-HIS-WEB26-000001','SC-SOC-HIS-WEB26-000002','SC-SOC-HIS-WEB26-000003'];
  var preflight=studyMasterPreflightPreview(ids);
  var book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  var rows=studyRows_(book.getSheetByName(STUDY.source));
  var byId={};
  rows.forEach(function(row){
    var id=String(row.question_id||'').trim();
    if(ids.indexOf(id)<0)return;
    if(byId[id])throw Error('Duplicate MASTER ID: '+id);
    byId[id]=row;
  });
  var reviewsSheet=book.getSheetByName('Web自動公開｜新3チェック記録');
  var auditRecords=reviewsSheet?studyRows_(reviewsSheet):[];
  var auditCounts={};
  auditRecords.forEach(function(row){
    var id=String(row.question_id||'').trim();
    if(ids.indexOf(id)>=0)auditCounts[id]=(auditCounts[id]||0)+1;
  });
  var items=preflight.results.map(function(technical){
    var row=byId[technical.id],exceptions=[];
    if(!row)exceptions.push('MASTER_ID_NOT_FOUND');
    if(!technical.automatic_preflight_ok)exceptions.push('TECHNICAL_PREFLIGHT_FAILED');
    if(!row || !/^https:\/\//i.test(String(row.source_url||'')))exceptions.push('SOURCE_URL_MISSING');
    // URL presence and past audits are NOT proof of current factual correctness.
    exceptions.push('SOURCE_CONTENT_NOT_AUTOMATICALLY_VERIFIED');
    exceptions.push('SEMANTIC_DUPLICATE_AND_WEB_NOT_VERIFIED');
    exceptions.push('CURRICULUM_REVIEW_NOT_VERIFIED');
    exceptions.push('MOBILE_GRADING_HISTORY_NOT_VERIFIED');
    if(!auditCounts[technical.id])exceptions.push('FORMAL_REVIEW_RECORD_MISSING');
    if(auditCounts[technical.id]>1)exceptions.push('DUPLICATE_FORMAL_REVIEW_RECORD');
    if(row && (String(row.status)!=='CHECK'||String(row.publish_flag).toUpperCase()!=='FALSE'))
      exceptions.push('MASTER_STATE_REQUIRES_MANUAL_REVIEW');
    // Both a review row and approval are needed from a verified independent authority.
    exceptions.push('TRUSTED_RELEASE_AUTHORIZATION_MISSING');
    return {id:technical.id,version:technical.version,sha256_v2:technical.sha256_v2,
      stage1_accuracy:'EXCEPTION_REVIEW',stage2_learning:'EXCEPTION_REVIEW',
      stage3_technical:technical.automatic_preflight_ok?'PREFLIGHT_PASS':'FAIL',
      exceptions:exceptions,exception_review_required:true,
      formal_review:'PENDING',release_authorized:false,production_permission:'HOLD'};
  });
  var out={schema_version:1,mode:'read_only_exception_preview',
    production_updated:false,published:0,exception_count:items.length,
    results:items};
  Logger.log(JSON.stringify(out));
  return out;
}

// Read-only classification: evidence availability never constitutes reviewer approval.
function studyClassifyThreeCoinsExceptionsReadOnly() {
  var preview=studyPreviewThreeCoinsExceptionsReadOnly();
  var automated=['TECHNICAL_PREFLIGHT_FAILED','MASTER_ID_NOT_FOUND','SOURCE_URL_MISSING','MASTER_STATE_REQUIRES_MANUAL_REVIEW','DUPLICATE_FORMAL_REVIEW_RECORD'];
  var needsHuman=['SOURCE_CONTENT_NOT_AUTOMATICALLY_VERIFIED','SEMANTIC_DUPLICATE_AND_WEB_NOT_VERIFIED','CURRICULUM_REVIEW_NOT_VERIFIED','MOBILE_GRADING_HISTORY_NOT_VERIFIED','FORMAL_REVIEW_RECORD_MISSING','TRUSTED_RELEASE_AUTHORIZATION_MISSING'];
  var results=preview.results.map(function(row) {
    return {id:row.id,version:row.version,sha256_v2:row.sha256_v2,
      machine_checkable:row.exceptions.filter(function(e){return automated.indexOf(e)>=0;}),
      evidence_or_independent_review_required:row.exceptions.filter(function(e){return needsHuman.indexOf(e)>=0;}),
      unclassified_blockers:row.exceptions.filter(function(e){return automated.indexOf(e)<0&&needsHuman.indexOf(e)<0;}),
      release_authorized:false,production_permission:'HOLD'};
  });
  var out={mode:'read_only_exception_classification',results:results,
    production_updated:false,published:0,release_authorized:false,production_permission:'HOLD'};
  Logger.log(JSON.stringify(out));
  return out;
}

if(typeof module!=='undefined')module.exports={studyPreviewThreeCoinsExceptionsReadOnly,studyClassifyThreeCoinsExceptionsReadOnly};
