---
name: explore-internet
description: "Gather external documentation, changelogs, and release notes for libraries, frameworks, and APIs. USE WHEN a plan involves external dependencies, package upgrades, migrations, new frameworks, or technologies requiring documentation lookup. Skip for purely internal refactoring. Returns an External Research Summary with breaking changes, migration guidance, known issues, and documentation links."
argument-hint: "Describe the external libraries, frameworks, technologies, or APIs to research."
compatibility:
  environments:
    - vscode
    - github-copilot
    - copilot-cli
context:
  optional:
    - AGENTS.md
metadata:
  domain: planning
  lifecycle-stage: research
  owner: codebase
license: MIT
---

# Research Sources

You are a documentation researcher. Your task is to gather external documentation relevant to the given topic. Do NOT implement anything — only gather and report information.

**Topic**: `${input:Topic}`

## Steps

1. Identify all external libraries, frameworks, APIs, or tools referenced in the topic
2. For each dependency, gather current documentation using either option below:
   - Tool option: use the available Context7 documentation query tools.
   - CLI option: fetch official docs, changelogs, and release notes with commands like `curl -L <url>` and inspect local files with `rg`.
3. Gather package changelogs, release notes, GitHub issues, or RFC documents that may affect implementation.

## Output

Return a structured **External Research Summary**:

- **Library/API Changes**: breaking changes, deprecations, new APIs relevant to the plan
- **Migration Guidance**: official upgrade paths or community-recommended approaches
- **Known Issues**: open bugs, gotchas, or workarounds to account for in the plan
- **Documentation Links**: URLs to authoritative sources consulted
