# VIPI v0.1.3 Pre-Registration

## Purpose

This document pre-registers the eligibility, selection, compute, halt, and correction rules for the Volt Inference Price Index (VIPI) v0.1.3 before the inaugural basket is selected and seeded on May 18, 2026 (Day 74). The methodology is already locked in `docs/vipi/VIPI_v0.1.3_methodology.md`; the operational realization is locked in `docs/vipi/VIPI_implementation_plan.md`; the data model is locked in migrations `0001` through `0006` under `packages/workers/vipi-cron/migrations/`. This document adds nothing substantive. It binds the maintainer to the rules as written before the curator-discretion steps run, so that a reader holding this document and the realized May 18 basket can verify the basket against the locked rules.

The model is academic preregistration (the AsPredicted / OSF convention), clinical-trial registration, and the IETF "Security Considerations" pattern. The defense is against ex-post curator drift and the structurally available "you cherry-picked the basket" critique. The maintainer is the same party that selects the basket and computes the index; the only available counter to that conflict is publishing the rules first and then publishing the basket against them.

## Note on public release timing

Cross-references in this document to `docs/vipi/VIPI_v0.1.3_methodology.md`, `docs/vcmi/VCMI_v0.1.3_spec.md`, and the reproducibility appendix will publish to this same repository on May 18, 2026, per VIPI methodology §8.3. Internal implementation artifacts (migration SQL files, internal planning documents) remain private; the public reproducibility appendix is the verification surface for the inaugural basket.

## Anchor and tamper-evidence

This document is committed to `origin/main` at commit `98ab34b8b3b87f49b5b2dd315324688e40e93dc5`. The methodology, plan, and migrations referenced here are at parent commit `c520214daf082c09868b08916d1b7f422770603a` ("Plan §3.6: add confidence_fallback_constituents audit key per §7.2 Step 1"), 2026-04-27.

**Public republication.** This document is anchored to the public git tag `vipi-v0.1.3-pre-registration` in `github.com/newageflyfish-max/volthq-mcp-server`. The tag's commit hash, metadata, and timestamp are publicly verifiable via the GitHub release page and via `git show vipi-v0.1.3-pre-registration` against any clone of the repository. The private commit hashes (98ab34b, c520214d) above are historical record only; public-verification integrity is established by the tag.

Subsequent edits to this pre-registration appear in `git log` against this file. Any change after the May 18, 2026 base date constitutes a methodology change and triggers a v0.1.4 release under methodology §12.3 (lines 396–402): announced 30 calendar days before effective date, 14-day consultation window, full rationale in the methodology changelog, prior versions at permanent URLs.

## What is locked as of commit c520214

### Eligibility

A VCMI is eligible for inclusion in a VIPI sub-index at a monthly rebalancing date if all seven criteria in methodology §5 (lines 100–122) are met at the rebalancing reference date (the last calendar day of the prior month, 16:00 UTC):

1. `status = active` in the VCMI registry.
2. Upstream source URL verified at `high` confidence on upstream author.
3. At least two `provider_mappings` with `confidence ∈ {high, medium}`, of which at least one is `high`. Confidence levels per VCMI v0.1.3 §6 (lines 186–213).
4. Continuous observation for 14 consecutive days ending on the reference date, defined as presence in at least 95% of daily 16:00 UTC close snapshots.
5. Not a reasoning-specialized model (variant string contains `reasoning` or VCMI notes field categorizes as reasoning).
6. Pricing expressed per input and output token (not per-GPU-hour, not subscription, not freemium).
7. Sub-index criteria: VIPI requires only 1–6; VIPI-Open requires the license field match the published open-weight list (Apache-2.0, MIT, Llama-*-Community, Qwen-License, Gemma license, or maintainer-classified open-weight); VIPI-Closed requires the license field match `Proprietary-*` or be otherwise classified proprietary.

Methodology §5 (line 121) preserves a retention-bias clause: a prior constituent that marginally violates one criterion may be retained for one additional cycle if the violation is transient. Discretion is exercised against the published retention criteria in §9.2 (lines 275–278) and disclosed in the rebalancing announcement.

Methodology §5 (line 117) excludes ineligible-license classifications (commercial-use-restricted source-available licenses) from both VIPI-Open and VIPI-Closed but admits them to the headline VIPI. The sub-indices are subsets of, not a partition of, the headline.

Methodology §5 (line 119) excludes models from families not yet in the VCMI controlled vocabulary until the vocabulary is updated.

### Selection

When more than 20 VCMIs qualify for a sub-index, the maintainer selects 20 using the tie-breaker cascade in methodology §6 (lines 124–145):

1. Higher total provider coverage (more `provider_mappings`).
2. Higher count of `confidence = high` mappings.
3. More distinct upstream families represented (diversification).
4. Older `first_added_to_registry` date.
5. Alphabetical VCMI order as final tie-breaker.

All constituents are equally weighted. Each receives weight `1/N` where `N` is the number of constituents in the sub-index after cap application.

### Compute

Daily compute follows methodology §7.2 (lines 167–186), §7.3 (lines 189–191), §8.1 (lines 208–230), and §8.4 (lines 250–258).

Per-constituent close (4 steps):

1. Collect all `provider_mappings` with `confidence = high`. If fewer than two exist, fall back to including `confidence = medium`. The fallback is recorded in the daily audit record per the directive in §7.2 Step 1 (line 171), realized as the `confidence_fallback_constituents` key added to `audit_json` per plan §3.6 at c520214.
2. Collect prices from `offering_prices` where `quality_flag = 'clean'` and `timestamp ∈ [date 15:55:00, date 16:05:00)` UTC.
3. Per-mapping close is the median of input and output prices observed in the window. Single-observation mappings use that observation. Zero-observation mappings are excluded from the day.
4. Per-constituent close is the median across included mappings, computed separately for input and output. Blended price is `(3 × input + output) / 4`.

Outlier exclusion per §7.3 (line 189): any snapshot price exceeding 3× the 7-day trailing median for that mapping, or below 1/3 of that trailing median, is excluded from the median computation and logged in the daily audit record under `outlier_exclusions`. The 3× and 1/3 thresholds are the locked initial values; methodology §7.3 (line 189) commits to review at the first scheduled methodology review.

Index value formula per §8.1 (lines 208–230):

```
VIPI_I(d) = (Σ_{c} w_c × blended_price_{c,d}) / D_I(d)
```

The divisor `D_I` is initialized at the base date so that `VIPI_I(base) = 100`. Between constituent changes the divisor is constant. On every constituent change (scheduled rebalancing per §9.2 or emergency removal per §9.3), the divisor is adjusted per the §8.1 continuity rule:

```
D_I_new = (Σ_{c in new basket} w_c_new × blended_price_{c,t}) / VIPI_I(t)_old
```

Six published value kinds per sub-index per day per §8.4 (lines 250–258): `blended`, `input`, `output`, `best_blended`, `best_input`, `best_output`. The `best_*` variants substitute the cheapest provider per constituent for the median.

### Halt

A sub-index is not published for a trading day under any of the conditions in methodology §7.4 (lines 195–200) or §12.2 (lines 386–390):

- More than 30% of the sub-index's constituents have zero valid observations in the MOC window.
- More than 3 constituents are in outlier-excluded state simultaneously.
- An active integrity investigation concerning data inputs or provider pricing manipulation.
- A material methodology change in transition.
- A force majeure event affecting the Administrator's ability to publish.

Halts are disclosed immediately in the publication channel. A halted day is not backfilled unless the underlying issue is resolved and a defensible reconstructed value can be computed under the audit trail. The 30% and 3-constituent thresholds are locked initial values; methodology §7.4 (line 200) commits to review after 90 days of live publication.

Mid-cycle constituent removal (not addition) is permitted under methodology §9.3 (lines 282–290) only if the constituent's VCMI is retracted, formally deprecated with no continuing provider coverage, or subject to an active integrity concern. On removal the remaining constituents are re-weighted to `1/(N−1)`, the divisor is adjusted per §8.1 to preserve continuity at the removal close, and the vacated slot is filled at the next scheduled rebalancing returning all constituents to `1/N`.

### Corrections

The correction protocol per methodology §12.1 (lines 369–382) applies whenever a published value is later found to depend on a corrupted snapshot, a misclassified VCMI, or a calculation error:

1. Announced within 1 business day of error confirmation.
2. Prior published value and corrected value both disclosed with reason.
3. Recorded in the daily audit record and the VIPI changelog.
4. Historical time series on `volthq.dev/vipi` reflect the corrected value; prior values preserved in the changelog and in the `vipi_corrections` table for audit.

### Storage shapes

The DDL for every persistent table is locked at c520214 in plan §3.3 (lines 122–137), §3.4 (lines 144–156), §3.5 (lines 161–180), and §3.6 (lines 182–218 inclusive of the c520214 amendment). The migration files are the canonical artifact:

- `packages/workers/vipi-cron/migrations/0003_create_vipi_basket.sql`
- `packages/workers/vipi-cron/migrations/0004_create_vipi_daily.sql`
- `packages/workers/vipi-cron/migrations/0005_create_vipi_corrections.sql`
- `packages/workers/vipi-cron/migrations/0006_create_vipi_audit_records.sql`

## Curator-discretion zones (NOT locked; principle commitments)

The following decision points cannot be reduced to algorithm at v0.1.3. The maintainer commits to call each by published principle and to record the reasoning in the corresponding migration commit message or daily audit record.

**Inaugural basket constituents.** Plan §7.2 (line 378) explicitly leaves which VCMIs go in the inaugural basket as an operator decision between the c520214 commit and May 17, 2026. Plan §4 (line 234) and plan §8 Session 4 (line 418) confirm that `0009_seed_vipi_basket_inaugural.sql` is hand-written by the operator after running the eligibility query and applying the §6 cap. **Principle:** select against §5 and §6 as written; document each tie-breaker invocation and each retention-bias call in the basket-selection migration commit message.

**Provider-mapping confidence levels.** Plan §4 (line 233) and plan §8 Session 4 (line 414) make explicit that mapping confidence is a curator judgment that cannot be derived from the spec alone. **Principle:** apply the four `high` criteria from VCMI v0.1.3 §6 (lines 190–194) per (provider, VCMI) pair; default to `medium` when the brand suffix is undocumented per VCMI §6 (line 207); default to `high` for pass-through resale per VCMI §6 (lines 211–213). Confidence assignments documented in the `0008` seed migration commit.

**Retention bias at rebalancing.** Methodology §5 (line 121) and §9.2 step 4 (lines 275–278) permit one-cycle retention of a constituent that marginally violates a criterion. **Principle:** exercised only for transient violations (provider API outages, single-day data gaps); not for structural delistings; reason recorded in the rebalancing announcement and the daily audit record.

**Reasoning-model classification.** Methodology §5 criterion 5 (line 108) identifies reasoning models by `variant` containing `reasoning` or by explicit categorization in the VCMI notes field. **Principle:** the variant-string test is mechanical; the notes-field categorization is a curator marking applied where the variant string is ambiguous. The categorization is recorded in the `vcmi_registry.notes` column at the time of registry entry.

**Unrecognized-license classification.** Methodology §5.7 (line 112) and §5 (line 117) leave license classification to the maintainer when the license is not in the published open-weight list and does not match `Proprietary-*`. **Principle:** unrecognized licenses default to ineligible-for-VIPI-Open and ineligible-for-VIPI-Closed (admitted to headline VIPI per §4 lines 95–96) until the maintainer publishes a classification update. Classifications are announced in the VIPI changelog and recorded in `vcmi_registry.license_class`.

**Sustained loss-leader and window-dressing exclusions.** Methodology §7.3 (line 191) permits the Administrator to exclude a mapping when sustained pricing patterns suggest manipulation under §9.3. **Principle:** discretionary; any exclusion announced with rationale in the daily audit record and the VIPI changelog.

## Numeric thresholds locked at v0.1.3 (with review windows)

| Threshold | Value at v0.1.3 | Review trigger | Source |
|---|---|---|---|
| Outlier multiplier (high) | 3× 7-day trailing median | First scheduled methodology review | §7.3 line 189 |
| Outlier multiplier (low) | 1/3 of 7-day trailing median | First scheduled methodology review | §7.3 line 189 |
| Halt: zero-observation constituents | More than 30% of sub-index | After 90 days of live publication | §7.4 line 200 |
| Halt: simultaneous outlier-excluded constituents | More than 3 of any sub-index | After 90 days of live publication | §7.4 line 200 |
| Continuity threshold | 95% of close snapshots over 14 days | No v0.2 case identified | §16 Q7 line 522 |
| Constituent cap | N = 20 per sub-index | Each v0.x release | §16 Q2 line 512 |

Each threshold is a v0.1.3 commitment. Any change to a threshold value is a methodology change under §12.3 with the 30-day pre-announcement and 14-day consultation requirements.

## Implicit-in-code-but-not-in-spec gaps (resolved at c520214)

Three gaps were identified by Day 53 read-only investigation against methodology, plan, and migrations. All three are resolved at c520214; no v0.1.3 amendment is open.

**Gap 26 (trailing-median window for mappings with fewer than 7 days of history).** Resolved by methodology §8.2 (lines 232–238): "the outlier-exclusion rule (Section 7.3) has at least 7 days of trailing-median data from day one of publication." The base date is set with operational headroom on top of the §5 criterion 4 (line 107) 14-day continuity requirement. The launch case is fully covered. Future monthly rebalancings are covered because §5 criterion 4 forces 14 days of continuous observation for any newly-admitted constituent. The residual case (a new mapping added mid-cycle to an existing constituent that is not itself new) is flagged as a v0.2 question, listed below under known omissions.

**Gap 27 (medium-confidence fallback degradation note in audit JSON).** Resolved by plan §3.6 amendment at c520214. When §7.2 Step 1 fallback is triggered for any constituent on a given day, an additional top-level key `confidence_fallback_constituents: [vcmi, ...]` is included in `audit_json`. The amendment is purely additive; no migration is required because `audit_json` is `TEXT NOT NULL` per migration `0006`.

**Gap 28 (`vipi_corrections` multi-correction PK and uniqueness).** Resolved as-is. The append-only design with `id INTEGER PRIMARY KEY AUTOINCREMENT` (migration `0005`) is intentional per plan §5.3 (line 304) and supports correction chains where `prior_value` of correction `N+1` equals `corrected_value` of correction `N` for the same `(date, sub_index, value_kind)`. Chain consistency is an application-layer invariant enforced by the corrections-writing code path, consistent with the FK convention documented in migration `0001` (lines 7–13) and migration `0002` (lines 8–10).

## Known omissions (deferred to later versions)

The following items are out of scope for v0.1.3 and listed here so that a reader of the public methodology can locate every known gap.

**v0.2 priorities.** Methodology §16 open questions Q1 through Q7 (lines 510–522): VIPI-Best promotion, cap growth, usage-weighted variant, pass-through resale handling, tokenizer normalization, rebalancing cadence, continuity threshold. Plus the mid-cycle new-mapping <7-day-history residual from gap 26, and the VCMI v0.1.3 §10 corrections automated workflow per plan §10.

**v0.1.4 deferrals.** Per plan §10: richer audit-record fields, notification and alerting on publication failure or halt trigger, dashboard at `volthq.dev/vipi`.

**v1.0 commitments.** Per plan §10 and methodology §17 (lines 532–554): settlement-grade external audit, Advisory Group of 3–5 external members, IOSCO Statement of Adherence, provider-side manipulation analysis, formal IOSCO adherence across all 19 principles.

**Out of scope for v0.1.3 entirely.** Methodology §15 (lines 487–498) enumerates: reasoning-model-specific index, quality-adjusted hedonic variant, tokenizer normalization, intraday VIPI-Spot, settlement-specific variants, latency-adjusted variants, regional sub-indices, context-window-tier sub-indices, proprietary-cached and proprietary-batch-discount variants, reasoning-token billing within non-reasoning models, detection of silent quantization or serving-tier changes by providers.

## Verification commitment

On May 18, 2026, two migrations are committed to `origin/main`:

- `packages/workers/vipi-cron/migrations/0008_seed_vcmi_provider_mappings_inaugural.sql`
- `packages/workers/vipi-cron/migrations/0009_seed_vipi_basket_inaugural.sql`

The commit messages document each curator decision: provider-mapping confidence assignments per (provider, VCMI) pair; tie-breaker invocations under §6; retention-bias calls under §5 (none expected at inception); license-class assignments for any license string not already in `vcmi_registry`.

A reproducibility appendix is published the same day as a separate document under `docs/vipi/`. The appendix demonstrates that running the eligibility query (the SQL helper written in Session 4 per plan §8 line 416, formerly line 414) against the `vcmi_provider_mappings` rows seeded by `0008` and the `vcmi_registry` rows seeded by `0007`, evaluated as of the rebalancing reference date 2026-04-30 (last day of April), produces the constituent set seeded by `0009`.

Any divergence between the rules locked in this pre-registration and the realized inaugural basket is disclosed as a public correction under methodology §12.1 with `reason_class = metadata_correction`. The pre-registration is the binding contract; the basket follows from it.
