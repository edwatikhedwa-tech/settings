import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultCaptureDirectory, validateCapture, writeCapture } from "./capture-store.mjs";

function parseArguments(args) {
  const options = { port: 8765, output: defaultCaptureDirectory };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--port") options.port = Number(args[++index]);
    if (args[index] === "--output") options.output = path.resolve(args[++index]);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error("Port must be between 1024 and 65535.");
  return options;
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  response.end(`${JSON.stringify(payload)}\n`);
}

export function createCaptureReceiver({ output }) {
  return http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type" });
      response.end();
      return;
    }
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
    if (request.method !== "POST" || request.url !== "/captures") return json(response, 404, { error: "Not found." });
    let body = "";
    let tooLarge = false;
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; if (body.length > 1_500_000) tooLarge = true; });
    request.on("end", async () => {
      try {
        if (tooLarge) throw new Error("Capture request exceeds the local safety limit.");
        const capture = validateCapture(JSON.parse(body));
        const savedPath = await writeCapture(output, capture);
        json(response, 201, { ok: true, segmentCount: capture.segments.length, descriptionLength: capture.description.length, savedPath });
      } catch (error) {
        json(response, 400, { error: error instanceof Error ? error.message : "Invalid capture." });
      }
    });
  });
}

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  const options = parseArguments(process.argv.slice(2));
  const receiver = createCaptureReceiver(options);
  receiver.listen(options.port, "127.0.0.1", () => process.stdout.write(`YouTube capture receiver listening on http://127.0.0.1:${options.port}\n`));
}
