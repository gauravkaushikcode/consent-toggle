"use strict";

chrome.commands.onCommand.addListener(async (command) => {
  const target =
    command === "set-all-off" ? "off" : command === "set-all-on" ? "on" : null;
  if (!target) return;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab || !tab.id) return;
  if (/^(chrome|edge|about|brave|opera):/i.test(tab.url || "")) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["rules.js", "content.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (target) => {
        if (typeof window.__consentToggleApply !== "function") {
          return { error: "engine not loaded" };
        }
        try {
          return window.__consentToggleApply(target, { dialogOnly: true });
        } catch (e) {
          return { error: String((e && e.message) || e) };
        }
      },
      args: [target],
    });

    let total = 0;
    let ambiguous = 0;
    for (const r of results || []) {
      const v = r && r.result;
      if (!v || v.error) continue;
      total +=
        (v.checkboxes || 0) + (v.switches || 0) + (v.radioGroups || 0);
      ambiguous += v.radioGroupsAmbiguous || 0;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        if (typeof window.__consentToggleToast === "function") {
          window.__consentToggleToast(text);
        }
      },
      args: [
        `Consent Toggle: set ${total} control${total === 1 ? "" : "s"} (target: ${target.toUpperCase()})` +
          (ambiguous
            ? ` — ${ambiguous} ambiguous radio group${ambiguous === 1 ? "" : "s"} skipped`
            : ""),
      ],
    });
  } catch (e) {
    console.warn("[Consent Toggle] keyboard shortcut failed:", e);
  }
});
