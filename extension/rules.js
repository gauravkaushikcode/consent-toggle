"use strict";

/**
 * Per-site / per-CMP rules.
 *
 * Each rule entry can specify:
 *   match:           string | RegExp  — tested against location.hostname (case-insensitive substring)
 *                                       or full match if RegExp.
 *   rootSelectors:   string[]         — query selectors for the dialog/modal root(s) to scope scanning to.
 *   shadowHosts:     string[]         — selectors whose .shadowRoot we should treat as additional roots.
 *   checkboxSelector:string           — extra selector for checkbox-like controls inside the root.
 *   switchSelector:  string           — extra selector for ARIA / custom switch controls inside the root.
 *   radio:           { off: string, on: string }
 *                                     — explicit selector for the "off" / "on" radio inside each vendor row.
 *                                       Recommended for CMPs that use per-vendor radio pairs.
 *   radioGroupSelector: string        — selector for each radio-group container (vendor row). If provided,
 *                                       the off/on selector is queried RELATIVE to each container.
 *   useClick:        boolean          — prefer .click() on target option instead of programmatic .checked.
 *
 * Add to window.__consentToggleRules.rules below. content.js reads window.__consentToggleRules at runtime.
 *
 * How to capture selectors:
 *   1. Open the cookie preferences dialog on the site.
 *   2. Right-click a vendor toggle → Inspect.
 *   3. Note the smallest stable ancestor (rootSelectors), the input pattern, and the
 *      attribute / value / label that distinguishes "off" from "on".
 *   4. Add a rule below, reload the extension (chrome://extensions → Reload), retry.
 */
window.__consentToggleRules = {
  version: 1,
  rules: [
    {
      match: /(^|\.)onetrust(\.com)?$/i,
      rootSelectors: [
        "#onetrust-pc-sdk",
        "#onetrust-consent-sdk",
        ".ot-pc-sdk",
      ],
      switchSelector: ".ot-tgl input[type='checkbox']",
    },
    {
      match: "cookiebot",
      rootSelectors: ["#CybotCookiebotDialog", "[id^='Cybot']"],
    },
    {
      match: "usercentrics",
      rootSelectors: [
        "#usercentrics-root",
        "[data-testid='uc-default-banner']",
      ],
      shadowHosts: ["#usercentrics-root"],
    },
    {
      match: /trustarc|truste/i,
      rootSelectors: ["#truste-consent-content", ".trustarc-banner-container"],
    },
    {
      match: "didomi",
      rootSelectors: ["#didomi-host", ".didomi-popup-container"],
    },
    {
      match: "quantcast",
      rootSelectors: [".qc-cmp2-container", "#qc-cmp2-container"],
    },
  ],
};
