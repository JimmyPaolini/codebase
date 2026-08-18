import {
  ConfigurationService,
  InputService,
  TemplateDiscoveryMatchingService,
  TemplateDiscoveryService,
} from "@conformetry/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ExplainCommand } from "./explain.command";

import type {
  ConformetryConfiguration,
  InstanceCandidate,
  ScoredTemplate,
  TemplateDefinition,
} from "@conformetry/configuration";
import type { DeepMocked } from "@golevelup/ts-vitest";

const CONFIGURATION: ConformetryConfiguration = [
  {
    inputs: {},
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "command-module",
    templatePath: "configuration/templates/command-module",
  },
];

const CANDIDATE: InstanceCandidate = {
  instancePath: "/w/packages/widgets/src/modules",
  nameStem: "gears",
};

const COMMAND_TEMPLATE: TemplateDefinition = {
  directoryPath: "/w/configuration/templates/command-module",
  filePaths: ["/w/a.ts", "/w/b.ts", "/w/c.ts", "/w/d.ts"],
  name: "command-module",
};

const SERVICE_TEMPLATE: TemplateDefinition = {
  directoryPath: "/w/configuration/templates/service-module",
  filePaths: ["/w/a.ts", "/w/b.ts"],
  name: "service-module",
};

const WINNER: ScoredTemplate = {
  matchedFileCount: 4,
  ratio: 1,
  template: COMMAND_TEMPLATE,
};

const LOSER: ScoredTemplate = {
  matchedFileCount: 1,
  ratio: 0.5,
  template: SERVICE_TEMPLATE,
};

/** Standard output collected during one test. */
const output: string[] = [];

/** Every line the command wrote, joined so a single assertion can span lines. */
const written = (): string => output.join("\n");

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(ExplainCommand, () => {
  let command: ExplainCommand;
  let configurationService: DeepMocked<ConfigurationService>;
  let matchingService: DeepMocked<TemplateDiscoveryMatchingService>;
  let templateDiscoveryService: DeepMocked<TemplateDiscoveryService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExplainCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: TemplateDiscoveryMatchingService,
          useValue: createMock<TemplateDiscoveryMatchingService>(),
        },
        {
          provide: TemplateDiscoveryService,
          useValue: createMock<TemplateDiscoveryService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ExplainCommand);
    configurationService = await module.resolve(ConfigurationService);
    matchingService = await module.resolve(TemplateDiscoveryMatchingService);
    templateDiscoveryService = await module.resolve(TemplateDiscoveryService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    output.length = 0;
    vi.spyOn(console, "info").mockImplementation((...data: unknown[]) => {
      output.push(data.map(String).join(" "));
    });
    configurationService.loadConformetryConfiguration.mockResolvedValue(
      CONFIGURATION,
    );
    templateDiscoveryService.collectTemplates.mockReturnValue([
      COMMAND_TEMPLATE,
      SERVICE_TEMPLATE,
    ]);
    templateDiscoveryService.resolveCandidates.mockReturnValue([CANDIDATE]);
    templateDiscoveryService.resolveInstances.mockReturnValue({
      matched: [
        {
          candidate: CANDIDATE,
          matchedFileCount: 4,
          substitutions: {},
          template: COMMAND_TEMPLATE,
        },
      ],
      unmatched: [],
    });
    matchingService.buildSubstitutions.mockReturnValue({});
    matchingService.scoreTemplates.mockReturnValue([WINNER, LOSER]);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      providers: [
        ExplainCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: TemplateDiscoveryMatchingService,
          useValue: createMock<TemplateDiscoveryMatchingService>(),
        },
        {
          provide: TemplateDiscoveryService,
          useValue: createMock<TemplateDiscoveryService>(),
        },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ExplainCommand");
  });

  describe("run", () => {
    it("refuses to run without a path", async () => {
      await expect(command.run([], {})).rejects.toThrow("explain needs a path");
    });

    it("expands the given path the way an instance glob would", async () => {
      await command.run(["packages/widgets/src/modules/gears"], {});

      expect(templateDiscoveryService.resolveCandidates).toHaveBeenCalledWith(
        expect.objectContaining({
          patterns: ["packages/widgets/src/modules/gears"],
        }),
      );
    });

    it("names the template a clear match was attributed to", async () => {
      await command.run(["packages/widgets/src/modules/gears"], {});

      expect(written()).toContain("command-module");
      expect(written()).toContain("gears");
    });

    it("reports the overlap of every template it considered", async () => {
      await command.run(["packages/widgets/src/modules/gears"], {});
      const lines = written();

      expect(lines).toContain("4/4");
      expect(lines).toContain("1/2");
      expect(lines).toContain("service-module");
    });

    it("distinguishes an ambiguous outcome and names every rival", async () => {
      templateDiscoveryService.resolveInstances.mockReturnValue({
        matched: [],
        unmatched: [
          {
            candidate: CANDIDATE,
            candidateTemplateNames: ["command-module", "service-module"],
            reason: "ambiguous",
          },
        ],
      });

      await command.run(["packages/widgets/src/modules/gears"], {});

      expect(written()).toContain("ambiguous");
      expect(written()).toContain("command-module, service-module");
    });

    it("distinguishes an unmatched outcome from an ambiguous one", async () => {
      templateDiscoveryService.resolveInstances.mockReturnValue({
        matched: [],
        unmatched: [
          {
            candidate: CANDIDATE,
            candidateTemplateNames: [],
            reason: "no-match",
          },
        ],
      });
      matchingService.scoreTemplates.mockReturnValue([]);

      await command.run(["packages/widgets/src/modules/gears"], {});

      expect(written()).not.toContain("ambiguous");
      expect(written()).toContain("no template");
      expect(written()).toContain("nothing overlapped");
    });

    it("says so when the path is not an instance at all", async () => {
      templateDiscoveryService.resolveCandidates.mockReturnValue([]);

      await command.run(["packages/widgets/nowhere"], {});

      expect(written()).toContain("No instance was found");
    });

    it("reads the configuration path the caller named", async () => {
      await command.run(["packages/widgets/src/modules/gears"], {
        config: "custom/conformetry.config.ts",
      });

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });
  });

  describe("machine-readable output", () => {
    it("writes parseable output carrying the verdict and the ranking", async () => {
      await command.run(["packages/widgets/src/modules/gears"], { json: true });

      expect(JSON.parse(written())).toStrictEqual([
        {
          considered: [
            {
              matchedFileCount: 4,
              name: "command-module",
              ratio: 1,
              templateFileCount: 4,
            },
            {
              matchedFileCount: 1,
              name: "service-module",
              ratio: 0.5,
              templateFileCount: 2,
            },
          ],
          instancePath: "/w/packages/widgets/src/modules",
          nameStem: "gears",
          templates: ["command-module"],
          verdict: "matched",
        },
      ]);
    });

    it("writes an empty collection when the path is not an instance", async () => {
      templateDiscoveryService.resolveCandidates.mockReturnValue([]);

      await command.run(["packages/widgets/nowhere"], { json: true });

      expect(JSON.parse(written())).toStrictEqual([]);
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseJson()).toBe(true);
    });
  });
});
