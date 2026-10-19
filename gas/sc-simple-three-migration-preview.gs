/* Study COMPASS: read-only preview for the ACTUAL GAS source supplied on 2026-10-19.
 * Uses existing STUDY.spreadsheetId, STUDY.source, studyRows_ and
 * scReadSimpleChecks_ in the bound Apps Script project. Does NOT invoke
 * studyCollect_ because it excludes new-format candidates at the old gate.
 * Do not attach this to existing triggers or write to Sheets/GitHub.
 */
function studySimpleThreeMigrationPreview() {
  var book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  var master=studyRows_(book.getSheetByName(STUDY.source));
  var ids={}, masterById={};
  master.forEach(function(row) {
    var id=String(row.question_id||'').trim();
    if (!id) return;
    if (Object.prototype.hasOwnProperty.call(ids,id)) throw Error('Duplicate MASTER ID: '+id);
    ids[id]=true;
    masterById[id]=row;
  });
  var reviews=scReadSimpleChecks_(book).records;
  var observed={};
  var summary={
    mode:'simple_three_migration_preview',production_updated:false,
    master_ids:Object.keys(ids).length, review_records:reviews.length,
    matched_records:0, missing_master_ids:[], invalid_hashes:[],
    mismatched_master_hashes:[], blocked_master_status:[],
    pass_claims_unverified:0, eligible_for_publication:0
  };
  reviews.forEach(function(review) {
    if (observed[review.id]) throw Error('Duplicate new check ID: '+review.id);
    observed[review.id]=true;
    if (!ids[review.id]) summary.missing_master_ids.push(review.id);
    else {
      summary.matched_records++;
      var row=masterById[review.id];
      var q={id:review.id};
      STUDY_FIELDS_V2.forEach(function(field){if(field!=='id')q[field]=String(row[field]==null?'':row[field]);});
      if (studySha_(q,'v2')!==review.question_sha256 ||
          String(row.version||'')!==String(review.version||''))
        summary.mismatched_master_hashes.push(review.id);
      if (String(row.status||'').trim()!=='CHECK' ||
          !([false,'FALSE','false',0].includes(row.publish_flag)))
        summary.blocked_master_status.push(review.id);
    }
    if (!/^[a-f0-9]{64}$/.test(String(review.question_sha256||'')))
      summary.invalid_hashes.push(review.id);
    if (review.accuracy && review.accuracy.result==='PASS' &&
        review.quality && review.quality.result==='PASS') summary.pass_claims_unverified++;
  });
  // Evidence artifacts and independent approval registry are verified in
  // GitHub after authenticated staging; never assert eligible from GAS alone.
  Logger.log(JSON.stringify(summary));
  return summary;
}
if (typeof module !== 'undefined') module.exports={studySimpleThreeMigrationPreview};
