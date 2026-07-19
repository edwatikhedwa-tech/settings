from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POLICY_DIR = ROOT / "policies"
GENERATED_DIR = ROOT / "generated"


CLIENTS = {
    "codex": "Codex",
    "claude-code": "Claude Code",
    "chatgpt": "ChatGPT Manual Instructions",
}


def read_policies() -> str:
    parts: list[str] = []
    for path in sorted(POLICY_DIR.glob("*.md")):
        parts.append(path.read_text(encoding="utf-8").strip())
    return "\n\n---\n\n".join(parts)


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    policies = read_policies()
    template = (ROOT / "templates" / "client-instructions.md").read_text(encoding="utf-8")
    changed = False

    for slug, name in CLIENTS.items():
        content = template.replace("{{CLIENT_NAME}}", name).replace("{{POLICIES}}", policies)
        changed = write_if_changed(GENERATED_DIR / slug / "instructions.md", content) or changed

    codex_config = """# Generated project-level Codex configuration.
# Review before copying into .codex/config.toml.
model_instructions_file = "../generated/codex/instructions.md"
"""
    changed = write_if_changed(GENERATED_DIR / "codex" / "config.toml", codex_config) or changed

    global_agents = """# Agent Control Plane Global Guidance

This file is generated from the canonical policies in this repository.
It is intended for the managed block in ~/.codex/AGENTS.md.

""" + policies + "\n"
    changed = write_if_changed(GENERATED_DIR / "codex" / "AGENTS.md", global_agents) or changed

    claude_note = """# Claude Code adapter

Use `generated/claude-code/instructions.md` as project memory content only after reviewing current Claude Code documentation.
Prefer official `claude mcp` commands for MCP setup when available.
"""
    changed = write_if_changed(GENERATED_DIR / "claude-code" / "README.md", claude_note) or changed

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
