# 層渡りの旅録 v4.8.1 — 起動修正

Patch release for a startup-blocking module export mismatch in the v4.8.0 GitHub source.

- Export `DIRECTION_DELTA` from `assets/dungeon.js`; both `assets/main.js` and `assets/engine.js` import this named binding.
- Without the export, browser ES module linking fails before the app initializes, leaving the game screen unresponsive.
- Bump the application version and Service Worker cache name to v4.8.1 so clients fetch the corrected module.
- No gameplay balance or save-data changes. Save schema remains v11.

## Verification
- Named export exists and both importing modules reference it.
- Node regression suite: 115/115 pass.
- Browser startup and movement smoke test included in the v4.8.1 package.
