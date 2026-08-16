# Naming and Imports

## No Abbreviations

Never use abbreviations or acronyms in identifiers.

```typescript
// ❌ WRONG
function handleReq(req: Request, res: Response): void { ... }
const err = new Error("failed");

// ✅ CORRECT
function handleRequest(request: Request, response: Response): void { ... }
const error = new Error("failed");
```

Exceptions: `args` (reserved word collision with `arguments`) and `str` (collision with `string`).

## Naming Conventions

| Pattern | Used for |
| ------- | -------- |
| PascalCase | Types, interfaces, classes, React components, enums |
| camelCase | Variables, functions, properties, parameters |
| UPPER_CASE | True module-level constants and enum member values |

```typescript
// ❌ WRONG
const USER_NAME = "Alice";

// ✅ CORRECT
const MAX_RETRY_ATTEMPTS = 3;

enum HttpStatus {
  NOT_FOUND = 404,
  OK = 200,
}
```

## Type Import Organization

Type imports belong last in each import group.

```typescript
import { getUser } from "./api.js";
import { formatDate } from "./utils.js";
import { type Profile, type User } from "./types.js";
```

See the "Formatting and Ordering" section of [AGENTS.md](../../../../AGENTS.md) for full ordering rules.

## File Extensions in Relative Imports

NodeNext requires `.js` file extensions for relative imports in TypeScript source files.

```typescript
// ❌ WRONG
import { getUser } from "./api";

// ✅ CORRECT
import { getUser } from "./api.js";
```
