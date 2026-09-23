const status = document.querySelector("#status");
const clipboardButton = document.querySelector("#clipboard");
const visibleButton = document.querySelector("#visible");

function setStatus(message) {
  status.textContent = message;
}

async function currentYouTubeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.youtube.com/watch")) {
    throw new Error("Откройте страницу ролика YouTube.");
  }
  return tab;
}

async function run(button, action) {
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Не удалось получить текст.");
  } finally {
    button.disabled = false;
  }
}

clipboardButton.addEventListener("click", () => run(clipboardButton, async () => {
  const tab = await currentYouTubeTab();
  const transcript = (await navigator.clipboard.readText()).trim();
  if (!transcript) throw new Error("Буфер пуст. В YouTube Summary нажмите Copy Transcript и повторите.");
  setStatus("Сохраняю текст, скопированный вами из YouTube Summary...");
  const result = await chrome.tabs.sendMessage(tab.id, { type: "capture-clipboard-youtube-summary", transcript });
  if (result?.error) throw new Error(result.error);
  setStatus(`Сохранено: ${result.segmentCount} фрагм., ${result.descriptionLength} симв. описания.`);
}));

visibleButton.addEventListener("click", () => run(visibleButton, async () => {
  const tab = await currentYouTubeTab();
  setStatus("Получаю только видимую расшифровку...");
  const result = await chrome.tabs.sendMessage(tab.id, { type: "capture-visible-youtube-content" });
  if (result?.error) throw new Error(result.error);
  setStatus(`Сохранено: ${result.segmentCount} фрагм., ${result.descriptionLength} симв. описания.`);
}));
