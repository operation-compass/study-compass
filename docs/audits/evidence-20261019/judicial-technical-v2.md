# Independent technical review: judicial v2

Reviewer: /root/judicial_technical
Checked at: 2026-10-19T06:19:13.419Z

Candidate: SC-SOC-HIS-GAP10-000007 / gap10-judicial-purpose-v2
13-field SHA v2: 7a8c5f2ad4349e7eb8aac90065638749d4b3ab81ba855ad014ecf3079a6d4cd6

Result: HOLD. Risk: MEDIUM. Not READY.

The local selector independently recomputed the exact 13-field SHA and matched it. Grade is 中1, the four choices are distinct and nonempty, and the exact correct answer is among the choices.

Reproduction: current available local adapter throws `Unsupported new question Web unit: 歴史/鎌倉・法` for this candidate. Its history period map and exact chapter topic mapping do not cover 鎌倉・法. Minimal repair requires an explicit 中世 period and 鎌倉 chapter topic while retaining master_topic_name 鎌倉・法. Existing questions must remain deeply equal and in the same order. No candidate, source Sheet, production code or remote data was changed by this reviewer.

Current local aux-ci-fix/live HTML pair has blob 4c5f21a37a039abe8319ee697503e0660b0bf702, which does not match the parent-provided fresh main blob 419d74909bd19737345d7457b55c0baf8d98507c; therefore no live baseline or 630-item preservation claim is made from this stale snapshot. Fresh immutable HTML and adapter paths were requested from the parent.

PENDING: direct fresh-main ID absence and both HTML identity; repaired adapter regression/order preservation; three mode browser behavior at measured 390px, right/wrong scoring, exact history UI export persistence comparison. Parent operator raw evidence was requested; no screenshots or prior reviewer conclusions were used as substitutes.

## Direct remote follow-up

Checked at: 2026-10-19T06:20:18.802Z

Read the GitHub connector response directly for operation-compass/study-compass, ref 6b417240, scripts/adapt-drive-to-web.cjs. Returned Git blob: ed722173faf729001ae88df02783b31c121c56fb. Unlike the older local adapter, this remote version also handles 平安・荘園. It still has no 鎌倉・法 entry in the periods object and only special-cases 鎌倉・統治 and 平安・荘園 for the exact Web topic. Therefore the fixed candidate is rejected by the remote source period assertion as well. This direct source inspection corroborates the earlier local error, without treating the stale local file as current main.

Result remains HOLD / MEDIUM; no new UI or PASS claim. Full fresh HTML identity, absence, 630-question preservation and UI remain PENDING. No source or external data was changed.
