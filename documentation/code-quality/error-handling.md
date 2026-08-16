# Error Handling

## Input Validation with Zod

Use **Zod schemas** to validate user inputs and API requests at boundaries:

```typescript
import { z } from "zod";

// Define schema
const UserInputSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  age: z.number().int().positive().optional(),
});

// Parse and validate
try {
  const input = UserInputSchema.parse(userInput);
  // input is now typed as { name: string, email: string, age?: number }
  processUser(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation failed:", error.errors);
    // error.errors: [{ path: ['email'], message: 'Invalid email' }, ...]
  }
}
```

### Best Practices

**✅ Parse at boundaries** (user input, API requests):

```typescript
// Server function (TanStack Start)
export const createUser = createServerFn({ method: "POST" })
  .validator((input) => CreateUserSchema.parse(input)) // Parse early
  .handler(async ({ data }) => {
    // data is now typed and validated
    const user = await database.users.create(data);
    return user;
  });
```

**✅ Let TypeScript handle internal types**:

```typescript
// Internal function (already validated)
function processUser(user: { name: string; email: string }): void {
  // No need to validate again - TypeScript ensures type safety
  console.log(user.name, user.email);
}
```

**❌ Don't over-validate**:

```typescript
// WRONG: Validating internal typed values
function internal(user: User): void {
  const validated = UserSchema.parse(user); // Unnecessary!
}
```

## Early Returns

Avoid deep nesting with early returns:

```typescript
// ✅ CORRECT: Early returns for error cases
function processOrder(order: Order): void {
  if (!order) {
    console.error("Order is required");
    return;
  }

  if (order.items.length === 0) {
    console.error("Order must have items");
    return;
  }

  if (order.total < 0) {
    console.error("Order total must be positive");
    return;
  }

  // Happy path (not nested)
  fulfillOrder(order);
  sendConfirmation(order);
}

// ❌ WRONG: Deep nesting
function processOrder(order: Order): void {
  if (order) {
    if (order.items.length > 0) {
      if (order.total >= 0) {
        fulfillOrder(order);
        sendConfirmation(order);
      } else {
        console.error("Order total must be positive");
      }
    } else {
      console.error("Order must have items");
    }
  } else {
    console.error("Order is required");
  }
}
```

## No Swallowed Errors

Always log or re-throw errors:

```typescript
// ✅ CORRECT: Log error
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  // Optionally re-throw
  throw error;
}

// ❌ WRONG: Empty catch block (swallows error)
try {
  await riskyOperation();
} catch (error) {
  // Silent failure - debugging nightmare!
}
```

## Typed Errors

Avoid `catch (e: any)` — use `unknown` and narrow with type guards:

```typescript
// ✅ CORRECT: unknown + type guard
try {
  await fetchData();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Error:", error.message); // Type-safe
  } else if (typeof error === "string") {
    console.error("String error:", error);
  } else {
    console.error("Unknown error:", error);
  }
}

// ❌ WRONG: any disables type checking
try {
  await fetchData();
} catch (error: any) {
  console.error(error.message); // No type safety
}
```

### Custom Error Classes

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// Usage
throw new ValidationError("Invalid email format", "email");

// Catch with type guard
try {
  validateUser(input);
} catch (error: unknown) {
  if (error instanceof ValidationError) {
    console.error(`Field ${error.field}: ${error.message}`);
  }
}
```

### API Error Handling

```typescript
// Define error schema
const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  errors: z.array(z.string()).optional(),
});

// Parse API errors
try {
  const response = await fetch("/api/users");
  if (!response.ok) {
    const errorData: unknown = await response.json();
    const apiError = ApiErrorSchema.parse(errorData);
    throw new Error(`API error ${apiError.statusCode}: ${apiError.message}`);
  }
  const data = await response.json();
  return data;
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Request failed:", error.message);
  }
  throw error; // Re-throw for caller to handle
}
```

## Graceful Degradation

Use retry logic with exponential backoff for API calls:

```typescript
// Environment variables (caelundas pattern)
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES ?? "3", 10);
const BACKOFF_MULTIPLIER = parseFloat(process.env.BACKOFF_MULTIPLIER ?? "2");
const INITIAL_DELAY_MS = 1000;

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt < retries) {
        const delayMs =
          INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
        console.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Failed after ${retries + 1} attempts: ${lastError}`);
}

// Usage
const data = await fetchWithRetry(() => fetch("https://api.example.com/data"));
```

## Server Function Error Handling (lexico)

TanStack Start server functions throw errors that surface to `errorComponent`:

```typescript
// Server function
export const getWord = createServerFn({ method: "GET" })
  .validator((input) => GetWordSchema.parse(input))
  .handler(async ({ data }) => {
    const word = await database.words.findUnique({ where: { id: data.id } });

    if (!word) {
      throw new Error("Word not found"); // Surfaces to errorComponent
    }

    return word;
  });

// Route with error component
export const Route = createFileRoute("/word/$id")({
  loader: async ({ params }) => {
    const word = await getWord({ id: params.id });
    return { word };
  },
  errorComponent: ({ error }) => {
    return (
      <div className="error">
        <h1>Error</h1>
        <p>{error.message}</p>
      </div>
    );
  },
});
```

## Error Logging

### Development

```typescript
console.error("Error details:", error);
console.warn("Warning:", warning);
console.debug("Debug info:", data);
```

### Production

Consider structured logging:

```typescript
import { logger } from "./logger";

try {
  await processPayment(order);
} catch (error: unknown) {
  logger.error("Payment processing failed", {
    orderId: order.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

## Error Boundaries (React)

Catch rendering errors in React components:

```typescript
import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorMessage />}>
  <App />
</ErrorBoundary>;
```

## Assertion Functions

For impossible states:

```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// Usage in exhaustive switch
type Status = "pending" | "success" | "error";

function handleStatus(status: Status): void {
  switch (status) {
    case "pending":
      showSpinner();
      break;
    case "success":
      showSuccess();
      break;
    case "error":
      showError();
      break;
    default:
      assertNever(status); // Compile error if new status added
  }
}
```

## Summary

| Pattern              | Use When                   | Example                        |
| -------------------- | -------------------------- | ------------------------------ |
| **Zod validation**   | User input, API boundaries | `UserInputSchema.parse(input)` |
| **Early returns**    | Avoiding deep nesting      | `if (!user) return;`           |
| **Typed errors**     | Catching exceptions        | `catch (error: unknown)`       |
| **Custom errors**    | Domain-specific failures   | `throw new ValidationError()`  |
| **Retry logic**      | Network requests           | `fetchWithRetry()`             |
| **Error boundaries** | React rendering errors     | `<ErrorBoundary>`              |

**Key Principles**:

1. **Validate at boundaries** (Zod), trust internally (TypeScript)
2. **Never swallow errors** (always log or re-throw)
3. **Use typed catches** (`unknown`, not `any`)
4. **Fail fast** (early returns, explicit errors)
5. **Degrade gracefully** (retry, fallback UI)

## Resources

- [Zod Documentation](https://zod.dev/)
- [TypeScript Error Handling](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html#control-flow-analysis-of-aliased-conditions)
- [TypeScript Conventions](typescript.md) - Typed error patterns
- [caelundas Error Patterns](../../applications/caelundas/src/main.ts) - Retry logic examples
