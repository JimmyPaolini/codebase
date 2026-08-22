# Strict Typing

All TypeScript projects in this codebase inherit strict settings from [configuration/tsconfig.json](../../../../configuration/tsconfig.json).

## Strict Mode Flags

### noUncheckedIndexedAccess

Array and object index access returns `T | undefined`. Always guard before use.

```typescript
// ❌ WRONG
const first = items[0];
console.log(first.toUpperCase());

// ✅ CORRECT
console.log(items[0]?.toUpperCase());

const first = items[0] ?? "default";
```

### exactOptionalPropertyTypes

Never assign `undefined` to optional properties. Omit the property instead.

```typescript
interface User {
  name: string;
  email?: string;
}

// ❌ WRONG
const user: User = { email: undefined, name: "Alice" };

// ✅ CORRECT
const user: User = { name: "Alice" };
```

### verbatimModuleSyntax

Type-only imports must use the `type` keyword.

```typescript
// ❌ WRONG
import { User } from "./types";

// ✅ CORRECT
import { type User } from "./types";
import { getUser, type User } from "./api";
```

## Explicit Return Types

All functions must declare return types.

```typescript
// ❌ WRONG
function getUser(id: string) {
  return { id, name: "Alice" };
}

// ✅ CORRECT
function getUser(id: string): User {
  return { id, name: "Alice" };
}

async function fetchUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then((response) => response.json());
}
```

## No any Types

Use `unknown` or a concrete type instead of `any`.

```typescript
// ❌ WRONG
function parse(data: any): any {
  return JSON.parse(data);
}

// ✅ CORRECT
function parse(data: string): unknown {
  return JSON.parse(data);
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  );
}
```

## No Non-Null Assertions

Do not use `!` to bypass null checks.

```typescript
// ❌ WRONG
const name = user!.name;

// ✅ CORRECT
const name = user?.name ?? "unknown";
```

## Exhaustive Switch Statements

Handle all union members in `switch` statements.

```typescript
type Status = "active" | "inactive" | "pending";

switch (status) {
  case "active":
    return enable();
  case "inactive":
    return disable();
  case "pending":
    return queue();
}
```

## Async and Promises

Functions returning `Promise` must use `async`, and all promises must be handled.

```typescript
// ❌ WRONG
function fetchUser(id: string): Promise<User> {
  return apiClient.get(`/users/${id}`);
}

sendEmail(user.email);

// ✅ CORRECT
async function fetchUser(id: string): Promise<User> {
  return apiClient.get(`/users/${id}`);
}

await sendEmail(user.email);
void sendEmail(user.email);
```

## Consistent Returns

Functions must either always return or never return.

```typescript
// ❌ WRONG
function getLabel(status: string): string | undefined {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
}

// ✅ CORRECT
function getLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Unknown";
}
