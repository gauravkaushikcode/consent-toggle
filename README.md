# Consent Toggle

A small Chromium (Manifest V3) browser extension that sets **every vendor toggle** inside a cookie / consent preferences dialog to **OFF** (or **ON**) in a single click — without breaking the controls that are already in the right state.

## Why this exists

When a site shows a "Preferences" dialog with **dozens or hundreds of vendor toggles**, clicking each one is tedious. A naive "toggle all" button has a known bug: vendors that are already OFF get **flipped back ON**, undoing your intent.

This extension uses **idempotent target-state** semantics:

- `Set all OFF` → every relevant control ends up off. Already-off controls do nothing.
- `Set all ON`  → every relevant control ends up on.  Already-on  controls do nothing.

No XOR-style flipping, no blind clicks.

## What it handles

- HTML `<input type="checkbox">` (programmatic `checked` + `input` / `change` events, with label-click fallback for React-based UIs).
- ARIA `[role="switch"]` and `[role="checkbox"]` custom widgets (click only when the current `aria-checked` differs from the target).
- HTML `<input type="radio">` groups — picks the radio whose `value` / `id` / label means "off" (or "on") via tokens like `reject`, `deny`, `0`, `false`, `disable`, etc. Never tries to "uncheck all".
- Open **Shadow DOM** (recursively walks `element.shadowRoot`).
- **Iframes** — runs in every frame of the active tab (toggleable in the popup).
- Visible modal / dialog scoping by default: `[role="dialog"]`, `[aria-modal="true"]`, `<dialog open>`, plus common CMP root selectors (OneTrust, Cookiebot, Usercentrics, Didomi, Quantcast, TrustArc, etc.).

## What it can't handle (yet)

- **Closed shadow roots** — no JS can pierce them.
- **Cross-origin iframes** the browser refuses to inject into.
- **Per-vendor radio pairs** on sites where neither `value`, `id`, nor label text contains a recognizable "off" / "on" token. For these, add a site rule (see below).
- The extension does **not** click "Save" / "Confirm choices" — that's intentional, so you can review before submitting.

## Install (unpacked)

1. Clone or download this folder.
2. In Chrome / Edge / Brave, open `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the `extension/` folder inside this repo.
5. Pin the **Consent Toggle** icon to your toolbar.

## Use

1. On a site, open the cookie / vendor **preferences** dialog (not the simple banner — the dialog with per-vendor toggles).
2. Click the extension icon.
3. Click **Set all OFF** or **Set all ON**.
4. Review what changed in the popup ("Set 47 controls to OFF. 0 ambiguous radio groups skipped.").
5. **Manually click the site's Save / Confirm button.**

Keyboard shortcuts (configurable at `chrome://extensions/shortcuts`):

- `Alt + Shift + O` — Set all OFF
- `Alt + Shift + I` — Set all ON

When you use a shortcut, results appear as a small toast in the bottom-right of the page (the popup is not open).

## Permissions

| Permission   | Why |
|--------------|-----|
| `activeTab`  | Run only on the tab you're looking at, only after you click the icon or press the shortcut. No background scanning. |
| `scripting`  | Inject the engine into the active tab on demand. |

There are **no `host_permissions`** and the extension does **not** auto-run on page load. The "read and change data" warning Chrome shows applies only at the moment you trigger the extension on a tab.

## Adding a site rule

If a site's per-vendor toggles don't get caught (especially per-vendor **radio pairs** like "Allow / Deny"), you can teach the extension by editing [`extension/rules.js`](extension/rules.js).

Capture selectors from DevTools:

1. Open the site's preferences dialog.
2. Right-click one vendor's **off / reject** radio (or its container row) → **Inspect**.
3. Find:
   - **`rootSelectors`** — the smallest stable ancestor that wraps the whole dialog (e.g. `#cmp-modal`, `.preference-center`).
   - For radios:
     - **`radioGroupSelector`** — the repeating "vendor row" container (e.g. `.vendor-row`, `li.purpose-item`).
     - **`radio.off` / `radio.on`** — selectors **relative to that row** that match exactly the OFF / ON radio (e.g. `input[value='0']`, `input[data-allow='false']`).

Example:

```js
{
  match: "example-news.com",
  rootSelectors: ["#cmp-preferences"],
  radioGroupSelector: ".vendor-row",
  radio: {
    off: "input[value='0']",
    on:  "input[value='1']",
  },
}
```

Add the object to `window.__consentToggleRules.rules` in `rules.js`, then reload the extension on `chrome://extensions` (Reload button on the extension card) and retry.

The `match` field accepts a substring (case-insensitive) or a `RegExp`.

## How it picks the right radio

Per radio in a group, the engine scores text from `value`, `id`, the associated `<label>`, and `aria-label`:

- Words like `0`, `off`, `false`, `no`, `reject`, `deny`, `disable`, `opt-out`, `block` → counts toward **off**.
- Words like `1`, `on`, `true`, `yes`, `accept`, `allow`, `enable`, `opt-in`, `consent`, `agree` → counts toward **on**.
- Value matches weigh 5x; id / label matches weigh 1x.
- Exactly-two-radio groups: if one is clearly the opposite, the other is inferred.
- If neither side wins, the group is **skipped** and reported as **ambiguous** (the popup tells you the count). Add a site rule to fix it — the engine refuses to guess in this case rather than risk flipping the wrong option.

## Firefox

This is an MV3 extension. Firefox supports MV3 with [some differences](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Differences_between_API_implementations). The same code should run after you swap `chrome.*` calls for the `browser.*` polyfill (or rely on Firefox's `chrome` alias), and possibly drop the `minimum_chrome_version` field. Not packaged for Firefox out of the box.

## Icons

No icons ship with this extension; Chrome shows a default puzzle-piece. To brand it, drop `icon-16.png`, `icon-48.png`, `icon-128.png` into `extension/icons/` and add to `manifest.json`:

```json
"icons": {
  "16": "icons/icon-16.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png"
},
"action": {
  "default_icon": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png"
  },
  "default_title": "Consent Toggle",
  "default_popup": "popup.html"
}
```

## Project layout

```
extension/
  manifest.json     MV3 manifest, action + commands + service worker
  popup.html        Toolbar popup UI
  popup.css
  popup.js          Runs scripting.executeScript on the active tab, aggregates per-frame results
  background.js     Keyboard-shortcut handler, mirrors popup behavior
  content.js        The engine: idempotent set-target-state over checkboxes / switches / radio groups, with Shadow DOM walk
  rules.js          Optional per-site / per-CMP rules (loaded as a content script alongside content.js)
  icons/            (optional) toolbar icons
README.md           This file
```

## Caveats and responsibility

- Consent UIs vary wildly. The generic engine covers many CMPs; tricky ones may need a site rule.
- The extension never clicks "Save". You remain responsible for the consent state actually submitted on each site.

## Packaging for the Chrome Web Store

```bash
bash scripts/package.sh
```

Reads `version` from `extension/manifest.json` and produces
`dist/consent-toggle-vX.Y.Z.zip` — upload that file in the
[Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole/).

## Privacy

Consent Toggle collects nothing — see [`PRIVACY.md`](PRIVACY.md). The same
policy is published at
<https://gauravkaushikcode.github.io/consent-toggle/> once GitHub Pages is
enabled on the `docs/` folder; that URL goes into the Web Store privacy form.

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).

## License

[MIT](LICENSE) © Gaurav Kaushik
