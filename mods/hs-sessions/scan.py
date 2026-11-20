"""List pi and Claude Code sessions as JSON, for the hs-sessions panel.

    python scan.py <home folder>

Prints {"sessions": [{agent, id, file, cwd, mtime, title}, ...]}.

Where each tool keeps its records (the same layout on macOS, Linux, Windows):
  pi           $PI_CODING_AGENT_DIR or <home>/.pi/agent, then
               sessions/<folder>/<timestamp>_<id>.jsonl (pi 1.5 nests one more
               level); subagent-artifacts/ holds sub-agent logs, not sessions.
  Claude Code  $CLAUDE_CONFIG_DIR or <home>/.claude, then
               projects/<flattened folder>/<session id>.jsonl; agent-*.jsonl
               are sidechains, not sessions.

The folder a session ran in is read from the record itself (`cwd`), never
decoded from the flattened folder name, which can't be reversed.
"""
import json
import os
import sys
from glob import glob
from pathlib import PurePath

TITLE_MAX = 200


def pi_root(home):
    return os.environ.get("PI_CODING_AGENT_DIR") or os.path.join(home, ".pi", "agent")


def claude_root(home):
    return os.environ.get("CLAUDE_CONFIG_DIR") or os.path.join(home, ".claude")


def text_of(content):
    if isinstance(content, str):
        return content
    parts = []
    for part in content or []:
        if isinstance(part, str):
            parts.append(part)
        elif isinstance(part, dict) and isinstance(part.get("text"), str):
            parts.append(part["text"])
    return " ".join(parts)


def user_text(entry):
    """The text of a message the person typed, or "" for anything else."""
    if entry.get("isMeta"):
        return ""
    msg = entry.get("message") if isinstance(entry.get("message"), dict) else {}
    if entry.get("type") != "user" and msg.get("role") != "user":
        return ""
    text = text_of(msg.get("content") or entry.get("content")).strip()
    # Slash commands, caveats and tool results arrive wrapped in <tags>.
    return "" if text.startswith("<") else text


def read_record(path, agent):
    """One pass over a JSONL record: its id (pi), cwd, display name and first message."""
    found = {"id": "", "cwd": "", "name": "", "first": ""}
    with open(path, encoding="utf-8", errors="replace") as f:
        for n, line in enumerate(f):
            have_basics = found["cwd"] and found["first"]
            if have_basics and agent == "cc":
                break  # Claude Code has no display name: nothing more to learn.
            if have_basics and '"session_info"' not in line:
                continue  # pi: only a later rename can still change the title.
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if not isinstance(entry, dict):
                continue
            if n == 0 and agent == "pi":
                found["id"] = str(entry.get("id") or "")
            if not found["cwd"] and isinstance(entry.get("cwd"), str):
                found["cwd"] = entry["cwd"]
            if entry.get("type") == "session_info" and entry.get("name"):
                found["name"] = str(entry["name"])  # the last rename wins
            if not found["first"]:
                found["first"] = user_text(entry)
    return found


def session(agent, path):
    stem = PurePath(path).stem
    found = read_record(path, agent)
    # pi's resumable id is in the record; the file name's `<timestamp>_` isn't part of it.
    if agent == "pi":
        ident = found["id"] or stem.rsplit("_", 1)[-1]
    else:
        ident = stem
    title = " ".join((found["name"] or found["first"]).split())[:TITLE_MAX]
    return {
        "agent": agent,
        "id": ident,
        "file": PurePath(path).name,
        "cwd": found["cwd"],
        "mtime": int(os.path.getmtime(path) * 1000),
        "title": title,
    }


def pi_files(home):
    sessions = os.path.join(pi_root(home), "sessions")
    for path in glob(os.path.join(sessions, "*", "*.jsonl")) + glob(os.path.join(sessions, "*", "*", "*.jsonl")):
        if "subagent-artifacts" not in PurePath(path).parts:
            yield path


def claude_files(home):
    for path in glob(os.path.join(claude_root(home), "projects", "*", "*.jsonl")):
        if not PurePath(path).name.startswith("agent-"):
            yield path


def main():
    home = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else os.path.expanduser("~")
    out = []
    for agent, files in (("pi", pi_files(home)), ("cc", claude_files(home))):
        for path in files:
            try:
                out.append(session(agent, path))
            except OSError:
                continue  # deleted or unreadable since the glob: skip just this one
    # ASCII-only output: a Windows console code page can't encode every title.
    json.dump({"sessions": out}, sys.stdout)


if __name__ == "__main__":
    main()
