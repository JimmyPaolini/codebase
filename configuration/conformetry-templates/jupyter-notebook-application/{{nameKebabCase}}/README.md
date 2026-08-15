# {{namePascalCase}}

A Python + Jupyter notebook application scaffold in this codebase.

## Requirements

- Python `>=3.11`
- [uv](https://docs.astral.sh/uv/) package manager

## Setup

```bash
cd applications/{{nameKebabCase}}
uv sync
```

## Run tests

```bash
cd applications/{{nameKebabCase}}
uv run pytest
```

## Lint / format / typecheck

```bash
cd applications/{{nameKebabCase}}
uv run ruff check .
uv run ruff format .
uv run pyright
uv run ty check
uv run vulture src testing
uv run bandit -r src
```
