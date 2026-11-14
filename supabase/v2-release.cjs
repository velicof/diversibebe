// Single source of truth for the V2 database release, in application order.
// Every environment (PGlite tests, native local runtime, staging, production) applies exactly this list
// on top of the production baseline (tests/fixtures/current-schema.sql). 001-003 are legacy files that were
// never applied in production and are NOT part of the release.
const BASELINE = [
  '20261027055351_protect_family_data.sql',
  '20261027055353_bebeasist_quota.sql',
  '20261027133719_v2_persistence_and_events.sql',
];
const INCREMENTAL = [
  '20261031201425_real_auth_journey.sql',
  '20261031201937_real_auth_journey_legacy_compat.sql',
  '20261102100000_v2_planner_events.sql',
  '20261103100000_v2_legacy_history.sql',
  '20261104100000_v2_shopping_event.sql',
  '20261111100000_v2_allergy_filtering.sql',
  '20261113100000_v2_flexible_planner.sql',
];
module.exports = { BASELINE, INCREMENTAL, RELEASE: [...BASELINE, ...INCREMENTAL] };
