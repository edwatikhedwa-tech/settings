import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const defaultCaptureDirectory = path.resolve(moduleDirectory, "..", "..", "private", "research-cache", "youtube-captures");
const maxTextLength = 200_000;
const maxSegmentCount = 20_000;

function cleanText(value, maximum) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, maximum) : "";
}

function cleanSegments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxSegmentCount).map((segment) => ({
    timestamp: cleanText(segment?.timestamp, 32),
    text: cleanText(segment?.text, 4_000),
  })).filter((segment) => segment.text.length > 0);
}

export function validateCapture(value) {
  const videoUrl = cleanText(value?.videoUrl, 2_048);
  const parsed = new URL(videoUrl);
  const videoId = cleanText(value?.videoId || parsed.searchParams.get("v"), 64);
  const segments = cleanSegments(value?.segments);
  if (parsed.hostname !== "www.youtube.com" || parsed.pathname !== "/watch" || !videoId) {
    throw new Error("Capture must contain a public YouTube watch URL and video ID.");
  }
  if (segments.length === 0) throw new Error("Capture does not contain user-provided transcript text.");
  const transcriptLength = segments.reduce((length, segment) => length + segment.text.length, 0);
  if (transcriptLength > maxTextLength) throw new Error("Transcript exceeds the local safety limit.");
  return {
    capturedAt: new Date(value?.capturedAt || Date.now()).toISOString(),
    videoUrl: parsed.toString(),
    videoId,
    title: cleanText(value?.title, 1_000),
    channel: cleanText(value?.channel, 1_000),
    description: cleanText(value?.description, 50_000),
    segments,
    source: ["visible-youtube-transcript", "user-copied-youtube-summary"].includes(value?.source) ? value.source : "user-provided-text",
  };
}

export function captureFileName(capture) {
  return `${capture.capturedAt.replace(/[:.]/g, "-")}-${capture.videoId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
}

export async function writeCapture(directory, capture) {
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, captureFileName(capture));
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(capture, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
  return destination;
}

export async function listCaptures(directory = defaultCaptureDirectory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const captures = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((a, b) => b.name.localeCompare(a.name))) {
    try {
      const capturePath = path.join(directory, entry.name);
      captures.push({ ...validateCapture(JSON.parse(await readFile(capturePath, "utf8"))), capturePath });
    } catch {
      // A malformed private inbox item must not break other research captures.
    }
  }
  return captures;
}

export async function removeCapture(capturePath) {
  await rm(capturePath, { force: true });
}
