import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureJobStatus, completeCaptureJobItem, createCaptureJob, defaultCaptureDirectory, defaultJobDirectory, failCaptureJobItem, nextCaptureJobItem, validateCapture, writeCapture } from "./capture-store.mjs";

function parseArguments(args) {
  const options = { port: 8765, output: defaultCaptureDirectory, jobs: defaultJobDirectory };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--port") options.port = Number(args[++index]);
    if (args[index] === "--output") options.output = path.resolve(args[++index]);
    if (args[index] === "--jobs") options.jobs = path.resolve(args[++index]);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error("Port must be between 1024 and 65535.");
  return options;
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  response.end(`${JSON.stringify(payload)}\n`);
}

async function readRequestBody(request) {
  let body = "";
  let tooLarge = false;
  request.setEncoding("utf8");
  for await (const chunk of request) { body += chunk; if (body.length > 1_500_000) tooLarge = true; }
  if (tooLarge) throw new Error("Capture request exceeds the local safety limit.");
  return JSON.parse(body);
}

export function createCaptureReceiver({ output, jobs = defaultJobDirectory }) {
  return http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type" });
      response.end();
      return;
    }
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
    if (request.method === "GET" && request.url === "/jobs/next") {
      const next = await nextCaptureJobItem(jobs);
      return json(response, 200, next ? { jobId: next.job.id, topic: next.job.topic, videoUrl: next.item.videoUrl, videoId: next.item.videoId } : { jobId: null });
    }
    const jobMatch = request.url?.match(/^\/jobs\/([a-zA-Z0-9_-]+)\/(complete|failed)$/);
    try {
      if (request.method === "POST" && request.url === "/captures") {
        const capture = validateCapture(await readRequestBody(request));
        const savedPath = await writeCapture(output, capture);
        return json(response, 201, { ok: true, segmentCount: capture.segments.length, descriptionLength: capture.description.length, savedPath });
      }
      if (request.method === "POST" && jobMatch?.[2] === "complete") {
        const result = await completeCaptureJobItem(jobs, output, jobMatch[1], (await readRequestBody(request)).capture);
        return json(response, 201, { ok: true, segmentCount: result.capture.segments.length, savedPath: result.savedPath });
      }
      if (request.method === "POST" && jobMatch?.[2] === "failed") {
        const body = await readRequestBody(request);
        await failCaptureJobItem(jobs, jobMatch[1], body.videoUrl, body.reason);
        return json(response, 200, { ok: true });
      }
      return json(response, 404, { error: "Not found." });
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : "Invalid capture." });
    }
  });
}

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  const options = parseArguments(process.argv.slice(2));
  const receiver = createCaptureReceiver(options);
  receiver.listen(options.port, "127.0.0.1", () => process.stdout.write(`YouTube capture receiver listening on http://127.0.0.1:${options.port}\n`));
}
