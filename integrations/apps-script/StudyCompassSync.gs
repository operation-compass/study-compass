/**
 * Study COMPASS: read-only master → GitHub staging (never production).
 * Paste into a script bound to the Study COMPASS MASTER spreadsheet.
 * Script properties: STUDY_GITHUB_TOKEN (fine-grained token restricted to this repo).
 * Execute studyPreview() before studyStageApproved(). No trigger until explicitly enabled.
 * AI three-stage verification replaces the per-question human approval requirement.
 * Required permissions: Spreadsheet read, external HTTPS request.
 */
const STUDY = Object.freeze({
  spreadsheetId:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',
  repo:'operation-compass/study-compass',
  branch:'feature/drive-approval-gate-20261016',
  source:'問題MASTER',
  audit:'Web自動公開｜3段階監査ログ'
});
const STUDY_FIELDS=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const STUDY_FIELDS_V2=['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function studyRows_(sheet) {
  if(!sheet)throw Error('Missing required sheet');
  const values=sheet.getDataRange().getValues(), headers=values.shift().map(String);
  return values.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]])));
}
function studySha_(q,hashVersion) {
  if(hashVersion && hashVersion!=='v1' && hashVersion!=='v2')throw Error('Unsupported SHA version');
  const fields=hashVersion==='v2'?STUDY_FIELDS_V2:STUDY_FIELDS;
  const payload=JSON.stringify(fields.map(k=>String(q[k]===undefined||q[k]===null?'':q[k])));
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,payload,Utilities.Charset.UTF_8)
    .map(x=>('0'+(x<0?x+256:x).toString(16)).slice(-2)).join('');
}
function studyValidAuditDate_(value) {
  const str=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(str))return false;
  const ms=Date.parse(str);
  return Number.isFinite(ms)&&ms<=Date.now()+60000;
}
function studyValidV2Metadata_(q) {
  return /^中[123]$/.test(q.grade)&&!!q.unit_major.trim()&&!!q.unit_minor.trim();
}
function studyReviewEvidenceComplete_(audit,sha) {
  const reviews=audit&&audit.independent_reviews;
  if(!Array.isArray(reviews)||reviews.length!==3)return false;
  const roles=['accuracy','quality','technical'],ids=new Set();
  for(const role of roles){
    const group=reviews.filter(r=>r&&r.role===role);
    if(group.length!==1)return false;
    const r=group[0],id=String(r.reviewer_id||'');
    if(r.result!=='PASS'||!id.trim()||ids.has(id)||r.question_sha256!==sha||
       !/^[a-f0-9]{64}$/.test(String(r.evidence_sha256||''))||
       !studyValidAuditDate_(r.checked_at))return false;
    ids.add(id);
  }
  return true;
}
function studyCollect_() {
  const book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  const rows=studyRows_(book.getSheetByName(STUDY.source));
  const audit=studyAuditRecords_(book,[] ,true);
  const auditMap=new Map(audit.records.map(a=>[a.id,a]));
  const seen=new Set(), auditedItems=[], legacyItems=[];
  for(const row of rows) {
    const id=String(row.question_id||'').trim();
    if(!id)continue;
    if(seen.has(id))throw Error('Duplicate MASTER ID: '+id);
    seen.add(id);
    const enabled=row.publish_flag===true||String(row.publish_flag).toUpperCase()==='TRUE';
    const status=String(row.status||'').trim();
    const reviewed=auditMap.get(id);
    const legacyPublic=status==='PUBLIC'&&enabled;
    const auditedCheck=status==='CHECK'&&reviewed&&reviewed.final_decision==='READY';
    if(!legacyPublic&&!auditedCheck)continue;
    const q={id,subject:String(row.subject||''),grade:String(row.grade||''),unit_major:String(row.unit_major||''),unit_minor:String(row.unit_minor||''),question_type:String(row.question_type||''),
      question_text:String(row.question_text||''),choice_a:String(row.choice_a||''),
      choice_b:String(row.choice_b||''),choice_c:String(row.choice_c||''),
      choice_d:String(row.choice_d||''),correct_answer:String(row.correct_answer||''),
      explanation:String(row.explanation||''),version:String(row.version||'') || (auditedCheck?reviewed.version:'')};
    if(auditedCheck){
      const hashVersion=reviewed.hash_version||'v1';
      if(hashVersion!=='v1'&&hashVersion!=='v2')continue;
      if(hashVersion==='v2'&&!studyValidV2Metadata_(q))continue;
      const sha=studySha_(q,hashVersion);
      const pass=studyReviewEvidenceComplete_(reviewed,sha)&&reviewed.version===q.version&&reviewed.sha256===sha&&
        reviewed.accuracy==='PASS'&&reviewed.quality==='PASS'&&reviewed.technical==='PASS'&&
        reviewed.risk==='LOW'&&!reviewed.exception_reason&&
        studyValidAuditDate_(reviewed.checked_at)&&studyValidAuditDate_(reviewed.accuracy_checked_at)&&
        studyValidAuditDate_(reviewed.quality_checked_at)&&studyValidAuditDate_(reviewed.technical_checked_at)&&
        String(reviewed.evidence_url||'').startsWith('https://');
      if(!pass)continue;
    }
    if(!q.question_text||!q.correct_answer||!q.explanation)throw Error('Incomplete content: '+id);
    (auditedCheck?auditedItems:legacyItems).push(q);
  }
  // Audited CHECK records take precedence over already-PUBLIC records.
  // Keep every candidate for production comparison; only the final GitHub batch is limited to five.
  const items=[...auditedItems,...legacyItems];
  return {items,scanned:seen.size,eligible:items.length,pending_audited:Math.max(0,auditedItems.length-5)};
}

// Read three-stage audit rows without altering the Drive source. Missing evidence stays HOLD.
function studyAuditRecords_(book,approvedItems,includeAll) {
  const sheet=book.getSheetByName(STUDY.audit);
  if(!sheet)throw Error('Missing three-stage audit sheet');
  const allowed=new Set(approvedItems.map(q=>q.id));
  const records=[], seen=new Set();
  for(const row of studyRows_(sheet)) {
    const id=String(row.question_id||'').trim();
    if(!id||(!includeAll&&!allowed.has(id)))continue;
    if(seen.has(id))throw Error('Duplicate audit ID: '+id);
    seen.add(id);
    const date=v=>v instanceof Date?Utilities.formatDate(v,'Asia/Tokyo',"yyyy-MM-dd'T'HH:mm:ssXXX"):String(v||'').trim();
    // Optional signed-review evidence JSON column; missing or invalid stays unreleasable.
    let independentReviews=[];
    const rawReviews=String(row.independent_reviews_json||'').trim();
    if(rawReviews){
      try {
        independentReviews=JSON.parse(rawReviews);
        if(!Array.isArray(independentReviews))throw Error('Expected JSON array');
      }catch(e){throw Error('Invalid independent review evidence JSON for '+id+': '+e.message);}
    }
    records.push({
      independent_reviews:independentReviews,
      id,version:String(row.question_version||'').trim(),
      hash_version:String(row.hash_version||'v1').trim(),
      sha256:String(row.content_sha256||'').trim(),
      accuracy:String(row.audit_1_accuracy||'').trim(),
      accuracy_checked_at:date(row.audit_1_checked_at),
      evidence_url:String(row.audit_1_evidence_url||'').trim(),
      quality:String(row.audit_2_quality||'').trim(),
      quality_checked_at:date(row.audit_2_checked_at),
      technical:String(row.audit_3_technical||'').trim(),
      technical_checked_at:date(row.audit_3_checked_at),
      risk:String(row.risk_class||'').trim(),
      exception_reason:String(row.exception_reason||'').trim(),
      final_decision:String(row.final_decision||'').trim(),
      checked_at:date(row.last_reviewed_at)
    });
  }
  return {records};
}

function studyPreview() {
  const c=studyCollect_();
  const summary={scanned:c.scanned,candidates:Math.min(5,c.items.length),eligible:c.eligible,pending_audited:c.pending_audited,mode:'preview_only',production_updated:false};
  Logger.log(JSON.stringify(summary));return summary;
}
/**
 * Read-only migration preflight. Does not change any cells, hashes, or publish flags.
 * Before SHA v2 rollout, inspect these counts. Never auto-promote v1 to v2.
 */
function studyAuditMigrationPreview() {
  const book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  const sheet=book.getSheetByName(STUDY.audit);
  if(!sheet)throw Error('Missing three-stage audit sheet');
  const values=sheet.getDataRange().getValues();
  if(!values.length)throw Error('Empty audit sheet');
  const headers=values[0].map(v=>String(v).trim());
  const required=['question_id','question_version','content_sha256','audit_1_accuracy','audit_2_quality','audit_3_technical','risk_class','final_decision'];
  const missing=required.filter(x=>!headers.includes(x));
  if(missing.length)throw Error('Missing audit columns: '+missing.join(', '));
  const hasV2Column=headers.includes('hash_version');
  const rows=studyRows_(sheet);
  const summary={mode:'read_only',production_updated:false,source_rows:rows.length,has_hash_version_column:hasV2Column,v1:0,v2:0,unknown:0,ready_v1:0,ready_v2:0,hold:0};
  for(const row of rows) {
    if(!String(row.question_id||'').trim())continue;
    const version=hasV2Column?String(row.hash_version||'v1').trim():'v1';
    if(version==='v1')summary.v1++;
    else if(version==='v2')summary.v2++;
    else summary.unknown++;
    if(String(row.final_decision||'').trim()==='READY'){
      if(version==='v1')summary.ready_v1++;
      else if(version==='v2')summary.ready_v2++;
    }else summary.hold++;
  }
  Logger.log(JSON.stringify(summary));
  return summary;
}

function studySameSnapshot_(left,right) {
  if(!left||!right)return false;
  // Refresh unchanged evidence at least every 12h; release snapshots expire after 24h.
  const last=Date.parse(left.approval&&left.approval.exported_at);
  if(!Number.isFinite(last)||Date.now()-last>=12*60*60*1000||last>Date.now()+60000)return false;
  // Skip only when the last export is still fresh and question/audit contents match.
  return JSON.stringify(left.candidate)===JSON.stringify(right.candidate)&&
    JSON.stringify(left.audit)===JSON.stringify(right.audit)&&
    left.approval&&right.approval&&
    left.approval.mode===right.approval.mode&&
    left.approval.source_spreadsheet_id===right.approval.source_spreadsheet_id;
}
function studyPutGitHub_(file,data,token) {
  const url='https://api.github.com/repos/'+STUDY.repo+'/contents/'+file;
  const opts={headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},muteHttpExceptions:true};
  const existing=UrlFetchApp.fetch(url+'?ref='+encodeURIComponent(STUDY.branch),opts);
  if(existing.getResponseCode()!==200 && existing.getResponseCode()!==404)throw Error('GitHub lookup error: '+existing.getResponseCode());
  const current=existing.getResponseCode()===200?JSON.parse(existing.getContentText()):null;
  const sha=current?current.sha:undefined;
  if(current){
    try{
      const old=JSON.parse(Utilities.newBlob(Utilities.base64Decode(current.content.replace(/\s/g,''))).getDataAsString());
      if(studySameSnapshot_(old,data))return {unchanged:true};
    }catch(e){throw Error('Cannot verify previous staging snapshot: '+e.message);}
  }
  const content=Utilities.base64Encode(Utilities.newBlob(JSON.stringify(data,null,2),'application/json').getBytes());
  const body={message:'Stage audited Drive snapshot (NOT production)',content,branch:STUDY.branch};
  if(sha)body.sha=sha;
  const result=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',payload:JSON.stringify(body),headers:opts.headers,muteHttpExceptions:true});
  if(result.getResponseCode()!==200&&result.getResponseCode()!==201)throw Error('GitHub stage error HTTP '+result.getResponseCode());
  return {unchanged:false};
}
// Read both production snapshots BEFORE selecting a staging batch.
// Never use a rotating cursor: failed or unmerged questions must be retried.
function studyProductionRevision_(token) {
  const response=UrlFetchApp.fetch('https://api.github.com/repos/'+STUDY.repo+'/git/ref/heads/main',
    {headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw Error('Cannot resolve production revision');
  const sha=JSON.parse(response.getContentText()).object?.sha;
  if(!/^[a-f0-9]{40}$/.test(String(sha||'')))throw Error('Invalid production revision');
  return sha;
}
function studyProductionSocial_(file,token,revision) {
  if(!/^[a-f0-9]{40}$/.test(String(revision||'')))throw Error('Pinned production revision required');
  const url='https://api.github.com/repos/'+STUDY.repo+'/contents/'+file+'?ref='+revision;
  // Contents JSON omits Base64 content above 1 MB; the actual HTML already exceeds it.
  const response=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github.raw+json'},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw Error('Cannot verify production '+file+': HTTP '+response.getResponseCode());
  const html=response.getContentText();
  if(!/^\s*<!doctype html/i.test(html))throw Error('Production HTML unavailable: '+file);
  const tag='const SOCIAL = ',begin=html.indexOf(tag);
  if(begin<0)throw Error('Production SOCIAL array missing: '+file);
  const start=begin+tag.length,end=html.indexOf(';',start);
  if(end<=start)throw Error('Production SOCIAL terminator missing: '+file);
  const questions=JSON.parse(html.slice(start,end));
  if(!Array.isArray(questions))throw Error('Invalid production array: '+file);
  const map=new Map();
  for(const q of questions){if(!q.id||map.has(q.id))throw Error('Duplicate production ID: '+file);map.set(q.id,q);}
  return map;
}
function studyNeedsPublication_(q,current,review) {
  if(!current)return review&&review.hash_version==='v2';
  if(q.subject!==current.subject||q.question_type!=='4択')return false;
  const options=[q.choice_a,q.choice_b,q.choice_c,q.choice_d].map(x=>String(x||'').trim());
  if(options.some(x=>!x)||new Set(options).size!==4||!options.includes(q.correct_answer))return false;
  return q.question_text!==current.q||q.correct_answer!==current.answer||
    JSON.stringify(options)!==JSON.stringify(current.options)||q.explanation!==current.ex;
}
function studyUnpublishedBatch_(items,auditRecords,token) {
  const revision=studyProductionRevision_(token);
  const a=studyProductionSocial_('index.html',token,revision),b=studyProductionSocial_('legacy-study.html',token,revision);
  if(a.size!==b.size)throw Error('Production snapshots have different question counts');
  for(const [id,question] of a) {
    const other=b.get(id);
    if(!other||JSON.stringify(question)!==JSON.stringify(other))throw Error('Production snapshots disagree: '+id);
  }
  const audits=new Map(auditRecords.map(x=>[x.id,x]));
  const unpublished=[];
  for(const q of items) {
    const current=a.get(q.id),review=audits.get(q.id);
    // Never allow legacy PUBLIC records with missing/HOLD audits to consume release slots.
    if(!review||review.final_decision!=='READY'||review.risk!=='LOW'||review.exception_reason)continue;
    if(!current&&review.hash_version!=='v2')continue;
    if(studyNeedsPublication_(q,current,review))unpublished.push(q);
  }
  return {items:unpublished.slice(0,5),pending:Math.max(0,unpublished.length-5),total_unpublished:unpublished.length};
}

function studyStageApproved() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Another Study COMPASS stage process is running');
  try {
    const c=studyCollect_();
    const token=PropertiesService.getScriptProperties().getProperty('STUDY_GITHUB_TOKEN');
    if(!token)throw Error('Missing STUDY_GITHUB_TOKEN script property');
    const book=SpreadsheetApp.openById(STUDY.spreadsheetId);
    const audit=studyAuditRecords_(book,c.items);
    // This preflight fails closed if either production snapshot is unavailable.
    const batch=studyUnpublishedBatch_(c.items,audit.records,token);
    if(!batch.items.length){
      Logger.log('No unpublished candidates in current staging selection; production unchanged');
      return {staged:0,skipped:true,pending_audited:c.pending_audited,production_updated:false};
    }
    const selectedIds=new Set(batch.items.map(q=>q.id));
    audit.records=audit.records.filter(x=>selectedIds.has(x.id));
    // Atomic staging artifact: candidate and approval snapshot cannot diverge between commits.
    const put=studyPutGitHub_('data/staging/drive-sync-bundle.json',{
      schema_version:1,
      candidate:{items:batch.items},
      audit,
      approval:{
        mode:'ai_three_stage',source_spreadsheet_id:STUDY.spreadsheetId,
        export_source:'authenticated-drive-export',exported_at:new Date().toISOString()
      }
    },token);
    if(put.unchanged){Logger.log('No content changes; GitHub staging commit skipped');return {staged:0,unchanged:true,production_updated:false};}
    Logger.log('Staged '+batch.items.length+' unpublished candidates; '+audit.records.length+' audit records; '+batch.pending+' pending in selection; production unchanged');
    return {staged:batch.items.length,unchanged:false,pending:batch.pending,production_updated:false};
  } finally {lock.releaseLock();}
}

/**
 * One-time setup: schedules STAGING ONLY every two hours.
 * Idempotent: repeated setup leaves exactly one studyStageApproved trigger.
 * Never configures or authorizes production publishing.
 */
function studyInstallTwoHourTrigger() {
  const handler='studyStageApproved';
  const triggers=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler);
  if(triggers.length===1) {
    Logger.log('Existing staging trigger found; no duplicate created.');
    return {installed:false,existing:1,production_updated:false};
  }
  // Remove only duplicate triggers for our own staging handler.
  for(const trigger of triggers)ScriptApp.deleteTrigger(trigger);
  ScriptApp.newTrigger(handler).timeBased().everyHours(2).create();
  Logger.log('Study COMPASS staging trigger installed: every 2 hours; never deploys production.');
  return {installed:true,existing:1,production_updated:false};
}
function studyTriggerStatus() {
  const list=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='studyStageApproved');
  const result={handler:'studyStageApproved',count:list.length,production_updated:false};
  Logger.log(JSON.stringify(result));return result;
}
