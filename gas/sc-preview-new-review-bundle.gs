/* Study COMPASS read-only end-to-end GAS bridge.
 * Works alongside the real Code.gs functions without modifying its
 * existing staging trigger, output branch, or READY selector.
 * Requires sc-simple-check-export.gs and sc-simple-shadow-candidates.gs.
 * The returned bundle is for SHADOW validation ONLY: do not call
 * studyPutGitHub_ or any production publisher with this output.
 */
function scPreviewNewReviewStagingBundle_() {
  if (typeof scBuildSimpleShadowCandidates_ !== 'function')
    throw Error('Missing shadow MASTER candidate builder');
  var snapshot=scBuildSimpleShadowCandidates_();
  if (snapshot.mode!=='shadow_only'||snapshot.production_updated!==false ||
      !Array.isArray(snapshot.candidate && snapshot.candidate.items) ||
      !Array.isArray(snapshot.canonical_master_ids) ||
      !Array.isArray(snapshot.simple_checks && snapshot.simple_checks.records))
    throw Error('Invalid shadow snapshot');
  var present={};
  snapshot.canonical_master_ids.forEach(function(id) {
    if(!id||present[id])throw Error('Invalid/duplicate canonical MASTER ID');
    present[id]=true;
  });
  snapshot.candidate.items.forEach(function(q) {
    if(!q||!present[q.id])throw Error('Shadow candidate not in canonical MASTER');
  });
  // Existing GitHub selector requires the old audit shape, but we MUST
  // not manufacture legacy PASS. Empty audit is explicit and safe.
  return {
    schema_version:1,
    candidate:snapshot.candidate,
    audit:{records:[]},
    simple_checks:snapshot.simple_checks,
    canonical_master_ids:snapshot.canonical_master_ids,
    shadow_held:snapshot.held,
    approval:{mode:'shadow_only',publication_approved:false,
      source_spreadsheet_id:STUDY.spreadsheetId},
    production_updated:false
  };
}
if(typeof module!=='undefined')module.exports={scPreviewNewReviewStagingBundle_};
