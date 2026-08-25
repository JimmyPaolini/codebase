import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { AddressService } from "./address.service";

import type { DiscoveredCallable } from "./callables.types";

const WORKSPACE_ROOT = "/workspace";

/** Builds a `callablesById` map from a list of discovered callables. */
function toMap(
  callables: readonly DiscoveredCallable[],
): ReadonlyMap<string, DiscoveredCallable> {
  return new Map(callables.map((callable) => [callable.node.id, callable]));
}

describe(AddressService, () => {
  let service: AddressService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [AddressService],
    }).compile();

    service = await module.resolve(AddressService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("resolves an address matching exactly one callable", () => {
    const callable = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#0",
      location: buildSourceLocation({
        filePath: "packages/example/src/foo.service.ts",
      }),
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar",
      callablesById: toMap([callable]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution).toStrictEqual({
      id: "packages/example/src/foo.service.ts#0",
      kind: "resolved",
    });
  });

  it("resolves a file path given relative to the workspace root", () => {
    const callable = buildDiscoveredCallable({
      displayName: "FooService.bar",
      location: buildSourceLocation({
        filePath: "packages/example/src/foo.service.ts",
      }),
    });

    const resolution = service.resolve({
      address: `${WORKSPACE_ROOT}/packages/example/src/foo.service.ts#FooService.bar`,
      callablesById: toMap([callable]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("resolved");
  });

  it("reports an address with no '#' as invalid", () => {
    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("invalid");
  });

  it("reports an address missing a file path as invalid", () => {
    const resolution = service.resolve({
      address: "#FooService.bar",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("invalid");
  });

  it("reports an address missing a symbol path as invalid", () => {
    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("invalid");
  });

  it("reports an address matching nothing as not found", () => {
    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar",
      callablesById: toMap([]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("not-found");
  });

  it("names every candidate when an address matches more than one declaration", () => {
    const location = buildSourceLocation({
      filePath: "packages/example/src/foo.service.ts",
    });
    const first = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#0",
      location: { ...location, line: 3 },
    });
    const second = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#1",
      location: { ...location, line: 8 },
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar",
      callablesById: toMap([first, second]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("ambiguous");
    expect(
      resolution.kind === "ambiguous" && resolution.candidates,
    ).toHaveLength(2);
  });

  it("treats a non-numeric ':' suffix as part of the qualified name", () => {
    const callable = buildDiscoveredCallable({
      displayName: "FooService.bar:baz",
      location: buildSourceLocation({
        filePath: "packages/example/src/foo.service.ts",
      }),
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar:baz",
      callablesById: toMap([callable]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution.kind).toBe("resolved");
  });

  it("disambiguates with a ':<line>' suffix", () => {
    const location = buildSourceLocation({
      filePath: "packages/example/src/foo.service.ts",
    });
    const first = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#0",
      location: { ...location, line: 3 },
    });
    const second = buildDiscoveredCallable({
      displayName: "FooService.bar",
      id: "packages/example/src/foo.service.ts#1",
      location: { ...location, line: 8 },
    });

    const resolution = service.resolve({
      address: "packages/example/src/foo.service.ts#FooService.bar:8",
      callablesById: toMap([first, second]),
      workspaceRoot: WORKSPACE_ROOT,
    });

    expect(resolution).toStrictEqual({
      id: "packages/example/src/foo.service.ts#1",
      kind: "resolved",
    });
  });
});
