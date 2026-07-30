# Affirmations

A Python + Jupyter notebook application scaffold in this codebase.

Python application that generates structured affirmations for spiritual practices using LangChain, LangGraph, and a locally-hosted Qwen 3.5 LLM via Ollama. A LangGraph ReAct agent researches spiritual topics using SearxNG metasearch (aggregating Wikipedia, DuckDuckGo, Google Scholar, and more) with Trafilatura-powered content extraction, then generates Pydantic-validated affirmations saved as structured JSON.

## Requirements

- Python `>=3.11`
- [uv](https://docs.astral.sh/uv/) package manager

## Setup

```bash
cd applications/affirmations
uv sync
```

## Run tests

```bash
cd applications/affirmations
uv run pytest
```

## Lint / format / typecheck

```bash
cd applications/affirmations
uv run ruff check .
uv run ruff format .
uv run pyright
uv run ty check
uv run vulture src testing
uv run bandit -r src
```

## Prerequisites

- **Docker** (Docker-in-Docker is already configured in the devcontainer)
- **uv** (Python package manager) — auto-installed if missing
- **Python ≥ 3.11** (devcontainer provides 3.14)

## Quickstart

```bash
# 1. Start Docker services
nx run affirmations:ollama --configuration=start
nx run affirmations:searxng --configuration=start
nx run affirmations:open-webui --configuration=start

# 2. Pull the gemma4:e2b model (one-time download)
nx run affirmations:ollama --configuration=pull-small   # gemma4:e2b

# 3. Open src/affirmations.ipynb in VSCode to explore the full pipeline
```

## Project Structure

```text
applications/affirmations/
├── src/
│   ├── __init__.py          # Package marker
│   ├── affirmations.ipynb   # Main Jupyter notebook pipeline
│   ├── grammars.py          # Grammar enums (Mood, Voice, Tense, etc.) and Grammar model
│   ├── models.py            # Pydantic models (Affirmation, SubjectAffirmations, etc.)
│   ├── output.py            # JSON/Markdown file I/O utilities
│   ├── prompts.py           # LangChain prompt templates
│   └── subjects.py          # Spiritual subject configuration (Subject, SubjectCategory)
├── testing/
│   ├── __init__.py
│   ├── test_grammars.py
│   ├── test_models.py
│   ├── test_output.py
│   ├── test_prompts.py
│   └── test_subjects.py
├── output/                   # Generated JSON/Markdown files (gitignored except .gitkeep)
├── AGENTS.md
├── pyproject.toml
├── uv.lock
├── searxng.settings.yml
└── README.md
```

## Nx Targets

| Target          | Command                                                 | Description                |
| --------------- | ------------------------------------------------------- | -------------------------- |
| `lint`          | `nx run affirmations:lint`                              | Ruff linting               |
| `format`        | `nx run affirmations:format`                            | Ruff formatting            |
| `typecheck`     | `nx run affirmations:typecheck`                         | pyright type checking      |
| `test`          | `nx run affirmations:test`                              | pytest unit tests          |
| `vulture`       | `nx run affirmations:vulture`                           | Vulture dead code analysis |
| `ollama`        | `nx run affirmations:ollama --configuration=start`      | Start Ollama container     |
| `ollama`        | `nx run affirmations:ollama --configuration=stop`       | Stop Ollama container      |
| `ollama`        | `nx run affirmations:ollama --configuration=pull-small` | Pull gemma4:e2b            |
| `searxng`       | `nx run affirmations:searxng --configuration=start`     | Start SearxNG container    |
| `searxng`       | `nx run affirmations:searxng --configuration=stop`      | Stop SearxNG container     |
| `searxng`       | `nx run affirmations:searxng --configuration=open`      | Open SearxNG in browser    |
| `open-webui`    | `nx run affirmations:open-webui --configuration=start`  | Start Open WebUI container |
| `open-webui`    | `nx run affirmations:open-webui --configuration=stop`   | Stop Open WebUI container  |
| `open-webui`    | `nx run affirmations:open-webui --configuration=open`   | Open Open WebUI in browser |
| `spell-check`   | `nx run affirmations:spell-check`                       | cspell spell check         |
| `markdown-lint` | `nx run affirmations:markdown-lint`                     | Markdown linting           |

## Output Format

Generated affirmations are saved to `output/{practice}.json`:

```json
{
  "practice": "tarot",
  "affirmations": [
    {
      "text": "I am resilient through the revolution of transformation",
      "practice": "tarot",
      "structure": "I am [positive quality] through [transformative process]",
      "keywords": ["resilience", "revolution", "transformation", "liberation"]
    }
  ]
}
```

## Research Tools

| Tool             | Type          | Description                                                             |
| ---------------- | ------------- | ----------------------------------------------------------------------- |
| `searxng_search` | Always active | Self-hosted SearxNG at `http://localhost:8889`, aggregates 135+ engines |

## Research Processing Layer

Raw search results pass through `src/research.py` before reaching the LLM:

1. **Trafilatura extraction** — removes HTML boilerplate (navs, footers, ads) and extracts main article content. Outperforms BeautifulSoup in all benchmarks.
2. **Relevance truncation** — keeps the most query-relevant section within `max_chars=1000`
3. **Deduplication** — removes near-duplicate content across sources
4. **Context budgeting** — caps total context at ~12,000 chars to preserve the 4B model's attention window

## Spiritual Practices

| Practice  | Topics           | Example Structure                                      |
| --------- | ---------------- | ------------------------------------------------------ |
| tarot     | 22 Major Arcana  | `I am [quality] through [transformative process]`      |
| astrology | 12 zodiac signs  | `I channel the [quality] energy of [sign] to [action]` |
| chakras   | 7 chakras        | `My [chakra] is open and [quality] flows freely`       |
| kabbalah  | 10 sephirot      | `I embody the [quality] of [sephirah] in all I do`     |
| runes     | 24 Elder Futhark | `I carry the power of [rune] and [quality]`            |
| lenormand | 36 cards         | `I welcome [meaning] into my life with [quality]`      |

## Adding New Spiritual Practices

Add entries to `src/subjects.py`:

```python
PRACTICES["numerology"] = PracticeConfig(
    name="numerology",
    topics=["Life Path 1", "Life Path 2", ...],
    structures=[
        "Through the vibration of [number], I [positive action]",
        "I align with the energy of [number] to [manifestation]",
    ],
)
```

## Services

| Service    | Port    | Description                           |
| ---------- | ------- | ------------------------------------- |
| Ollama     | `11434` | Local LLM server (`gemma4:e2b`)       |
| Open WebUI | `3001`  | Browser-based Ollama chat interface   |
| SearxNG    | `8889`  | Self-hosted metasearch (135+ engines) |

## Environment Variables

| Variable       | Default                  | Description        |
| -------------- | ------------------------ | ------------------ |
| `OLLAMA_HOST`  | `http://localhost:11434` | Ollama server URL  |
| `SEARXNG_HOST` | `http://localhost:8889`  | SearxNG server URL |

## Performance Notes

- **CPU-only inference**: Qwen3.5 9B takes ~5–15s per generation on CPU
- **Model keepalive**: `OLLAMA_KEEP_ALIVE=10m` avoids repeated model loads
- **Smaller alternative**: Use `qwen3.5:0.8b` (default) for fast iteration during development
- **Simple chain**: Use LCEL chains (no research) for quick generation without tool overhead
