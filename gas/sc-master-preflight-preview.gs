/* Read-only automated technical preflight; no READY or publication approval. */
function studyMasterPreflightPreview(questionIds) {
  if(!Array.isArray(questionIds) || questionIds.length<1 || questionIds.length>10) throw Error('Specify 1-10 explicit question IDs');
  var wanted={};
  questionIds.forEach(function(id){ if(typeof id!=='string'||!id||wanted[id])throw Error('Invalid or duplicate requested ID');wanted[id]=true; });
  var sheet=SpreadsheetApp.openById(STUDY.spreadsheetId);
  var rows=studyRows_(sheet.getSheetByName(STUDY.source));
  var results=[],found={};
  rows.forEach(function(row){
    var id=String(row.question_id||'').trim();
    if(!wanted[id])return;
    if(found[id])throw Error('Duplicate question ID in MASTER: '+id);
    found[id]=true;
    var options=['choice_a','choice_b','choice_c','choice_d'].map(function(k){return String(row[k]||'').trim();});
    var normalized=options.map(function(s){return s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();});
    var correct=String(row.correct_answer||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
    var problems=[];
    if(new Set(normalized).size!==4||normalized.some(function(s){return !s;}))problems.push('DUPLICATE_OR_BLANK_CHOICES');
    if(normalized.filter(function(s){return s===correct;}).length!==1)problems.push('INVALID_ANSWER');
    if(!row.question_text||!row.explanation)problems.push('MISSING_TEXT');
    if(!/^https:\/\//.test(String(row.source_url||'')))problems.push('MISSING_SOURCE_URL');
    if(!row.version)problems.push('MISSING_VERSION');
    if(String(row.status)!=='CHECK'||![false,'FALSE','false',0].includes(row.publish_flag))problems.push('NOT_PENDING_UNPUBLISHED');
    var q={id:id};
    STUDY_FIELDS_V2.forEach(function(k){if(k!=='id')q[k]=String(row[k]==null?'':row[k]);});
    results.push({id:id,version:String(row.version||''),sha256_v2:studySha_(q,'v2'),answer_position:normalized.indexOf(correct)+1,technical_errors:problems,automatic_preflight_ok:problems.length===0,formal_review:'PENDING',production_permission:'HOLD'});
  });
  questionIds.forEach(function(id){if(!found[id])results.push({id:id,technical_errors:['MASTER_ID_NOT_FOUND'],automatic_preflight_ok:false,formal_review:'PENDING',production_permission:'HOLD'});});
  return {mode:'read_only_preflight',production_updated:false,published:0,results:results};
}
if(typeof module!=='undefined')module.exports={studyMasterPreflightPreview};
