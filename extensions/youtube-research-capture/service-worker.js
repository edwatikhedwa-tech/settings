const captureEndpoint = "http://127.0.0.1:8765/captures";
const receiverBase = "http://127.0.0.1:8765";
const activeTabKey = "youtube-research-active-tab";

async function request(path, options) {
  const response = await fetch(`${receiverBase}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Локальный приёмник отклонил данные.");
  return payload;
}

async function runNextJob() {
  const stored = await chrome.storage.local.get(activeTabKey);
  if (stored[activeTabKey]) return;
  const next = await request("/jobs/next");
  if (!next.jobId) return;
  const tab = await chrome.tabs.create({ url: next.videoUrl, active: false });
  await chrome.storage.local.set({ [activeTabKey]: { ...next, tabId: tab.id } });
}

async function finishJob(kind, tabId, payload) {
  const stored = await chrome.storage.local.get(activeTabKey);
  const active = stored[activeTabKey];
  if (!active || active.tabId !== tabId) return;
  const path = `/jobs/${encodeURIComponent(active.jobId)}/${kind}`;
  await request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  await chrome.storage.local.remove(activeTabKey);
  await chrome.tabs.remove(tabId).catch(() => undefined);
  await runNextJob();
}

chrome.alarms.create("youtube-research-poll", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(() => runNextJob().catch(() => undefined));
chrome.runtime.onStartup.addListener(() => runNextJob().catch(() => undefined));
chrome.runtime.onInstalled.addListener(() => runNextJob().catch(() => undefined));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "youtube-summary-page-ready") {
    chrome.storage.local.get(activeTabKey).then((stored) => {
      const active = stored[activeTabKey];
      if (active && _sender.tab?.id === active.tabId) chrome.tabs.sendMessage(active.tabId, { type: "extract-youtube-summary", jobId: active.jobId });
    });
    return undefined;
  }
  if (message?.type === "youtube-summary-auto-result") {
    const tabId = _sender.tab?.id;
    if (!tabId) return undefined;
    const promise = message.capture
      ? finishJob("complete", tabId, { capture: message.capture })
      : finishJob("failed", tabId, { videoUrl: message.videoUrl, reason: message.reason });
    promise.then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type !== "store-youtube-capture") return undefined;
  fetch(captureEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(message.payload) })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Локальный приёмник отклонил данные.");
      return payload;
    })
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true;
});

runNextJob().catch(() => undefined);
