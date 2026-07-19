const supadataTranscriptEndpoint = "https://api.supadata.ai/v1/transcript";

export function supadataApiKey(environment = process.env) {
  const key = environment.SUPADATA_API_KEY;
  if (!key) throw new Error("SUPADATA_API_KEY is not set in the local environment.");
  return key;
}

export function validateYouTubeUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Each video_url must be an absolute YouTube URL.");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") {
    throw new Error("Each video_url must point to youtube.com or youtu.be.");
  }
  return url.toString();
}

export async function fetchSupadataTranscript(videoUrl, { apiKey, fetchFn = fetch } = {}) {
  const url = new URL(supadataTranscriptEndpoint);
  url.searchParams.set("url", validateYouTubeUrl(videoUrl));
  const response = await fetchFn(url, {
    headers: { Accept: "application/json", "x-api-key": apiKey },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Supadata request failed with HTTP ${response.status}.`;
    throw new Error(String(message));
  }

  const content = Array.isArray(payload.content) ? payload.content : [];
  if (content.length === 0) throw new Error("Supadata returned no transcript segments.");
  return {
    provider: "supadata",
    videoUrl: validateYouTubeUrl(videoUrl),
    language: payload.lang ?? null,
    segmentCount: content.length,
    segments: content.map(({ text, offset, duration }) => ({ text, offset, duration })),
  };
}

export async function fetchSupadataTranscripts(videoUrls, options = {}) {
  if (!Array.isArray(videoUrls) || videoUrls.length < 1 || videoUrls.length > 6) {
    throw new Error("video_urls must contain from 1 to 6 YouTube URLs.");
  }
  const apiKey = options.apiKey ?? supadataApiKey(options.environment);
  const uniqueUrls = [...new Set(videoUrls.map(validateYouTubeUrl))];
  const results = [];
  for (const videoUrl of uniqueUrls) {
    try {
      results.push({ status: "available", ...(await fetchSupadataTranscript(videoUrl, { ...options, apiKey })) });
    } catch (error) {
      results.push({
        status: "unavailable",
        provider: "supadata",
        videoUrl,
        error: error instanceof Error ? error.message : "Supadata transcript request failed.",
      });
    }
  }
  return results;
}
