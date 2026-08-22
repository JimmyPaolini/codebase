import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogManifestsModule } from "./modules/catalog-manifests/catalog-manifests.module";
import type { PullRequestMetadataModule } from "./modules/pull-request-metadata/pull-request-metadata.module";
import type { LoggerService } from "@codebase/logger";

type CommandFactoryRun = (
  module: unknown,
  options: { bufferLogs: boolean; logger: unknown },
) => Promise<void>;

const run = vi.fn<CommandFactoryRun>().mockResolvedValue(undefined);
const loggerServiceMock = createMock<LoggerService>();
const catalogManifestsModuleMock = createMock<CatalogManifestsModule>();
const pullRequestMetadataModuleMock = createMock<PullRequestMetadataModule>();

vi.mock("nest-commander", () => ({
  CommandFactory: {
    run,
  },
}));

vi.mock("@codebase/logger", () => ({
  // `main.module` imports `LoggerModule` from the same specifier, so the mock
  // has to stand in for the whole package, not just the service.
  LoggerModule: function LoggerModule() {},
  LoggerService: function LoggerService() {
    return loggerServiceMock;
  },
}));

// Mocked so that bootstrapping never reaches the real commands, which extend a
// `nest-commander` class this suite has replaced.
vi.mock("./modules/catalog-manifests/catalog-manifests.module", () => ({
  CatalogManifestsModule: function CatalogManifestsModule() {
    return catalogManifestsModuleMock;
  },
}));

vi.mock("./modules/pull-request-metadata/pull-request-metadata.module", () => ({
  PullRequestMetadataModule: function PullRequestMetadataModule() {
    return pullRequestMetadataModuleMock;
  },
}));

describe("main bootstrap", () => {
  beforeEach(() => {
    run.mockClear();
    loggerServiceMock.setContext.mockClear();
    vi.resetModules();
  });

  it("runs the command factory with a configured logger", async () => {
    expect.hasAssertions();

    await import("./main");

    expect(loggerServiceMock.setContext).toHaveBeenCalledWith("CommandFactory");
    expect(run).toHaveBeenCalledTimes(1);

    const firstCall = run.mock.calls[0];

    expect(firstCall).toBeDefined();
    expect(firstCall?.[1]).toStrictEqual(
      expect.objectContaining({ bufferLogs: true }),
    );
  });
});
