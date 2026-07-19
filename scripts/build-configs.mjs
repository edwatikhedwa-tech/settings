import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policyDir = join(root, "policies");
const generatedDir = join(root, "generated");

function readPolicies() {
  return readdirSync(policyDir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => readFileSync(join(policyDir, name), "utf8").trim())
    .join("\n\n---\n\n");
}

function writeIfChanged(path, content) {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return true;
}

const policies = readPolicies();
const template = readFileSync(join(root, "templates", "client-instructions.md"), "utf8");
const clients = {
  codex: "Codex",
  "claude-code": "Claude Code",
  chatgpt: "ChatGPT Manual Instructions",
};

for (const [slug, name] of Object.entries(clients)) {
  writeIfChanged(
    join(generatedDir, slug, "instructions.md"),
    template.replaceAll("{{CLIENT_NAME}}", name).replaceAll("{{POLICIES}}", policies),
  );
}

writeIfChanged(
  join(generatedDir, "codex", "config.toml"),
  "# Generated project-level Codex configuration.\n# Review before copying into .codex/config.toml.\nmodel_instructions_file = \"../generated/codex/instructions.md\"\n",
);
writeIfChanged(
  join(generatedDir, "codex", "AGENTS.md"),
  "# Agent Control Plane Global Guidance\n\nThis file is generated from the canonical policies in this repository.\nIt is intended for the managed block in ~/.codex/AGENTS.md.\n\n" + policies + "\n",
);
writeIfChanged(
  join(generatedDir, "claude-code", "README.md"),
  "# Claude Code adapter\n\nUse `generated/claude-code/instructions.md` as project memory content only after reviewing current Claude Code documentation.\nPrefer official `claude mcp` commands for MCP setup when available.\n",
);
