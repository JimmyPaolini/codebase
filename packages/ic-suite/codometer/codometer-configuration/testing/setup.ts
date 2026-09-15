import "reflect-metadata";

import fs from "node:fs";

import { beforeAll, beforeEach, vi } from "vitest";

import { assertFixtureIsOutsideWorkspace } from "./workspace-fixture-guard";

import type { createJiti, Jiti, JitiOptions } from "jiti";

/**
 * Wraps a jiti instance so every way it can be asked to evaluate a module runs
 * the guard first.
 *
 * All four entry points, not just `import`: a jiti instance is callable — the
 * synchronous CommonJS form — and carries `evalModule` beside the asynchronous
 * `import`. Guarding only the one the loader happens to call today would leave
 * the guard silently inapplicable the day it calls another.
 */
function guardJiti(jiti: Jiti): Jiti {
  return new Proxy(jiti, {
    apply(target, thisArgument: unknown, args: readonly unknown[]): unknown {
      const [identifier] = args;

      if (typeof identifier === "string") {
        assertFixtureIsOutsideWorkspace(identifier);
      }

      return Reflect.apply(target, thisArgument, args);
    },
    get(target, property): unknown {
      if (property !== "import") {
        return Reflect.get(target, property);
      }

      return async (
        identifier: string,
        importOptions?: Parameters<Jiti["import"]>[1],
      ): Promise<unknown> => {
        assertFixtureIsOutsideWorkspace(identifier);

        return target.import(identifier, importOptions);
      };
    },
  });
}

/**
 * Forbids a fixture that makes `jiti` evaluate this workspace's own source,
 * which would re-evaluate every package it reaches in a second module registry
 * and silently corrupt this package's v8 coverage.
 *
 * Wrapped here rather than asserted per test because the corruption has no
 * symptom at the point it happens: a fixture reintroducing it passes, and what
 * fails is a coverage gate on some later, unrelated branch. Both the named and
 * the default export are wrapped, since `createJiti` is reachable either way.
 */
vi.mock("jiti", async (importOriginal) => {
  const original = await importOriginal<{ createJiti: typeof createJiti }>();

  const createGuardedJiti = (identifier: string, options?: JitiOptions): Jiti =>
    guardJiti(original.createJiti(identifier, options));

  return {
    ...original,
    createJiti: createGuardedJiti,
    default: createGuardedJiti,
  };
});

beforeAll(() => {
  const outputDirectory = "./output";
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
