import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const defaultBudgetDirectory = path.resolve(moduleDirectory, "..", "..", "private", "research-cache", "supadata-budget");

export function monthlyBudget(environment = process.env) {
  const value = Number(environment.SUPADATA_MONTHLY_RESEARCH_BUDGET ?? 80);
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error("SUPADATA_MONTHLY_RESEARCH_BUDGET must be an integer from 1 to 100.");
  return value;
}

function month(now) { return now.toISOString().slice(0, 7); }
function file(directory) { return path.join(directory, "usage.json"); }

export async function readSupadataBudget({ directory = defaultBudgetDirectory, limit = monthlyBudget(), now = new Date() } = {}) {
  const current = month(now);
  try {
    const saved = JSON.parse(await readFile(file(directory), "utf8"));
    if (saved.month === current && Number.isInteger(saved.used) && saved.used >= 0) return { month: current, limit, used: saved.used, remaining: Math.max(0, limit - saved.used) };
  } catch (error) { if (error?.code !== "ENOENT") throw error; }
  return { month: current, limit, used: 0, remaining: limit };
}

export async function reserveSupadataRequest(options = {}) {
  const status = await readSupadataBudget(options);
  if (status.remaining < 1) return { ...status, allowed: false };
  const next = { ...status, used: status.used + 1, remaining: status.remaining - 1, updatedAt: new Date().toISOString() };
  const directory = options.directory ?? defaultBudgetDirectory;
  await mkdir(directory, { recursive: true });
  const temporary = `${file(directory)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporary, file(directory));
  return { ...next, allowed: true };
}
