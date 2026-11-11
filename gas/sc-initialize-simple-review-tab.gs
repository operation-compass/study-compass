/* One-time schema initializer for new Study COMPASS review intake.
 * NOT part of live triggers. Never writes audit PASS, approvals, or MASTER.
 * Requires deliberate manual invocation in the canonical bound GAS project.
 */
function scInitializeSimpleReviewTab_() {
  var book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  var name='Web自動公開｜新3チェック記録';
  var headers=['question_id','question_version','content_sha256','simple_check_record_json'];
  var existing=book.getSheetByName(name);
  if(existing) {
    var values=existing.getRange(1,1,1,headers.length).getValues()[0];
    if(values.some(function(v,i){return String(v)!==headers[i];}))
      throw Error('Existing review tab has incompatible headers: refusing to overwrite');
    return {created:false,header_verified:true,review_records_added:0,production_updated:false};
  }
  // SpreadsheetApp single-threaded execution is not guaranteed; lock prevents
  // competing initializers in the same Apps Script project.
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Unable to acquire review tab initialization lock');
  try {
    existing=book.getSheetByName(name);
    if(existing){
      var v=existing.getRange(1,1,1,headers.length).getValues()[0];
      if(v.some(function(value,i){return String(value)!==headers[i];}))
        throw Error('Review tab created concurrently with incompatible headers');
      return {created:false,header_verified:true,review_records_added:0,production_updated:false};
    }
    var sheet=book.insertSheet(name);
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold');
    return {created:true,header_verified:true,review_records_added:0,production_updated:false};
  } finally {lock.releaseLock();}
}
if(typeof module!=='undefined')module.exports={scInitializeSimpleReviewTab_};
