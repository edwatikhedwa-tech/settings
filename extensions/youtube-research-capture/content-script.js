function textOf(element) {
  return element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function currentVideoId() {
  return new URL(location.href).searchParams.get("v") ?? "";
}

function visibleTranscriptSegments() {
  const elements = [...document.querySelectorAll("ytd-transcript-segment-renderer")];
  const seen = new Set();
  return elements.map((element) => ({
    timestamp: textOf(element.querySelector(".segment-timestamp, #start-offset")),
    text: textOf(element.querySelector(".segment-text, yt-formatted-string")),
  })).filter((segment) => {
    const key = `${segment.timestamp}|${segment.text}`;
    if (!segment.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function visibleDescription() {
  for (const selector of ["ytd-watch-metadata #description-inline-expander", "#description ytd-text-inline-expander", "#description-inline-expander"]) {
    const value = textOf(document.querySelector(selector));
    if (value) return value;
  }
  return "";
}

function basePayload() {
  return {
    capturedAt: new Date().toISOString(),
    videoUrl: location.href,
    videoId: currentVideoId(),
    title: textOf(document.querySelector("h1 yt-formatted-string, h1.title")),
    channel: textOf(document.querySelector("ytd-channel-name a, #channel-name a")),
    description: visibleDescription(),
  };
}

async function store(payload) {
  return chrome.runtime.sendMessage({ type: "store-youtube-capture", payload });
}

function summaryWidgetText() {
  const controls = [...document.querySelectorAll("button, [role=button]")].filter((element) => /copy\s+transcript|копировать\s+расшифров/i.test(`${textOf(element)} ${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`));
  for (const control of controls) {
    let root = control;
    for (let depth = 0; depth < 7 && root.parentElement; depth += 1) {
      root = root.parentElement;
      const value = textOf(root);
      if (value.length > 200) return value.replace(/copy\s+transcript[^\n]*/gi, "").replace(/копировать\s+расшифров[^\n]*/gi, "").trim();
    }
  }
  return "";
}

async function extractSummaryWidget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const transcript = summaryWidgetText();
    if (transcript.length > 200) {
      await chrome.runtime.sendMessage({ type: "youtube-summary-auto-result", capture: { ...basePayload(), segments: [{ timestamp: "", text: transcript }], source: "youtube-summary-widget" } });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  await chrome.runtime.sendMessage({ type: "youtube-summary-auto-result", videoUrl: location.href, reason: "YouTube Summary did not expose a transcript within 40 seconds; the item was not retried automatically." });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "capture-clipboard-youtube-summary") {
    store({ ...basePayload(), segments: [{ timestamp: "", text: String(message.transcript || "") }], source: "user-copied-youtube-summary" })
      .then(sendResponse).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === "capture-visible-youtube-content") {
    const segments = visibleTranscriptSegments();
    if (segments.length === 0) {
      sendResponse({ error: "Расшифровка не видна. Откройте её на YouTube или скопируйте текст из YouTube Summary." });
      return undefined;
    }
    store({ ...basePayload(), segments, source: "visible-youtube-transcript" })
      .then(sendResponse).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === "extract-youtube-summary") {
    extractSummaryWidget();
    sendResponse({ ok: true });
    return undefined;
  }
  return undefined;
});

chrome.runtime.sendMessage({ type: "youtube-summary-page-ready" }).catch(() => undefined);
