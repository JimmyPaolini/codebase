import path from "node:path";

import {
  type CallidescopeConfiguration,
  type CallidescopeLimits,
  ConfigurationService,
  DEFAULT_MAXIMUM_DEPTH,
  ProjectConfigurationService,
  type ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import { FileFilterService, WorkspaceService } from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { LimitsService } from "./limits.service";

/** The workspace configuration file this suite's runs are pointed at. */
const WORKSPACE_CONFIGURATION_PATH = path.join(
  process.cwd(),
  "configuration/callidescope.config.ts",
);

/** A project that declares limits of its own. */
const DECLARING_PROJECT = "packages/alpha";

/** A project with no configuration file at all. */
const INHERITING_PROJECT = "packages/beta";

/** The configuration file `packages/alpha` declares its limits in. */
const DECLARING_PROJECT_CONFIGURATION_PATH = path.join(
  process.cwd(),
  DECLARING_PROJECT,
  "callidescope.config.ts",
);

/** A resolved configuration with every field a run reads filled in. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: {
      maximumDepth: DEFAULT_MAXIMUM_DEPTH,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
      projectReadmes: undefined,
    },
    ...overrides,
  };
}

/**
 * One loaded configuration file, as the loader answers with it.
 *
 * The resolved limits are derived from the authored ones rather than supplied
 * beside them, so a fixture cannot pair a number a file wrote with a different
 * number resolution reports — which is the very disagreement the workspace row
 * is built to survive. `maximumDepth` is defaulted exactly as resolution
 * defaults it; `maximumBreadth` has no default and stays absent.
 */
function buildLoadedFile(args: {
  authored: CallidescopeConfiguration;
  path: string | undefined;
}): {
  authored: CallidescopeConfiguration;
  configuration: ResolvedCallidescopeConfiguration;
  path: string | undefined;
} {
  const authoredLimits: CallidescopeLimits = args.authored.limits ?? {};

  return {
    authored: args.authored,
    configuration: buildConfiguration({
      limits: {
        ...buildConfiguration().limits,
        maximumBreadth: authoredLimits.maximumBreadth,
        maximumDepth: authoredLimits.maximumDepth ?? DEFAULT_MAXIMUM_DEPTH,
      },
    }),
    path: args.path,
  };
}

describe(LimitsService, () => {
  let configurationService: ReturnType<typeof createMock<ConfigurationService>>;
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let service: LimitsService;
  let fileFilterService: ReturnType<typeof createMock<FileFilterService>>;
  let workspaceService: ReturnType<typeof createMock<WorkspaceService>>;

  /** Declares which projects the walk finds, in the order it finds them. */
  function discover(projects: readonly string[]): void {
    workspaceService.discoverProjects.mockReturnValue(
      projects.map((project) => ({
        configurationPath: path.join(process.cwd(), project, "tsconfig.json"),
        hasPackageManifest: true,
        name: project,
        root: project,
      })),
    );
  }

  // The real limit resolver, mocked only where it reaches the filesystem: a
  // listing that resolved inheritance its own way could disagree with the gate
  // about the same number, so the suite asserts the one resolver's answer.
  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    logger = createMock<LoggerService>();
    fileFilterService = createMock<FileFilterService>();
    workspaceService = createMock<WorkspaceService>();

    const module = await Test.createTestingModule({
      providers: [
        LimitsService,
        ProjectConfigurationService,
        { provide: ConfigurationService, useValue: configurationService },
        { provide: LoggerService, useValue: logger },
        { provide: FileFilterService, useValue: fileFilterService },
        { provide: WorkspaceService, useValue: workspaceService },
      ],
    }).compile();

    service = await module.resolve(LimitsService);
  });

  // The service holds no state, so one instance serves the suite; what each
  // test needs fresh is what the filesystem answers with.
  beforeEach(() => {
    configurationService.findConfigurationFileAt.mockReset();
    configurationService.loadConfigurationFile.mockReset();
    logger.info.mockClear();
    fileFilterService.buildFileFilter.mockReset();
    workspaceService.discoverProjects.mockReset();

    fileFilterService.buildFileFilter.mockReturnValue({
      isExcluded: () => false,
    });
    discover([DECLARING_PROJECT, INHERITING_PROJECT]);

    configurationService.loadConfigurationFile.mockResolvedValue(
      buildLoadedFile({
        authored: { limits: { maximumDepth: 17 } },
        path: WORKSPACE_CONFIGURATION_PATH,
      }),
    );
    configurationService.findConfigurationFileAt.mockImplementation(
      (directory: string) =>
        directory === path.join(process.cwd(), DECLARING_PROJECT)
          ? DECLARING_PROJECT_CONFIGURATION_PATH
          : undefined,
    );
  });

  /** Answers the declaring project's own file after the workspace's. */
  function declareProjectLimits(limits: CallidescopeLimits): void {
    configurationService.loadConfigurationFile
      .mockResolvedValueOnce(
        buildLoadedFile({
          authored: { limits: { maximumDepth: 17 } },
          path: WORKSPACE_CONFIGURATION_PATH,
        }),
      )
      .mockResolvedValueOnce(
        buildLoadedFile({
          authored: { limits },
          path: DECLARING_PROJECT_CONFIGURATION_PATH,
        }),
      );
  }

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("names the workspace default declared, in the file it is written in", async () => {
    discover([]);

    const rows = await service.list({});

    expect(rows).toStrictEqual([
      {
        limit: "maximumDepth",
        origin: "declared",
        path: "configuration/callidescope.config.ts",
        project: undefined,
        value: 17,
      },
      {
        limit: "maximumBreadth",
        origin: undefined,
        path: undefined,
        project: undefined,
        value: undefined,
      },
    ]);
  });

  it("claims no file for a workspace that has no configuration at all", async () => {
    discover([]);
    configurationService.loadConfigurationFile.mockResolvedValue(
      buildLoadedFile({ authored: {}, path: undefined }),
    );

    const rows = await service.list({});

    expect(rows).toStrictEqual([
      {
        limit: "maximumDepth",
        origin: undefined,
        path: undefined,
        project: undefined,
        value: DEFAULT_MAXIMUM_DEPTH,
      },
      {
        limit: "maximumBreadth",
        origin: undefined,
        path: undefined,
        project: undefined,
        value: undefined,
      },
    ]);
  });

  // The row every other row inherits from, and the one case where a path alone
  // would lie: `resolveLimits` stamps the workspace file's path on a depth that
  // file never wrote, because resolution defaults it for everyone.
  it("claims no file for a limit the workspace file never wrote itself", async () => {
    discover([]);
    configurationService.loadConfigurationFile.mockResolvedValue(
      buildLoadedFile({
        authored: { excludeFrom: ["configuration/.callidescopeignore"] },
        path: WORKSPACE_CONFIGURATION_PATH,
      }),
    );

    const rows = await service.list({});

    expect(rows).toStrictEqual([
      {
        limit: "maximumDepth",
        origin: undefined,
        path: undefined,
        project: undefined,
        value: DEFAULT_MAXIMUM_DEPTH,
      },
      {
        limit: "maximumBreadth",
        origin: undefined,
        path: undefined,
        project: undefined,
        value: undefined,
      },
    ]);
  });

  // A workspace that omits a depth still hands every project one, and that row
  // is `inherited` — the number is real, only its authorship is not, so the
  // row keeps the number and names no file. The workspace's own row for the
  // same limit says exactly the same thing, which is the point: two rows about
  // one number cannot disagree about which file wrote it.
  it("names no file on a project inheriting an un-authored limit", async () => {
    configurationService.loadConfigurationFile.mockResolvedValue(
      buildLoadedFile({ authored: {}, path: WORKSPACE_CONFIGURATION_PATH }),
    );

    const rows = await service.list({});

    expect(
      rows.filter((row) => row.project === INHERITING_PROJECT),
    ).toStrictEqual([
      {
        limit: "maximumDepth",
        origin: "inherited",
        path: undefined,
        project: INHERITING_PROJECT,
        value: DEFAULT_MAXIMUM_DEPTH,
      },
      {
        limit: "maximumBreadth",
        origin: undefined,
        path: undefined,
        project: INHERITING_PROJECT,
        value: undefined,
      },
    ]);
  });

  it("names a project with no configuration file as inheriting the workspace's", async () => {
    const rows = await service.list({});

    expect(
      rows.filter((row) => row.project === INHERITING_PROJECT),
    ).toStrictEqual([
      {
        limit: "maximumDepth",
        origin: "inherited",
        path: "configuration/callidescope.config.ts",
        project: INHERITING_PROJECT,
        value: 17,
      },
      {
        limit: "maximumBreadth",
        origin: undefined,
        path: undefined,
        project: INHERITING_PROJECT,
        value: undefined,
      },
    ]);
  });

  it("names a project that declared both limits as declaring them, in its own file", async () => {
    declareProjectLimits({ maximumBreadth: 6, maximumDepth: 10 });

    const rows = await service.list({});

    expect(
      rows.filter((row) => row.project === DECLARING_PROJECT),
    ).toStrictEqual([
      {
        limit: "maximumDepth",
        origin: "declared",
        path: "packages/alpha/callidescope.config.ts",
        project: DECLARING_PROJECT,
        value: 10,
      },
      {
        limit: "maximumBreadth",
        origin: "declared",
        path: "packages/alpha/callidescope.config.ts",
        project: DECLARING_PROJECT,
        value: 6,
      },
    ]);
  });

  it("distinguishes the one limit a project declared from the one it inherited", async () => {
    declareProjectLimits({ maximumBreadth: 6 });

    const rows = await service.list({});

    expect(
      rows
        .filter((row) => row.project === DECLARING_PROJECT)
        .map((row) => [row.limit, row.origin, row.value]),
    ).toStrictEqual([
      ["maximumDepth", "inherited", 17],
      ["maximumBreadth", "declared", 6],
    ]);
  });

  it("lists the workspace default ahead of every project it walked", async () => {
    const rows = await service.list({});

    expect(rows.map((row) => row.project)).toStrictEqual([
      undefined,
      undefined,
      DECLARING_PROJECT,
      DECLARING_PROJECT,
      INHERITING_PROJECT,
      INHERITING_PROJECT,
    ]);
  });

  it("reads the configuration file the command line named", async () => {
    await service.list({ config: "configuration/callidescope.config.ts" });

    expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
      configurationPath: "configuration/callidescope.config.ts",
      searchDirectory: process.cwd(),
    });
  });

  it("walks with the exclusions the configuration declares", async () => {
    configurationService.loadConfigurationFile.mockResolvedValue({
      authored: {},
      configuration: buildConfiguration({
        exclude: ["packages/ignored/**"],
        excludeFrom: ["configuration/.callidescopeignore"],
      }),
      path: WORKSPACE_CONFIGURATION_PATH,
    });

    await service.list({});

    expect(fileFilterService.buildFileFilter).toHaveBeenCalledWith({
      exclude: ["packages/ignored/**"],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot: process.cwd(),
    });
  });

  it("counts the projects it walked and the ones that declared anything", async () => {
    declareProjectLimits({ maximumDepth: 10 });

    await service.list({});

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Listed every project's limits",
      undefined,
      { declaringProjectCount: 1, projectCount: 2 },
    );
  });
});
