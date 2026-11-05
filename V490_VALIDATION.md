# v4.9.0 validation

## Source checks
- All 60 catalogued monster kinds have a silhouette mapping.
- Sprite family variety and special visual accents are present.
- Existing health, level, rare-speed, boss, and shopkeeper drawing paths remain in place.
- Both explanatory rows and caption styling are absent.
- Attack and received-damage synthesis paths are distinct.
- Damage cue interval is 0.27 seconds; alternating hit pitch is applied.
- New fanfare is a valid 16-bit PCM WAV and is present in the Service Worker shell.
- APP_VERSION, manifest version, and cache namespace are all 4.9.0.
- Save schema remains 11.

## Regression scope
The v4.9.0 test suite adds 12 focused checks for sprite coverage, visual diversity, UI cleanup, attack and damage cue routing, fast-hit separation, fanfare format/offline precache, version consistency, and save compatibility.

## Not yet verified on physical devices
- Actual audio perception and speaker/headphone mix on iOS and Android.
- Visual readability at different screen sizes and device pixel ratios.
- Full manual playthrough across all five campaigns.
