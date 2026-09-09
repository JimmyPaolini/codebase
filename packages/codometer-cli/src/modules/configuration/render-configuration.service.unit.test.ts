import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderConfigurationService } from "./render-configuration.service";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
} from "./configuration.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

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
      rootError: undefined,
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
        rootError: undefined,
      }),
    ).toContain("No limits are configured.");
  });

  it("reports a configuration that could not be read instead of omitting it", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("packages/broken");
    expect(document).toContain("Could not be read: Cannot find module");
  });

  it("lists what each configuration resolved to when not limited to limits", () => {
    const document = service.render({
      described: [
        {
          configuration: {
            defaultInput: undefined,
            exclude: [],
            excludeFrom: [".codometerignore"],
            format: "json",
            inputs: [
              {
                analyses: ["size"],
                compression: "gzip",
                directory: "../..",
                exclude: [],
                include: ["dist/**/*.js"],
                name: "Compiled JavaScript",
              },
            ],
            limits: [],
            outputs: [
              {
                custom: [
                  {
                    color: "166534",
                    comment: undefined,
                    group: "typescript",
                    label: "Service Files",
                    patterns: ["**/*.service.ts"],
                  },
                ],
                indentation: 2,
                path: "codometer-report.json",
                type: "json",
              },
            ],
            python: { command: "uv run python" },
          } satisfies ResolvedCodometerConfiguration,
          directory: "packages/logger",
          error: undefined,
          path: "packages/logger/codometer.config.ts",
        },
      ],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("- Inputs: Compiled JavaScript");
    expect(document).toContain("- Custom statistics: Service Files");
    expect(document).toContain("`uv run python`");
    expect(document).toContain("- Exclude files: .codometerignore");
  });

  it("renders an em dash for a list a configuration leaves empty", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("Could not be read");
  });

  it("emits every configuration under json when not limited to limits", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "json",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    // `JSON.stringify` drops an undefined value rather than emitting it, so
    // the unreadable entry arrives without its absent configuration.
    expect(JSON.parse(document)).toStrictEqual({
      configurations: [
        {
          directory: UNREADABLE.directory,
          error: UNREADABLE.error,
          path: UNREADABLE.path,
        },
      ],
      rootError: null,
    });
  });

  it("says the walk root answered with nothing, above the limits it still found", () => {
    const document = service.render({
      described: [],
      format: "markdown",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
      rootError: "needs a format",
    });

    expect(document).toContain(
      "Nothing answered for the walk root, so the built-in exclusions were used instead: needs a format",
    );
    expect(document).toContain("6.00 kB");
  });

  it("emits only the limits under --limits when asked for json", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "json",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
      rootError: undefined,
    });

    expect(JSON.parse(document)).toStrictEqual({
      limits: [LIMIT_ROW],
      rootError: null,
    });
  });
});
