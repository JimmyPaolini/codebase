# Lexico: Latin Dictionary Web Application

## Quick Start

**Type**: SSR web app (TanStack Start)

**Purpose**: Latin word lookup with authentication, bookmarks, and personal library

### Run Locally

```bash
nx run lexico:develop
```

## Architecture Overview

### Tech Stack

- **Frontend**: React 19, TanStack Router (file-based routing)
- **SSR**: TanStack Start server functions
- **Styling**: Tailwind CSS, shadcn/ui via [@codebase/lexico-components](../../packages/lexico-components)

### File-Based Routes

```text
routes/
├── __root.tsx              # Root layout (HTML shell, providers)
├── index.tsx               # /
├── search.tsx              # /search
├── word.$id.tsx            # /word/:id
├── bookmarks.tsx           # /bookmarks (auth)
├── library.tsx             # /library (auth)
└── settings.tsx            # /settings (auth)
```

Generated route tree: [src/lib/routeTree.gen.ts](src/lib/routeTree.gen.ts) (auto-generated, never edit; its path is set by `router.generatedRouteTree` in `vite.config.mts`, resolved relative to `srcDirectory`)

### Authentication Flow

```text
User → OAuth Provider → Server Cookie
```

- **Auth helpers**: [src/lib/auth.ts](src/lib/auth.ts)
- **Route guards**: TanStack Router `beforeLoad`

See [tanstack-start-ssr skill](../../.agents/skills/tanstack-start-ssr/SKILL.md) for SSR patterns.

## Component Library Integration

Always import shared UI from `@codebase/lexico-components` and never duplicate UI code.

```tsx
import { Button, Card, Input } from "@codebase/lexico-components";
```

See the [write-react skill](../../.agents/skills/write-react/SKILL.md) and [lexico-components AGENTS](../../packages/lexico-components/AGENTS.md).

## Testing

See the [testing-strategy skill](../../.agents/skills/testing-strategy/SKILL.md) for unit/integration/end-to-end patterns.

## Troubleshooting

See the [triage-submission skill](../../.agents/skills/triage-submission/SKILL.md) for lint and git hook failures.

## Key Files

- [src/routes/](src/routes/): File-based routes
- [src/lib/auth.ts](src/lib/auth.ts): Auth helpers
