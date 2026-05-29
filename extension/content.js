"use strict";

/**
 * Consent Toggle — content engine.
 *
 * Exposes:
 *   window.__consentToggleApply(target, options)  — set every relevant control to target state
 *   window.__consentToggleToast(text)             — show a small toast in the page
 *
 * Idempotency contract:
 *   - target === 'off': every matched control ends up off. Already-off controls do NOT flip on.
 *   - target === 'on':  every matched control ends up on.  Already-on  controls do NOT flip off.
 *   - We NEVER do "click each control" or XOR-style toggling.
 */
(function () {
  if (window.__consentToggleInstalled) return;
  window.__consentToggleInstalled = true;

  const OFF_TOKENS = [
    "0", "off", "false", "no", "n", "reject", "rejected", "deny", "denied",
    "refuse", "refused", "decline", "declined", "disable", "disabled",
    "opt-out", "optout", "opt_out", "block", "blocked",
  ];
  const ON_TOKENS = [
    "1", "on", "true", "yes", "y", "accept", "accepted", "allow", "allowed",
    "enable", "enabled", "opt-in", "optin", "opt_in", "consent", "agree",
  ];

  const FALLBACK_CMP_ROOTS = [
    "#onetrust-pc-sdk",
    "#onetrust-banner-sdk",
    "#onetrust-consent-sdk",
    ".ot-pc-sdk",
    "#CybotCookiebotDialog",
    "[id^='Cybot']",
    "#usercentrics-root",
    "[data-testid='uc-default-banner']",
    "#didomi-host",
    ".didomi-popup-container",
    ".qc-cmp2-container",
    "#qc-cmp2-container",
    "#truste-consent-content",
    ".trustarc-banner-container",
    "[id*='consent' i]",
    "[id*='cookie' i][role='dialog']",
    "[class*='consent' i][role='dialog']",
  ];

  window.__consentToggleApply = async function (target, options) {
    const opts = options || {};
    const result = doPass(target, opts);

    const total =
      result.checkboxes + result.switches + result.radioGroups;
    if (total === 0) {
      await delay(600);
      const second = doPass(target, opts);
      if (
        second.checkboxes + second.switches + second.radioGroups >
        0
      ) {
        return second;
      }
    }
    return result;
  };

  window.__consentToggleToast = function (text) {
    showToast(String(text || ""));
  };

  function doPass(target, opts) {
    const targetOn = target === "on";
    const dialogOnly = opts.dialogOnly !== false;
    const rules = matchRules(location.hostname);
    const roots = computeRoots({ rules, dialogOnly });

    const stats = {
      checkboxes: 0,
      switches: 0,
      radioGroups: 0,
      radioGroupsAmbiguous: 0,
      rootsScanned: roots.length,
    };

    const seenCheckboxes = new Set();
    const seenSwitches = new Set();
    const seenRadios = new Set();

    for (const root of roots) {
      const found = collectControls(root, rules);
      for (const cb of found.checkboxes) {
        if (seenCheckboxes.has(cb)) continue;
        seenCheckboxes.add(cb);
        if (setCheckbox(cb, targetOn)) stats.checkboxes++;
      }
      for (const sw of found.switches) {
        if (seenSwitches.has(sw)) continue;
        seenSwitches.add(sw);
        if (setSwitch(sw, targetOn)) stats.switches++;
      }
      for (const r of found.radios) seenRadios.add(r);
    }

    const groups = groupRadios(Array.from(seenRadios));
    for (const group of groups) {
      const outcome = setRadioGroup(group, targetOn, rules);
      if (outcome === "set") stats.radioGroups++;
      else if (outcome === "ambiguous") stats.radioGroupsAmbiguous++;
    }

    return stats;
  }

  function matchRules(hostname) {
    const all =
      (window.__consentToggleRules && window.__consentToggleRules.rules) ||
      [];
    const host = String(hostname || "").toLowerCase();
    const matched = [];
    for (const r of all) {
      if (!r || !r.match) continue;
      if (r.match instanceof RegExp) {
        if (r.match.test(host)) matched.push(r);
      } else if (typeof r.match === "string") {
        if (host.includes(r.match.toLowerCase())) matched.push(r);
      }
    }
    return matched;
  }

  function computeRoots({ rules, dialogOnly }) {
    const roots = new Set();

    for (const r of rules) {
      for (const sel of r.rootSelectors || []) {
        safeQueryAll(document, sel).forEach((el) => {
          if (isVisible(el)) roots.add(el);
        });
      }
      for (const sel of r.shadowHosts || []) {
        safeQueryAll(document, sel).forEach((el) => {
          if (el.shadowRoot) roots.add(el.shadowRoot);
        });
      }
    }

    if (dialogOnly) {
      const dialogs = safeQueryAll(
        document,
        '[role="dialog"], [aria-modal="true"], dialog[open]',
      );
      for (const el of dialogs) {
        if (isVisible(el)) roots.add(el);
      }
      for (const sel of FALLBACK_CMP_ROOTS) {
        safeQueryAll(document, sel).forEach((el) => {
          if (isVisible(el)) roots.add(el);
        });
      }
      if (roots.size === 0) {
        return [];
      }
    } else {
      roots.add(document);
    }

    return Array.from(roots);
  }

  function safeQueryAll(root, selector) {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.nodeType === 9 || el.nodeType === 11) return true;
    if (!el.getBoundingClientRect) return true;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const doc = el.ownerDocument;
    const win = doc && doc.defaultView;
    if (win) {
      const cs = win.getComputedStyle(el);
      if (
        cs &&
        (cs.display === "none" ||
          cs.visibility === "hidden" ||
          cs.opacity === "0")
      ) {
        return false;
      }
    }
    return true;
  }

  function collectControls(root, rules) {
    const checkboxes = new Set();
    const switches = new Set();
    const radios = new Set();

    walk(root);

    for (const cb of Array.from(checkboxes)) {
      const role = cb.getAttribute && cb.getAttribute("role");
      if (role === "switch") {
        switches.add(cb);
        checkboxes.delete(cb);
      }
    }

    return {
      checkboxes: Array.from(checkboxes),
      switches: Array.from(switches),
      radios: Array.from(radios),
    };

    function walk(node) {
      if (!node) return;
      if (!node.querySelectorAll) return;

      safeQueryAll(node, 'input[type="checkbox"]').forEach((el) =>
        checkboxes.add(el),
      );
      safeQueryAll(node, 'input[type="radio"]').forEach((el) =>
        radios.add(el),
      );
      safeQueryAll(node, '[role="switch"]').forEach((el) => switches.add(el));
      safeQueryAll(node, '[role="checkbox"][aria-checked]').forEach((el) => {
        if (el.tagName !== "INPUT") switches.add(el);
        else checkboxes.add(el);
      });

      for (const r of rules) {
        if (r.checkboxSelector) {
          safeQueryAll(node, r.checkboxSelector).forEach((el) =>
            checkboxes.add(el),
          );
        }
        if (r.switchSelector) {
          safeQueryAll(node, r.switchSelector).forEach((el) =>
            switches.add(el),
          );
        }
      }

      const descendants = safeQueryAll(node, "*");
      for (const el of descendants) {
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    }
  }

  function setNativeChecked(input, value) {
    try {
      const desc = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "checked",
      );
      if (desc && desc.set) {
        desc.set.call(input, value);
        return;
      }
    } catch {}
    input.checked = value;
  }

  function fireInputChange(el) {
    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } catch {}
    try {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  }

  function isInteractable(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute && el.getAttribute("aria-disabled") === "true")
      return false;
    return true;
  }

  function setCheckbox(input, targetOn) {
    if (!isInteractable(input)) return false;
    if (input.checked === targetOn) return true;

    setNativeChecked(input, targetOn);
    fireInputChange(input);

    if (input.checked !== targetOn) {
      const label = findLabelFor(input);
      if (label) {
        try {
          label.click();
        } catch {}
      }
    }
    return input.checked === targetOn;
  }

  function setSwitch(el, targetOn) {
    if (!isInteractable(el)) return false;
    if (el.tagName === "INPUT") return setCheckbox(el, targetOn);

    const aria =
      el.getAttribute("aria-checked") || el.getAttribute("aria-pressed");
    const currentlyOn = aria === "true";
    if (currentlyOn === targetOn) return true;

    try {
      el.click();
    } catch {
      return false;
    }
    return true;
  }

  function findLabelFor(input) {
    if (!input) return null;
    const doc = input.ownerDocument || document;
    if (input.id) {
      try {
        const lbl = doc.querySelector(
          `label[for="${CSS.escape(input.id)}"]`,
        );
        if (lbl) return lbl;
      } catch {}
    }
    return input.closest ? input.closest("label") : null;
  }

  function groupRadios(radios) {
    const map = new Map();
    for (const r of radios) {
      const name = r.name || "";
      const scope = r.form || r.ownerDocument || document;
      const key = name
        ? `${scopeId(scope)}::${name}`
        : `__noname::${anonId(r)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return Array.from(map.values());
  }

  function scopeId(scope) {
    if (!scope) return "0";
    if (scope === document) return "doc";
    return scope.id || scope.name || scope.tagName || "?";
  }

  let _anon = 0;
  const _anonMap = new WeakMap();
  function anonId(el) {
    let id = _anonMap.get(el);
    if (!id) {
      id = "a" + ++_anon;
      _anonMap.set(el, id);
    }
    return id;
  }

  function classifyRadio(radio) {
    const valTok = String(radio.value || "")
      .toLowerCase()
      .trim();
    const idTok = String(radio.id || "").toLowerCase();

    let text = "";
    const lbl = findLabelFor(radio);
    if (lbl) text += " " + (lbl.textContent || "");
    const aria = radio.getAttribute("aria-label");
    if (aria) text += " " + aria;
    text = text.toLowerCase();

    let off = 0;
    let on = 0;

    for (const t of OFF_TOKENS) {
      if (valTok === t) off += 5;
      if (idTok.includes(t)) off += 1;
      if (wordContains(text, t)) off += 1;
    }
    for (const t of ON_TOKENS) {
      if (valTok === t) on += 5;
      if (idTok.includes(t)) on += 1;
      if (wordContains(text, t)) on += 1;
    }

    if (off > on && off > 0) return "off";
    if (on > off && on > 0) return "on";
    return "unknown";
  }

  function wordContains(haystack, needle) {
    if (!haystack || !needle) return false;
    const re = new RegExp(
      "(^|[^a-z0-9])" +
        needle.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") +
        "($|[^a-z0-9])",
      "i",
    );
    return re.test(haystack);
  }

  function setRadioGroup(group, targetOn, rules) {
    const wantToken = targetOn ? "on" : "off";

    for (const rule of rules) {
      if (!rule.radio) continue;
      const sel = targetOn ? rule.radio.on : rule.radio.off;
      if (!sel) continue;
      for (const radio of group) {
        const container = rule.radioGroupSelector
          ? radio.closest(rule.radioGroupSelector)
          : radio.parentElement;
        if (!container) continue;
        const target = container.querySelector(sel);
        if (target && target.tagName === "INPUT" && target.type === "radio") {
          if (!isInteractable(target)) continue;
          return selectRadio(target, rule.useClick) ? "set" : "ambiguous";
        }
      }
    }

    let pick = null;
    for (const r of group) {
      if (classifyRadio(r) === wantToken && isInteractable(r)) {
        pick = r;
        break;
      }
    }

    if (!pick && group.length === 2) {
      const otherToken = targetOn ? "off" : "on";
      const tags = group.map(classifyRadio);
      const otherIdx = tags.indexOf(otherToken);
      const unknownIdx = tags.indexOf("unknown");
      if (otherIdx !== -1 && unknownIdx !== -1 && otherIdx !== unknownIdx) {
        if (isInteractable(group[unknownIdx])) pick = group[unknownIdx];
      }
    }

    if (!pick) {
      const already = group.find((r) => r.checked);
      if (already && classifyRadio(already) === wantToken) return "set";
      return "ambiguous";
    }

    if (pick.checked) return "set";
    return selectRadio(pick, false) ? "set" : "ambiguous";
  }

  function selectRadio(radio, preferClick) {
    if (radio.checked) return true;

    if (!preferClick) {
      setNativeChecked(radio, true);
      fireInputChange(radio);
      if (radio.checked) return true;
    }

    const label = findLabelFor(radio);
    try {
      (label || radio).click();
    } catch {
      return false;
    }
    return radio.checked === true;
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function showToast(text) {
    const id = "__consent_toggle_toast__";
    let host = document.getElementById(id);
    if (!host) {
      host = document.createElement("div");
      host.id = id;
      Object.assign(host.style, {
        position: "fixed",
        bottom: "16px",
        right: "16px",
        maxWidth: "320px",
        padding: "10px 12px",
        background: "rgba(32, 33, 36, 0.95)",
        color: "#fff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12px",
        lineHeight: "1.4",
        borderRadius: "6px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        zIndex: "2147483647",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
      });
      (document.body || document.documentElement).appendChild(host);
    }
    host.textContent = text;
    clearTimeout(host.__hideTimer);
    host.__hideTimer = setTimeout(() => {
      try {
        host.remove();
      } catch {}
    }, 4000);
  }
})();
