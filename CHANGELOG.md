# Changelog

All notable changes to **Consent Toggle** will be documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-05-29

### Added

- Initial public release.
- Manifest V3 Chromium extension with toolbar popup providing **"Set all OFF"**
  and **"Set all ON"** actions, plus configurable keyboard shortcuts
  (`Alt+Shift+O` / `Alt+Shift+I`).
- Idempotent target-state engine: assigning the requested end state to every
  matched control. Already-off controls stay off; no XOR-style toggling.
- Support for HTML `<input type="checkbox">`, ARIA `[role="switch"]` /
  `[role="checkbox"]` widgets, and HTML radio groups.
- Radio-group classifier with off / on token scoring over `value`, `id`,
  associated `<label>`, and `aria-label`. Ambiguous groups are skipped and
  reported (never blindly flipped).
- Recursive open Shadow DOM traversal.
- Per-frame execution via `chrome.scripting.executeScript({ allFrames: true })`
  with aggregated per-frame stats in the popup.
- Visible-dialog scoping with fallback CMP root selectors for OneTrust,
  Cookiebot, Usercentrics, Didomi, Quantcast, and TrustArc.
- Per-site / per-CMP rule support in [`extension/rules.js`](extension/rules.js).
- One-shot retry after 600 ms if the first pass finds zero controls (covers
  dialogs that render slightly after invocation).
- React-friendly state assignment via the native `HTMLInputElement.checked`
  setter plus `input` / `change` event dispatch, with label-click fallback.
- Background service worker mirroring popup behavior for keyboard shortcuts
  and showing an in-page toast with the result.
- Privacy policy ([`PRIVACY.md`](PRIVACY.md) and `docs/index.md` for GitHub
  Pages publishing).
- MIT License.

### Permissions

- `activeTab` and `scripting` only. **No** `host_permissions`. The extension
  never runs automatically on page load; it only acts on user gesture.

[Unreleased]: https://github.com/gauravkaushikcode/consent-toggle/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gauravkaushikcode/consent-toggle/releases/tag/v1.0.0
