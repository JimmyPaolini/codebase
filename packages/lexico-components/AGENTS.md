# Lexico Components: Shared React Component Library

## Quick Start

**Type**: Shared UI component library (shadcn/ui + Radix UI)

**Purpose**: Single source of UI primitives and shared components for the codebase

### Add a shadcn Component

```bash
cd packages/lexico-components
pnpx shadcn@latest add <component-name>
```

Then export it in [src/index.ts](src/index.ts).

## Architecture Overview

### Component Ownership Model

- **`src/components/ui/`**: **Never modify** (shadcn-generated)
- **`src/components/`**: Custom components (safe to edit)
- **`src/hooks/`**: Shared hooks
- **`src/lib/`**: Utilities (e.g., `cn()`)

**Rule**: Compose `ui/` primitives in `components/` instead of editing `ui/` files directly.

### Theming Strategy

- Tailwind CSS + CSS variables
- Light/dark mode via `data-theme`
- Tokens in [src/styles/globals.css](src/styles/globals.css)

See [React Conventions](../../documentation/conventions/react.md) for theming patterns.

## Usage in Apps

```tsx
import { Button, Card, Input } from "@codebase/lexico-components";
```

Never duplicate UI code in apps. Always import from this package.

## Development

### Add Custom Components

```bash
cd packages/lexico-components/src/components
touch word-card.tsx
```

### Export Components

```ts
// src/index.ts
export * from "./components/word-card";
```

## Troubleshooting

See [Common Gotchas](../../documentation/troubleshooting/gotchas.md) for:

- shadcn updates overwriting `ui/` files
- theme tokens not updating

## Key Files

- [src/components/ui/](src/components/ui/): shadcn-generated components
- [src/components/](src/components/): custom components
- [src/hooks/](src/hooks/): shared hooks
- [src/lib/utils.ts](src/lib/utils.ts): `cn()` utility
- [src/styles/globals.css](src/styles/globals.css): theme tokens
- [components.json](components.json): shadcn configuration
