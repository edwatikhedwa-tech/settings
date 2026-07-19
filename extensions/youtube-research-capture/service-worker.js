const captureEndpoint = "http://127.0.0.1:8765/captures";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
