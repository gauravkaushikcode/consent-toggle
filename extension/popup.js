"use strict";

const $ = (sel) => document.querySelector(sel);

const els = {
  off: $("#btn-off"),
  on: $("#btn-on"),
  dialogOnly: $("#opt-dialog-only"),
  allFrames: $("#opt-all-frames"),
  result: $("#result"),
};

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error("No active tab.");
  if (/^(chrome|edge|about|brave|opera):/i.test(tab.url || "")) {
    throw new Error("Extension can't run on browser-internal pages.");
  }
  return tab;
}

async function apply(target) {
  setBusy(true);
  setResult("Working...", "");
  try {
    const tab = await getActiveTab();
    const allFrames = !!els.allFrames.checked;
    const dialogOnly = !!els.dialogOnly.checked;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames },
      files: ["rules.js", "content.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames },
      func: (target, options) => {
        if (typeof window.__consentToggleApply !== "function") {
          return { error: "engine not loaded" };
        }
        try {
          return window.__consentToggleApply(target, options);
        } catch (e) {
          return { error: String(e && e.message ? e.message : e) };
        }
      },
      args: [target, { dialogOnly }],
    });

    const totals = aggregate(results);
    renderResult(totals, target);
  } catch (e) {
    setResult(`Error: ${e.message || e}`, "err");
  } finally {
    setBusy(false);
  }
}

function aggregate(injectionResults) {
  const totals = {
    framesTouched: 0,
    framesWithMatches: 0,
    checkboxes: 0,
    switches: 0,
    radioGroups: 0,
    radioGroupsAmbiguous: 0,
    errors: [],
  };
  for (const r of injectionResults || []) {
    const v = r && r.result;
    if (!v) continue;
    totals.framesTouched++;
    if (v.error) {
      totals.errors.push(v.error);
      continue;
    }
    const hits =
      (v.checkboxes || 0) + (v.switches || 0) + (v.radioGroups || 0);
    if (hits > 0) totals.framesWithMatches++;
    totals.checkboxes += v.checkboxes || 0;
    totals.switches += v.switches || 0;
    totals.radioGroups += v.radioGroups || 0;
    totals.radioGroupsAmbiguous += v.radioGroupsAmbiguous || 0;
  }
  return totals;
}

function renderResult(t, target) {
  const word = target === "on" ? "ON" : "OFF";
  const total = t.checkboxes + t.switches + t.radioGroups;
  if (total === 0) {
    const msg = [
      `No controls changed (target: ${word}).`,
      `Frames scanned: ${t.framesTouched}.`,
      `Tip: open the site's preferences dialog first, then click again.`,
    ].join("\n");
    setResult(msg, "warn");
    return;
  }
  const lines = [
    `Set ${total} control${total === 1 ? "" : "s"} to ${word}.`,
    `  ${t.checkboxes} checkbox${t.checkboxes === 1 ? "" : "es"}, ${t.switches} aria switch${t.switches === 1 ? "" : "es"}, ${t.radioGroups} radio group${t.radioGroups === 1 ? "" : "s"}.`,
    `Frames matched: ${t.framesWithMatches} / ${t.framesTouched}.`,
  ];
  if (t.radioGroupsAmbiguous > 0) {
    lines.push(
      `Skipped ${t.radioGroupsAmbiguous} radio group${t.radioGroupsAmbiguous === 1 ? "" : "s"} (couldn't tell which option means ${word}). Add a site rule.`,
    );
  }
  if (t.errors.length) {
    lines.push(`Errors: ${t.errors.slice(0, 3).join("; ")}`);
  }
  setResult(lines.join("\n"), t.radioGroupsAmbiguous > 0 ? "warn" : "ok");
}

function setResult(text, cls) {
  els.result.textContent = text;
  els.result.className = "result" + (cls ? " " + cls : "");
}

function setBusy(busy) {
  els.off.disabled = busy;
  els.on.disabled = busy;
}

els.off.addEventListener("click", () => apply("off"));
els.on.addEventListener("click", () => apply("on"));
