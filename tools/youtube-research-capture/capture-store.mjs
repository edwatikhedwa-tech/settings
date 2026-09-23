import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const defaultCaptureDirectory = path.resolve(moduleDirectory, "..", "..", "private", "research-cache", "youtube-captures");
export const defaultJobDirectory = path.resolve(moduleDirectory, "..", "..", "private", "research-cache", "youtube-jobs");
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
    source: ["visible-youtube-transcript", "user-copied-youtube-summary", "youtube-summary-widget"].includes(value?.source) ? value.source : "user-provided-text",
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

async function writeJson(destination, value) {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
}

function jobPath(directory, jobId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) throw new Error("Invalid capture job ID.");
  return path.join(directory, `${jobId}.json`);
}

export async function createCaptureJob(directory = defaultJobDirectory, { topic, videoUrls }) {
  const unique = [...new Set((videoUrls ?? []).map((url) => cleanText(url, 2_048)).filter(Boolean))].slice(0, 6);
  if (!cleanText(topic, 1_000) || unique.length === 0) throw new Error("A topic and at least one YouTube URL are required.");
  const items = unique.map((videoUrl) => {
    const capture = validateCapture({ videoUrl, segments: [{ text: "queued" }] });
    return { videoUrl: capture.videoUrl, videoId: capture.videoId, status: "pending", attempts: 0, error: null, capturedAt: null };
  });
  const job = { id: `youtube-${Date.now()}-${randomUUID().slice(0, 8)}`, topic: cleanText(topic, 1_000), createdAt: new Date().toISOString(), items };
  await writeJson(jobPath(directory, job.id), job);
  return job;
}

async function readJob(directory, jobId) {
  return JSON.parse(await readFile(jobPath(directory, jobId), "utf8"));
}

async function listJobs(directory = defaultJobDirectory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const jobs = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map(async (entry) => {
      try { return JSON.parse(await readFile(path.join(directory, entry.name), "utf8")); } catch { return null; }
    }));
    return jobs.filter(Boolean).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function nextCaptureJobItem(directory = defaultJobDirectory) {
  for (const job of await listJobs(directory)) {
    const item = job.items.find((candidate) => candidate.status === "pending");
    if (item) return { job, item };
  }
  return null;
}

export async function completeCaptureJobItem(jobDirectory, captureDirectory, jobId, captureValue) {
  const capture = validateCapture(captureValue);
  const job = await readJob(jobDirectory, jobId);
  const item = job.items.find((candidate) => candidate.videoId === capture.videoId && candidate.status === "pending");
  if (!item) throw new Error("No pending job item matches this capture.");
  const savedPath = await writeCapture(captureDirectory, capture);
  Object.assign(item, { status: "completed", attempts: item.attempts + 1, error: null, capturedAt: capture.capturedAt });
  await writeJson(jobPath(jobDirectory, jobId), job);
  return { capture, savedPath, job };
}

export async function failCaptureJobItem(jobDirectory, jobId, videoUrl, reason) {
  const expected = validateCapture({ videoUrl, segments: [{ text: "failed" }] });
  const job = await readJob(jobDirectory, jobId);
  const item = job.items.find((candidate) => candidate.videoId === expected.videoId && candidate.status === "pending");
  if (!item) throw new Error("No pending job item matches this failure.");
  Object.assign(item, { status: "failed", attempts: item.attempts + 1, error: cleanText(reason, 1_000) || "No transcript was available.", capturedAt: null });
  await writeJson(jobPath(jobDirectory, jobId), job);
  return job;
}

export async function captureJobStatus(directory = defaultJobDirectory, jobId) {
  return readJob(directory, jobId);
}
