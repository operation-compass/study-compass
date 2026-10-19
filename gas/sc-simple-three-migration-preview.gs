/* Study COMPASS: read-only preview for the ACTUAL GAS source supplied on 2026-10-19.
 * Uses existing STUDY.spreadsheetId, STUDY.source, studyRows_ and
 * scReadSimpleChecks_ in the bound Apps Script project. Does NOT invoke
 * studyCollect_ because it excludes new-format candidates at the old gate.
 * Do not attach this to existing triggers or write to Sheets/GitHub.
 */
function studySimpleThreeMigrationPreview() {
  var book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  var master=studyRows_(book.getSheetByName(STUDY.source));
  var ids={};
  master.forEach(function(row) {
    var id=String(row.question_id||'').trim();
    if (!id) return;
    if (Object.prototype.hasOwnProperty.call(ids,id)) throw Error('Duplicate MASTER ID: '+id);
    ids[id]=true;
  });
  var reviews=scReadSimpleChecks_(book).records;
  var observed={};
  var summary={
    mode:'simple_three_migration_preview',production_updated:false,
    master_ids:Object.keys(ids).length, review_records:reviews.length,
    matched_records:0, missing_master_ids:[], invalid_hashes:[],
    pass_claims_unverified:0, eligible_for_publication:0
  };
  reviews.forEach(function(review) {
    if (observed[review.id]) throw Error('Duplicate new check ID: '+review.id);
    observed[review.id]=true;
    if (!ids[review.id]) summary.missing_master_ids.push(review.id);
    else summary.matched_records++;
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
