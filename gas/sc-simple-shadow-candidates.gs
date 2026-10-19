/* Study COMPASS: authenticated MASTER → simple-review SHADOW candidates.
 * Requires existing bound GAS functions STUDY, studyRows_, studySha_,
 * studyValidV2Metadata_, and scReadSimpleChecks_. Never sets READY or writes.
 */
function scBuildSimpleShadowCandidates_() {
  var book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  if(!book.getSheetByName('Web自動公開｜新3チェック記録'))
    throw Error('NEW_THREE_CHECK_REVIEW_TAB_MISSING: shadow migration is not configured');
  var rows=studyRows_(book.getSheetByName(STUDY.source));
  var reviews=scReadSimpleChecks_(book).records;
  var byId={}, ids={};
  rows.forEach(function(row){
    var id=String(row.question_id||'').trim();
    if(!id)return;
    if(Object.prototype.hasOwnProperty.call(byId,id))throw Error('Duplicate MASTER ID: '+id);
    byId[id]=row;
    ids[id]=true;
  });
  var candidates=[],held=[],seen={};
  reviews.forEach(function(a){
    var id=String(a.id||'').trim();
    if(!id||Object.prototype.hasOwnProperty.call(seen,id))throw Error('Duplicate/empty review ID');
    seen[id]=true;
    var row=byId[id];
    if(!row){held.push({id:id,reason:'MASTER_ID_NOT_FOUND'});return;}
    // Shadow migration is restricted to explicitly pending, non-public MASTER
    // questions. Review JSON must never resurrect a retired/public row.
    if(String(row.status||'').trim()!=='CHECK' ||
       [false,'FALSE','false','',0].indexOf(row.publish_flag)===-1){
      held.push({id:id,reason:'MASTER_NOT_CHECK_UNPUBLISHED'});return;
    }
    var q={id:id,subject:String(row.subject||''),grade:String(row.grade||''),
      unit_major:String(row.unit_major||''),unit_minor:String(row.unit_minor||''),
      question_type:String(row.question_type||''),question_text:String(row.question_text||''),
      choice_a:String(row.choice_a||''),choice_b:String(row.choice_b||''),
      choice_c:String(row.choice_c||''),choice_d:String(row.choice_d||''),
      correct_answer:String(row.correct_answer||''),explanation:String(row.explanation||''),
      version:String(row.version||'')};
    if(!studyValidV2Metadata_(q) || !q.version ||
      a.version!==q.version || a.question_sha256!==studySha_(q,'v2')){
      held.push({id:id,reason:'SHA_OR_METADATA_MISMATCH'});return;
    }
    // No claim of correctness or release; full review/evidence verification is downstream.
    candidates.push(q);
  });
  return {schema_version:1,mode:'shadow_only',production_updated:false,
    candidate:{items:candidates},simple_checks:{records:reviews},
    canonical_master_ids:Object.keys(ids),held:held};
}
if(typeof module!=='undefined')module.exports={scBuildSimpleShadowCandidates_};
