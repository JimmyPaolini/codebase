import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderConfigurationService } from "./render-configuration.service";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
} from "./configuration.types";

const LIMIT_ROW: ConfiguredLimitRow = {
  directory: "packages/logger",
  label: "—",
  metric: "Compiled JavaScript.size",
  path: "packages/logger/codometer.config.ts",
  severity: "fail",
  value: "6.00 kB",
};

const UNREADABLE: ConfiguredDirectory = {
  configuration: undefined,
  directory: "packages/broken",
  error: "Cannot find module",
  path: "packages/broken/codometer.config.ts",
};

describe(RenderConfigurationService, () => {
  let service: RenderConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderConfigurationService],
    }).compile();

    service = await module.resolve(RenderConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("renders the limits as a markdown table naming the file each came from", () => {
    const document = service.render({
      described: [],
      format: "markdown",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
    });

    expect(document).toContain("| Directory | Metric | Label |");
    expect(document).toContain("`packages/logger/codometer.config.ts`");
    expect(document).toContain("6.00 kB");
  });

  it("says so plainly when nothing is configured rather than rendering an empty table", () => {
    expect(
      service.render({
        described: [],
        format: "markdown",
        limitRows: [],
        limitsOnly: true,
      }),
    ).toContain("No limits are configured.");
  });

  it("reports a configuration that could not be read instead of omitting it", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
    });

    expect(document).toContain("packages/broken");
    expect(document).toContain("Could not be read: Cannot find module");
  });

  it("emits only the limits under --limits when asked for json", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "json",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
    });

    expect(JSON.parse(document)).toStrictEqual({ limits: [LIMIT_ROW] });
  });
});
