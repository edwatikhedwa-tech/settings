import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCaptureReceiver } from "./receiver.mjs";
import { captureJobStatus, completeCaptureJobItem, createCaptureJob, nextCaptureJobItem, validateCapture } from "./capture-store.mjs";

const sample = {
  capturedAt: "2026-07-19T12:00:00.000Z",
  videoUrl: "https://www.youtube.com/watch?v=abc123",
  title: "Sample",
  channel: "Channel",
  description: "Description",
  segments: [{ timestamp: "0:00", text: "Copied summary transcript." }],
  source: "user-copied-youtube-summary",
};
assert.equal(validateCapture(sample).videoId, "abc123");
assert.throws(() => validateCapture({ ...sample, videoUrl: "https://example.com/watch?v=abc123" }));

const output = await mkdtemp(path.join(os.tmpdir(), "youtube-capture-test-"));
const jobs = await mkdtemp(path.join(os.tmpdir(), "youtube-job-test-"));
const receiver = createCaptureReceiver({ output, jobs });
await new Promise((resolve) => receiver.listen(0, "127.0.0.1", resolve));
const { port } = receiver.address();
const response = await fetch(`http://127.0.0.1:${port}/captures`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sample) });
assert.equal(response.status, 201);
const saved = await response.json();
assert.equal(JSON.parse(await readFile(saved.savedPath, "utf8")).source, "user-copied-youtube-summary");
const jobResponse = await fetch(`http://127.0.0.1:${port}/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "Agent environment", videoUrls: [sample.videoUrl] }) });
assert.equal(jobResponse.status, 404, "Jobs are created through the local MCP, not an unauthenticated browser endpoint.");
const job = await createCaptureJob(jobs, { topic: "Agent environment", videoUrls: [sample.videoUrl] });
assert.equal((await nextCaptureJobItem(jobs)).item.videoId, "abc123");
await completeCaptureJobItem(jobs, output, job.id, sample);
assert.equal((await captureJobStatus(jobs, job.id)).items[0].status, "completed");
await new Promise((resolve) => receiver.close(resolve));
console.log("[OK] YouTube capture receiver test passed.");
