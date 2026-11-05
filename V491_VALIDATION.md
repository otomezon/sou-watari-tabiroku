# v4.9.1 validation

## Source checks
- New fanfare is a mono PCM 16-bit WAV at 32 kHz, approximately 1.58 seconds.
- The level-up cue URL and Service Worker shell both point to level-up-fanfare-v3.wav.
- The fanfare has an ascending major-key melody, a final C-major chord and natural decay.
- Level-up sequencing delay is 1.75 seconds.
- Damage events all use the exact same playDamageEffect() synthesis.
- Repeated damage cues are scheduled 0.24 seconds apart, with no pitch/timbre alternation.
- APP_VERSION, manifest version and cache namespace agree at 4.9.1.
- Save schema remains v11.

## Regression scope
Eight focused tests cover WAV structure and duration, the new asset URL and offline precache, damage cue identity and spacing, level-up sequence timing, version identifiers, and save compatibility.

## Not yet verified on physical devices
- Listener impression of the new fanfare on iOS and Android speakers/headphones.
- Real-device perceived spacing and loudness for two rapid hits.
- Full manual playthrough across all campaigns.
