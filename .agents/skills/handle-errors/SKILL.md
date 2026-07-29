---
name: handle-errors
description: "Apply monorepo error handling patterns: Zod validation at boundaries, typed errors, early returns, and retry/backoff. Use when implementing error handling or input validation."
license: MIT
---

# Error Handling Patterns

This skill consolidates error handling conventions across the monorepo.

## When to Use This Skill

Use when asked to:

- Validate inputs or parse API payloads
- Handle errors in server functions
- Add retry logic or backoff
- Fix `any` usage in catch blocks

## Core Rules

- Validate at boundaries with Zod
- Use `unknown` in catch blocks and narrow
- Avoid swallowed errors
- Prefer early returns over deep nesting

## Zod Validation at Boundaries

```ts
import { z } from "zod";

const Schema = z.object({
  id: z.string().uuid(),
  limit: z.number().int().positive().optional(),
});

const data = Schema.parse(input);
```

## Typed Error Handling

```ts
try {
  await doWork();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error", error);
  }
}
```

## Retry with Backoff

```ts
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    return await fetchData();
  } catch (error: unknown) {
    if (attempt === MAX_RETRIES) throw error;
    await new Promise((resolve) =>
      setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt)),
    );
  }
}
```

## References

- [Error Handling](../../code-quality/error-handling.md)
- [TypeScript Conventions](../../conventions/typescript.md)
