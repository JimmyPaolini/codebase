# packages/codometer/src/modules/python-analysis/analyze.py
import ast
import json
from pathlib import Path

EXCLUDE = {
    "node_modules",
    ".nx",
    "dist",
    "build",
    "coverage",
    "notepads",
    ".venv",
    "__pycache__",
    ".git",
}


def should_skip(path: Path) -> bool:
    return any(part in EXCLUDE for part in path.parts)


stats = {
    "files": 0,
    "classes": 0,
    "functions": 0,
    "constants": 0,
    "protocols": 0,
    "imports": 0,
    "decorators": 0,
    "lines": 0,
}

for path in Path(".").rglob("*.py"):
    if should_skip(path):
        continue
    try:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        stats["files"] += 1
        stats["lines"] += len(source.splitlines())
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                stats["classes"] += 1
                stats["decorators"] += len(node.decorator_list)
                if any(getattr(base, "id", "") == "Protocol" for base in node.bases):
                    stats["protocols"] += 1
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                stats["functions"] += 1
                stats["decorators"] += len(node.decorator_list)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id.isupper():
                        stats["constants"] += 1
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                stats["imports"] += 1
    except SyntaxError:
        pass

print(json.dumps(stats))
