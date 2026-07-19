const urlPattern = /https?:\/\/[^\s<>"')\]}]+/gi;

export function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function extractExternalLinks(description) {
  return [...new Set((String(description ?? "").match(urlPattern) ?? []).map((url) => url.replace(/[.,;:!?]+$/, "")))];
}

export function buildSearchPlan(topic, extraQueries = []) {
  const cleanTopic = normalizeText(topic);
  const supplied = extraQueries.map(normalizeText).filter(Boolean);
  const defaults = [cleanTopic, `${cleanTopic} tutorial`, `${cleanTopic} best practices`];
  return [...new Set([...supplied, ...defaults])].slice(0, 4);
}

function tokens(value) {
  return normalizeText(value).toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2);
}

function relevanceScore(video, topicTokens) {
  const haystack = `${video.title} ${video.description}`.toLocaleLowerCase();
  const matches = topicTokens.filter((token) => haystack.includes(token)).length;
  const captionBonus = video.captionStatus === "available" ? 8 : 0;
  const descriptionBonus = video.description ? 4 : 0;
  const linksBonus = Math.min(video.externalLinks.length, 3);
  const views = Number(video.statistics?.viewCount ?? 0);
  const popularityBonus = Math.min(Math.log10(views + 1), 6);
  return Math.round(matches * 12 + captionBonus + descriptionBonus + linksBonus + popularityBonus);
}

export function toResearchVideo(item) {
  const snippet = item.snippet ?? {};
  const description = normalizeText(snippet.description);
  return {
    videoId: item.id,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    title: normalizeText(snippet.title),
    channelId: snippet.channelId ?? "unknown",
    channelTitle: normalizeText(snippet.channelTitle),
    publishedAt: snippet.publishedAt ?? null,
    description,
    externalLinks: extractExternalLinks(description),
    captionStatus: item.contentDetails?.caption === "true" ? "available" : "unavailable-or-unknown",
    statistics: item.statistics ?? {},
  };
}

export function rankResearchCandidates(items, topic, maxCandidates = 15, deepDiveCount = 6) {
  const topicTokens = tokens(topic);
  const seen = new Set();
  const channelCounts = new Map();
  const ranked = items
    .map(toResearchVideo)
    .filter((video) => video.videoId && !seen.has(video.videoId) && seen.add(video.videoId))
    .map((video) => ({ ...video, relevanceScore: relevanceScore(video, topicTokens) }))
    .sort((left, right) => right.relevanceScore - left.relevanceScore || (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""));

  const candidates = [];
  for (const video of ranked) {
    const seenFromChannel = channelCounts.get(video.channelId) ?? 0;
    if (seenFromChannel >= 2 && candidates.length < maxCandidates) continue;
    channelCounts.set(video.channelId, seenFromChannel + 1);
    candidates.push(video);
    if (candidates.length === maxCandidates) break;
  }
  return {
    candidates,
    deepDive: candidates.slice(0, Math.min(deepDiveCount, candidates.length)),
  };
}

export function validateResearchReport(markdown) {
  const requiredHeadings = [
    "## Цель",
    "## Охват",
    "## Источники",
    "## Подтверждённые выводы",
    "## Не подтверждено",
    "## Практические рекомендации",
    "## Кандидаты на внедрение",
    "## Следующее действие",
  ];
  const missing = requiredHeadings.filter((heading) => !String(markdown).includes(heading));
  const hasVideoUrl = /https:\/\/www\.youtube\.com\/watch\?v=/.test(String(markdown));
  const hasContentStatus = /доступен|недоступен|unknown|available|unavailable/i.test(String(markdown));
  return { valid: missing.length === 0 && hasVideoUrl && hasContentStatus, missing, hasVideoUrl, hasContentStatus };
}
