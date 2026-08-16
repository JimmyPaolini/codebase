# Testing Strategy

## Test Types

Tests are organized by integration level using filename suffixes:

| Type            | Suffix                  | Purpose                    | I/O           | Speed                    |
| --------------- | ----------------------- | -------------------------- | ------------- | ------------------------ |
| **Unit**        | `*.unit.test.ts`        | Pure functions, no I/O     | Mocked        | Fast (< 100ms suite)     |
| **Integration** | `*.integration.test.ts` | Database/API interactions  | Real DB       | Moderate (1-2s per test) |
| **End-to-End**  | `*.end-to-end.test.ts`  | Full application workflows | Real services | Slow (30-60s per test)   |

## Running Tests

### By Type

```bash
# Unit tests only (fast feedback loop)
nx run caelundas:vitest:unit
nx run lexico:vitest:unit

# Integration tests (database validation)
nx run caelundas:vitest:integration

# End-to-end tests (full system validation)
nx run caelundas:vitest:end-to-end

# All tests
nx run caelundas:vitest
```

### Affected Tests

```bash
# Test only changed projects
nx affected --target=vitest --base=main

# Test specific type across affected projects
nx affected --target=vitest:unit --base=main
```

### Coverage

```bash
# Generate coverage report
nx run caelundas:vitest --coverage

# View coverage
open applications/caelundas/coverage/index.html
```

## Unit Tests

**Purpose**: Test pure functions and logic in isolation.

**Characteristics**:

- No file system access
- No database calls
- No network requests
- All external dependencies mocked

### Example: Math utilities

```typescript
// math.utilities.ts
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

// math.utilities.unit.test.ts
import { describe, it, expect } from "vitest";
import { degreesToRadians, normalizeAngle } from "./math.utilities";

describe("math utilities", () => {
  describe("degreesToRadians", () => {
    it("converts 0 degrees to 0 radians", () => {
      expect(degreesToRadians(0)).toBe(0);
    });

    it("converts 180 degrees to π radians", () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    });

    it("converts 360 degrees to 2π radians", () => {
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
    });
  });

  describe("normalizeAngle", () => {
    it("returns 0-359 for positive angles", () => {
      expect(normalizeAngle(45)).toBe(45);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
    });

    it("normalizes negative angles", () => {
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-360)).toBe(0);
    });
  });
});
```

### Mocking External Dependencies

```typescript
// api.ts
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// api.unit.test.ts
import { describe, it, expect, vi } from "vitest";
import { fetchUser } from "./api";

// Mock fetch globally
global.fetch = vi.fn();

describe("fetchUser", () => {
  it("fetches user by ID", async () => {
    const mockUser = { id: "123", name: "Alice" };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response);

    const user = await fetchUser("123");

    expect(fetch).toHaveBeenCalledWith("/api/users/123");
    expect(user).toStrictEqual(mockUser);
  });
});
```

## Integration Tests

**Purpose**: Test interactions with external systems (databases, files).

**Characteristics**:

- Real database connections (temporary test DB)
- Real file system operations (temp directories)
- Mocked network requests (external APIs)

### Example: Database operations (caelundas)

```typescript
// database.utilities.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import {
  initializeDatabase,
  upsertEvent,
  getAllEvents,
} from "./database.utilities";

describe("database utilities", () => {
  let db: Database;

  beforeEach(() => {
    // Create temporary in-memory database
    db = new Database(":memory:");
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  it("upserts events correctly", async () => {
    const event = {
      type: "conjunction",
      body1: "Sun",
      body2: "Moon",
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T01:00:00Z",
    };

    await upsertEvent(db, event);

    const events = getAllEvents(db);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject(event);
  });

  it("updates existing events", async () => {
    const event = {
      id: 1,
      type: "conjunction",
      body1: "Sun",
      body2: "Moon",
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T01:00:00Z",
    };

    await upsertEvent(db, event);
    await upsertEvent(db, { ...event, endTime: "2024-01-01T02:00:00Z" });

    const events = getAllEvents(db);
    expect(events).toHaveLength(1);
    expect(events[0]?.endTime).toBe("2024-01-01T02:00:00Z");
  });
});
```

### Supabase Integration Tests (lexico)

```typescript
// auth.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("user authentication", () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    // Use local Supabase instance
    supabase = createClient("http://localhost:54321", "test-anon-key");
  });

  it("creates user account", async () => {
    const { data, error } = await supabase.auth.signUp({
      email: "test@example.com",
      password: "password123",
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.email).toBe("test@example.com");
  });
});
```

## End-to-End Tests

**Purpose**: Test complete workflows with real external services.

**Characteristics**:

- Real network requests (NASA API, external services)
- Full application pipeline (input → output)
- Slow execution (network latency)

### Example: Ephemeris pipeline (caelundas)\*\*

```typescript
// main.end-to-end.test.ts
import { describe, it, expect } from "vitest";
import { generateCalendar } from "./main";

describe("ephemeris pipeline", () => {
  it("generates calendar for date range", async () => {
    const input = {
      startDate: "2024-01-01",
      endDate: "2024-01-07",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
      eventTypes: ["majorAspects", "phases"],
      outputFormat: "json" as const,
    };

    const output = await generateCalendar(input);

    expect(output).toBeDefined();
    expect(output.events).toBeInstanceOf(Array);
    expect(output.events.length).toBeGreaterThan(0);

    // Verify event structure
    const firstEvent = output.events[0];
    expect(firstEvent).toHaveProperty("type");
    expect(firstEvent).toHaveProperty("startTime");
  }, 60000); // 60s timeout for API calls
});
```

## Test Organization

### File Structure

```text
src/
├── math.utilities.ts
├── math.utilities.unit.test.ts       # Unit tests colocated
├── database.utilities.ts
├── database.utilities.integration.test.ts
└── main.ts
    └── main.end-to-end.test.ts
```

### Test Suites

Group related tests with `describe`:

```typescript
describe("user management", () => {
  describe("createUser", () => {
    it("creates user with valid data", () => {});
    it("throws error for invalid email", () => {});
  });

  describe("deleteUser", () => {
    it("deletes existing user", () => {});
    it("throws error for non-existent user", () => {});
  });
});
```

## Testing Best Practices

### Arrange-Act-Assert (AAA) Pattern

```typescript
it("calculates total price with tax", () => {
  // Arrange: Setup
  const items = [{ price: 10 }, { price: 20 }];
  const taxRate = 0.08;

  // Act: Execute
  const total = calculateTotal(items, taxRate);

  // Assert: Verify
  expect(total).toBe(32.4); // (10 + 20) * 1.08
});
```

### Test Independence

```typescript
// ❌ WRONG: Tests depend on order
describe("user tests", () => {
  let userId: string;

  it("creates user", () => {
    userId = createUser(); // Sets global state
  });

  it("deletes user", () => {
    deleteUser(userId); // Depends on previous test
  });
});

// ✅ CORRECT: Each test is independent
describe("user tests", () => {
  it("creates user", () => {
    const userId = createUser();
    expect(userId).toBeDefined();
    deleteUser(userId); // Cleanup
  });

  it("deletes user", () => {
    const userId = createUser(); // Setup
    deleteUser(userId);
    expect(getUser(userId)).toBeNull();
  });
});
```

### Descriptive Test Names

```typescript
// ❌ WRONG: Vague test names
it("works", () => {});
it("test 1", () => {});

// ✅ CORRECT: Descriptive names
it("returns empty array when no users exist", () => {});
it("throws ValidationError when email is invalid", () => {});
it("calculates total with 8% tax rate", () => {});
```

### Test Coverage Goals

| Type            | Coverage Target | Why                                |
| --------------- | --------------- | ---------------------------------- |
| **Unit**        | 80-100%         | Pure logic should be fully tested  |
| **Integration** | 50-70%          | Critical paths and edge cases      |
| **End-to-End**  | 20-30%          | Happy paths and critical workflows |

**Focus on critical paths** over 100% coverage.

## CI/CD Integration

Tests run automatically in GitHub Actions:

```bash
# .github/workflows/test-coverage.yml
- name: Run tests with coverage
  run: nx affected --target=vitest --coverage --base=${{ github.base_ref }}
```

See [github-actions.md](../documentation/github-actions.md) for CI/CD workflows.

## Vitest Configuration

See [vitest.md](../vitest.md) for detailed Vitest configuration and patterns.

## Summary

| Aspect       | Unit            | Integration         | E2E         |
| ------------ | --------------- | ------------------- | ----------- |
| **Scope**    | Single function | Multiple components | Full system |
| **I/O**      | Mocked          | Real (DB, files)    | Real (all)  |
| **Speed**    | < 100ms         | 1-2s                | 30-60s      |
| **Coverage** | 80-100%         | 50-70%              | 20-30%      |
| **Run**      | Every commit    | Pre-push            | CI/CD       |

**Key Principles**:

1. **Test at the right level**: Unit for logic, integration for I/O, E2E for workflows
2. **Independent tests**: No shared state between tests
3. **Descriptive names**: Test name = documentation
4. **Fast feedback**: Unit tests run in < 1s for rapid iteration

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [vitest.md](../vitest.md) - Configuration and patterns
- [Testing Library](https://testing-library.com/) - React component testing
- [caelundas Tests](../../applications/caelundas/src/) - Example test suite
