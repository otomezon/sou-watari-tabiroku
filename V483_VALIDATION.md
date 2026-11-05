# v4.8.3 Validation

## Automated checks

- Enemy-level calculation and render regression tests: 10/10 PASS.
- Module syntax checks: PASS.
- Release version / manifest / Service Worker cache consistency: covered by regression tests.
- Legacy save compatibility: no save fields or schema migration introduced; existing monster combat stats are used at render time.

## Not completed

- Physical iOS and Android device QA.
- Manual playthrough across all five campaigns.
- Long-session visual review on low-resolution screens.

The feature only derives and paints a label. It does not modify monster stats, combat, AI, turn timing, loot, EXP, or persisted save data.
