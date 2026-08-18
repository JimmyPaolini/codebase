import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  FIXTURE_ROOT,
} from "../../../testing/programs";

import { EdgesService } from "./edges.service";

import type { CallEdge, UnresolvedCall } from "@callidescope/configuration";

/** Renders the graph as `caller -> callee` pairs, for readable assertions. */
function readCalls(files: Record<string, string>): string[] {
  const { displayNames, edges } = traceFixture(files);

  return edges.map(
    (edge) =>
      `${displayNames.get(edge.callerId) ?? "?"} -> ${displayNames.get(edge.calleeId) ?? "?"}`,
  );
}

/** Builds the graph for a set of in-memory files. */
function traceFixture(files: Record<string, string>): {
  displayNames: Map<string, string>;
  edges: readonly CallEdge[];
  unresolved: readonly UnresolvedCall[];
} {
  const projectProgram = buildFixtureProgram(files);
  const services = buildFixtureServices({ projectProgram });
  const collection = collectFixtureCallables({ projectProgram, services });
  const collected = services.edges.build({
    callablesById: collection.byId,
    includeConstructorEdges: true,
    workspaceRoot: FIXTURE_ROOT,
  });

  return {
    displayNames: new Map(
      [...collection.byId].map(([id, callable]) => [
        id,
        callable.node.displayName,
      ]),
    ),
    edges: collected.edges,
    unresolved: collected.unresolvedCalls,
  };
}

describe(EdgesService, () => {
  let service: EdgesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [EdgesService],
    }).compile();

    service = await module.resolve(EdgesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // Each case below is one row of the resolution table: the shapes a call can
  // be written in, and what the tool is expected to make of each.

  it("resolves a direct call to a function in the same file", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        function helper(): void {}
        export function entry(): void { helper(); }
      `,
    });

    expect(calls).toContain("entry -> helper");
  });

  it("resolves a call to a function imported from another file", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        export function helper(): void {}
      `,
      "packages/example/src/modules/b/b.service.ts": `
        import { helper } from "../a/a.service";
        export function entry(): void { helper(); }
      `,
    });

    expect(calls).toContain("entry -> helper");
  });

  it("marks a call reached through a re-export as an alias", () => {
    const { displayNames, edges } = traceFixture({
      "packages/example/src/index.ts": `
        export { helper } from "./modules/a/a.service";
      `,
      "packages/example/src/modules/a/a.service.ts": `
        export function helper(): void {}
      `,
      "packages/example/src/modules/b/b.service.ts": `
        import { helper } from "../../index";
        export function entry(): void { helper(); }
      `,
    });

    const edge = edges.find(
      (candidate) => displayNames.get(candidate.callerId) === "entry",
    );

    expect(edge?.resolution).toBe("alias");
  });

  // 🏗 The case the tool exists for.

  it("resolves a call on a constructor-injected dependency", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        export class Repository {
          public find(): void {}
        }
      `,
      "packages/example/src/modules/b/b.service.ts": `
        import { Repository } from "../a/a.service";
        export class Service {
          constructor(private readonly repository: Repository) {}
          public load(): void { this.repository.find(); }
        }
      `,
    });

    expect(calls).toContain("Service.load -> Repository.find");
  });

  it("resolves a call on a class-typed local variable", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        class Repository { public find(): void {} }
        export function entry(): void {
          const repository = new Repository();
          repository.find();
        }
      `,
    });

    expect(calls).toContain("entry -> Repository.find");
  });

  it("resolves an interface member to a structural implementation", () => {
    // Deliberately no \`implements\` clause and an arrow-typed member: this is
    // how this repository writes providers, and a nominal-only index finds
    // none of them.
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        export class BookProvider {
          public ingest = (): void => { this.parse(); };
          public parse(): void {}
        }
      `,
      "packages/example/src/modules/a/a.types.ts": `
        export interface Provider { ingest: () => void; }
      `,
      "packages/example/src/modules/b/b.service.ts": `
        import type { Provider } from "../a/a.types";
        export function entry(provider: Provider): void { provider.ingest(); }
      `,
    });

    expect(calls).toContain("entry -> BookProvider.ingest");
  });

  it("resolves an abstract method to its concrete override", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        export abstract class Base { public abstract run(): void; }
        export class Concrete extends Base { public run(): void {} }
      `,
      "packages/example/src/modules/b/b.service.ts": `
        import type { Base } from "../a/a.service";
        export function entry(base: Base): void { base.run(); }
      `,
    });

    expect(calls).toContain("entry -> Concrete.run");
  });

  it("marks a super call as reaching the base declaration", () => {
    const { displayNames, edges } = traceFixture({
      "packages/example/src/modules/a/a.service.ts": `
        export class Base { public run(): void {} }
        export class Derived extends Base {
          public run(): void { super.run(); }
        }
      `,
    });

    const edge = edges.find(
      (candidate) => displayNames.get(candidate.callerId) === "Derived.run",
    );

    expect(edge?.resolution).toBe("super");
  });

  it("counts a constructor with a body as a frame", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        class Repository {
          constructor() { this.warm(); }
          public warm(): void {}
        }
        export function entry(): void { new Repository(); }
      `,
    });

    expect(calls).toContain("entry -> Repository.constructor");
  });

  it("records a function literal argument as its own frame", () => {
    const { displayNames, edges } = traceFixture({
      "packages/example/src/modules/a/a.service.ts": `
        function each(callback: () => void): void { callback(); }
        function work(): void {}
        export function entry(): void { each(() => { work(); }); }
      `,
    });

    const callbackEdge = edges.find(
      (candidate) => candidate.resolution === "callback",
    );

    expect(callbackEdge).toBeDefined();
    expect(displayNames.get(callbackEdge?.callerId ?? "")).toBe("entry");
  });

  it("attributes a callback's calls to the callback, not its container", () => {
    const calls = readCalls({
      "packages/example/src/modules/a/a.service.ts": `
        function each(callback: () => void): void { callback(); }
        function work(): void {}
        export function entry(): void { each(() => { work(); }); }
      `,
    });

    // The call to `work` happens inside the literal, so `entry` must not own
    // it — otherwise a shallow orchestrator inherits every callback's depth.
    expect(calls).not.toContain("entry -> work");
  });

  // 🚧 Shapes nothing can follow.

  it("records a computed member call as unresolvable", () => {
    const { unresolved } = traceFixture({
      "packages/example/src/modules/a/a.service.ts": `
        export function entry(target: Record<string, () => void>, key: string): void {
          target[key]();
        }
      `,
    });

    expect(unresolved.map((call) => call.reason)).toContain("computed-member");
  });

  it("records a call through a function-typed parameter as unresolvable", () => {
    const { unresolved } = traceFixture({
      "packages/example/src/modules/a/a.service.ts": `
        export function entry(callback: () => void): void { callback(); }
      `,
    });

    expect(unresolved.map((call) => call.reason)).toContain("dynamic-value");
  });

  it("drops an interface member when too many classes implement it", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        export interface Runner { run: () => void; }
        export class OneRunner { public run = (): void => {}; }
        export class TwoRunner { public run = (): void => {}; }
        export class ThreeRunner { public run = (): void => {}; }
      `,
      "packages/example/src/modules/b/b.service.ts": `
        import type { Runner } from "../a/a.service";
        export function entry(runner: Runner): void { runner.run(); }
      `,
    });
    const services = buildFixtureServices({
      maximumFanOut: 2,
      projectProgram,
    });
    const collection = collectFixtureCallables({ projectProgram, services });
    const collected = services.edges.build({
      callablesById: collection.byId,
      includeConstructorEdges: true,
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(collected.unresolvedCalls.map((call) => call.reason)).toContain(
      "fan-out-exceeded",
    );
  });

  it("does not record an edge for a constructor when they are disabled", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        class Repository { constructor() { this.warm(); } public warm(): void {} }
        export function entry(): void { new Repository(); }
      `,
    });
    const services = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({ projectProgram, services });
    const collected = services.edges.build({
      callablesById: collection.byId,
      includeConstructorEdges: false,
      workspaceRoot: FIXTURE_ROOT,
    });
    const names = new Map(
      [...collection.byId].map(([id, callable]) => [
        id,
        callable.node.displayName,
      ]),
    );

    expect(
      collected.edges.map(
        (edge) =>
          `${names.get(edge.callerId) ?? "?"} -> ${names.get(edge.calleeId) ?? "?"}`,
      ),
    ).not.toContain("entry -> Repository.constructor");
  });

  it("records no edge to a callee that was never collected", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts":
        "export function helper(): void {}",
      "packages/example/src/modules/b/b.service.ts": `
        import { helper } from "../a/a.service";
        export function entry(): void { helper(); }
      `,
    });
    const services = buildFixtureServices({ projectProgram });
    const collection = services.callables.collect({
      // The callee's whole file is excluded, so the call resolves to a
      // declaration no callable was described for.
      fileFilter: { isExcluded: (filePath) => filePath.includes("/a/") },
      includeTests: true,
      ownerByFilePath: new Map(
        [...projectProgram.ownedFilePaths].map((filePath) => [
          filePath,
          projectProgram,
        ]),
      ),
      workspaceRoot: FIXTURE_ROOT,
    });
    const collected = services.edges.build({
      callablesById: collection.byId,
      includeConstructorEdges: true,
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(collected.edges).toStrictEqual([]);
  });

  it("reports the display name of a discovered callable", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/modules/a/a.service.ts": `
        export class Service { public load(): void {} }
      `,
    });
    const services = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({ projectProgram, services });
    const callable = [...collection.byId.values()][0];

    expect(callable).toBeDefined();
    expect(
      callable === undefined
        ? undefined
        : services.edges.readDisplayName(callable),
    ).toBe("Service.load");
  });
});
