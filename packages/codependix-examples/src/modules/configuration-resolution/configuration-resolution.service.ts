import path from "node:path";

import {
  codependixConfigurationSchema,
  ConfigurationService,
} from "@codependix/configuration";
import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { resolveFixture } from "../../constants";

import {
  ABSENT_FIXTURE,
  CONFIGURATION_FIXTURES_SEGMENT,
  MISSING_CONFIGURATION_FILE,
  NESTED_FIXTURE,
  NESTED_PROJECT_SEGMENT,
  PRECEDENCE_FIXTURE,
  REFUSED_CONFIGURATIONS,
  UNKNOWN_FIELDS_FIXTURE,
  UNSUPPORTED_TYPE_FIXTURE,
} from "./configuration-resolution.constants";

import type {
  ExampleDocument,
  ExampleSection,
} from "../examples/examples.types";
import type { ResolutionRow } from "./configuration-resolution.types";
import type {
  CodependixGraphType,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Resolves the configuration fixtures and renders what each one produces.
 *
 * This is the reference that does not exist anywhere else: everything a reader
 * needs to know about `include`/`exclude` matching a project's root as well as
 * its name, about a per-project override replacing rather than merging with
 * `defaults`, and about which configuration file wins when a workspace carries
 * two, currently lives only in a JSDoc comment on the type that implements it.
 *
 * Every row below is produced by calling the real `ConfigurationService`, so a
 * resolution rule that changed would change this example rather than leaving
 * the prose quietly wrong.
 */
@Injectable()
/* v8 ignore stop */
export class ConfigurationResolutionService {
  // 🏗 Dependency Injection

  constructor(private readonly configurationService: ConfigurationService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the sections covering how a configuration file is found and read. */
  private async buildDiscoverySections(): Promise<ExampleSection[]> {
    const precedence = await this.loadFixture(PRECEDENCE_FIXTURE);
    const nested = await this.configurationService.loadConfiguration({
      searchDirectory: resolveFixture(
        CONFIGURATION_FIXTURES_SEGMENT,
        NESTED_FIXTURE,
        NESTED_PROJECT_SEGMENT,
      ),
    });
    const absent = await this.loadFixture(ABSENT_FIXTURE);
    const unknownFields = await this.loadFixture(UNKNOWN_FIELDS_FIXTURE);

    return [
      {
        body: `\`\`\`json\n${JSON.stringify(precedence.defaults, null, 2)}\n\`\`\``,
        heading: "A workspace carrying two configuration files",
        note: "`fixtures/configuration/precedence/` holds both a `codependix.config.ts` and a `codependix.config.json`. `CONFIGURATION_FILE_NAMES` is searched in order, so the TypeScript one wins — the anchor here is the one it declares.",
      },
      {
        body: `\`\`\`json\n${JSON.stringify(nested.projects, null, 2)}\n\`\`\``,
        heading: "The upward search reaches past a nested `package.json`",
        note: "The search started inside `packages/atlas-service/`, which carries its own `package.json`, and still found the configuration at the fixture root — the root every path in that configuration was written relative to.",
      },
      {
        body: `\`\`\`json\n${JSON.stringify(this.configurationService.resolveForProject({ configuration: absent, graphType: "nx", projectName: "atlas-service" }), null, 2)}\n\`\`\``,
        heading: "No configuration file at all",
        note: 'A workspace that never wrote one resolves every graph to `target: "none"` and produces nothing, rather than being told to write one. The absence of an unnamed configuration file is legal.',
      },
      {
        body: `\`\`\`json\n${JSON.stringify(unknownFields.defaults, null, 2)}\n\`\`\``,
        heading: "An unknown field is stripped, not rejected",
        note: "The fixture declares a `graphqlSchemas` field no codependix has an opinion about. Zod strips unknown keys, so a configuration written for a newer codependix still loads under an older one.",
      },
    ];
  }

  /** Builds the sections covering `defaults`, overrides, and globs. */
  private buildResolutionSections(): ExampleSection[] {
    const configuration = this.configurationService.resolveConfiguration({
      defaults: {
        nx: { markdown: { anchor: "example-nx" }, target: "markdown" },
      },
      exclude: ["applications/*"],
      include: ["packages/*", "codependix-*"],
      projects: {
        "atlas-core": { nx: { json: { path: "graph.json" }, target: "json" } },
      },
      workspace: {
        nx: { markdown: { anchor: "example-workspace" }, target: "markdown" },
      },
    });

    return [
      {
        body: this.renderRows([
          this.resolveRow(
            configuration,
            "atlas-service",
            "packages/atlas-service",
          ),
          this.resolveRow(configuration, "atlas-core", "packages/atlas-core"),
          this.resolveRow(
            configuration,
            "atlas-application",
            "applications/atlas-application",
          ),
          this.resolveRow(configuration, "unrelated", "tools/unrelated"),
        ]),
        heading: "`defaults`, a per-project override, and the two glob lists",
        note: "`atlas-core` names an `nx` override, and it **replaces** the default outright rather than merging into it — its `markdown` destination is gone, not inherited. `atlas-application` matches `exclude`, so it resolves to `none` no matter what either configuration would otherwise say. `unrelated` matches no `include` glob at all.",
      },
      {
        body: this.renderInclusion(configuration),
        heading: "`include` and `exclude` match a name or a root",
        note: "Both lists are matched against a project's name **and** its workspace-relative root. `atlas-service` matches no glob by name and matches `packages/*` by root, so a caller that knows the root gets a different answer from one that does not — which is why `projectRoot` is optional rather than absent.",
      },
      {
        body: `\`\`\`json\n${JSON.stringify(this.configurationService.resolveForWorkspace(configuration), null, 2)}\n\`\`\``,
        heading: "The Workspace Graph ignores both glob lists",
        note: "It is exported once for the repository rather than once per project, so it carries no per-project override and `include`/`exclude` never apply to it.",
      },
      {
        body: "`ConfigurationService.readDefaultExport` unwraps a configuration module's default export **by name**. A configuration field also called `default` would collide with that unwrapping, which is why the field is `defaults`.",
        heading: "Why the field is `defaults` and not `default`",
        note: "The one naming decision in the whole configuration surface that looks arbitrary and is not.",
      },
    ];
  }

  /** Renders one refusal as the message a reader would actually be shown. */
  private describeParseRefusal(configuration: unknown): string {
    try {
      codependixConfigurationSchema.parse(configuration);
    } catch (error) {
      return this.describeIssues(error);
    }

    /* v8 ignore next -- every configuration in REFUSED_CONFIGURATIONS is refused */
    return "accepted";
  }

  /** Renders what `isProjectIncluded` answers, with and without a root. */
  private renderInclusion(
    configuration: ResolvedCodependixConfiguration,
  ): string {
    const answer = (projectName: string, projectRoot?: string): string =>
      String(
        this.configurationService.isProjectIncluded(
          projectName,
          configuration,
          projectRoot,
        ),
      );

    return [
      "```text",
      'include: ["packages/*", "codependix-*"]',
      "",
      `atlas-service, name only                        → ${answer("atlas-service")}`,
      `atlas-service, name and packages/atlas-service  → ${answer("atlas-service", "packages/atlas-service")}`,
      `codependix-examples, name only                  → ${answer("codependix-examples")}`,
      "```",
    ].join("\n");
  }

  /** Renders a resolution table the guide can quote. */
  private renderRows(rows: ResolutionRow[]): string {
    return [
      "| Project | Root | Resolved target | Destination |",
      "| ------- | ---- | --------------- | ----------- |",
      ...rows.map(
        (row) =>
          `| \`${row.projectName}\` | \`${row.projectRoot}\` | \`${row.target}\` | ${row.destination} |`,
      ),
    ].join("\n");
  }

  /** Resolves one project's `nx` output and describes it as a table row. */
  private resolveRow(
    configuration: ResolvedCodependixConfiguration,
    projectName: string,
    projectRoot: string,
  ): ResolutionRow {
    const graphType: CodependixGraphType = "nx";
    const resolved = this.configurationService.resolveForProject({
      configuration,
      graphType,
      projectName,
      projectRoot,
    });

    return {
      destination: this.describeDestination(resolved),
      projectName,
      projectRoot,
      target: resolved.target,
    };
  }

  // 🌎 Public Methods

  /** Builds every configuration example document. */
  async build(): Promise<ExampleDocument[]> {
    return [
      {
        id: "08-configuration-resolution",
        jsonExports: [],
        sections: [
          ...this.buildResolutionSections(),
          ...(await this.buildDiscoverySections()),
        ],
        summary:
          "Every configuration field, resolved by the real loader — including the two a reader is most likely to assume wrongly.",
        title: "8. Configuration resolution, field by field",
      },
      {
        id: "14-refusals",
        jsonExports: [],
        sections: [
          ...this.buildParseRefusalSections(),
          ...(await this.buildPathRefusalSections()),
        ],
        summary:
          "Every way codependix refuses a configuration or a command line, each with the reproduction that produces it — because a refusal is where a reader gets stuck.",
        title: "14. Every refusal, with its reproduction",
      },
    ];
  }

  /** Builds one section per configuration the schema refuses. */
  buildParseRefusalSections(): ExampleSection[] {
    return REFUSED_CONFIGURATIONS.map((refusal) => ({
      body: `\`\`\`text\n${this.describeParseRefusal(refusal.configuration)}\n\`\`\``,
      heading: refusal.title,
      note: `Reproduced by \`codependixConfigurationSchema.parse(${JSON.stringify(refusal.configuration)})\`.`,
    }));
  }

  /** Builds the two refusals that come from the configuration path itself. */
  async buildPathRefusalSections(): Promise<ExampleSection[]> {
    return [
      {
        body: `\`\`\`text\n${await this.describeLoadRefusal(path.join(ABSENT_FIXTURE, MISSING_CONFIGURATION_FILE))}\n\`\`\``,
        heading: "An explicitly named configuration file that does not exist",
        note: "A path named on the command line must exist: a typo in a task runner's arguments should fail rather than quietly resolving every graph to `none`. A path that was _not_ named is searched for, and its absence is legal — see example 8.",
      },
      {
        body: `\`\`\`text\n${await this.describeLoadRefusal(path.join(UNSUPPORTED_TYPE_FIXTURE, "codependix.config.yaml"))}\n\`\`\``,
        heading: "A configuration file the loader cannot read",
        note: "`SUPPORTED_CONFIGURATION_EXTENSIONS` covers `.cjs`, `.cts`, `.js`, `.json`, `.mjs`, `.mts`, and `.ts`. Anything else raises `UnknownConfigurationFileTypeError`.",
      },
    ];
  }

  /** Describes where a resolved output would be written. */
  describeDestination(resolved: {
    json: undefined | { path: string };
    markdown: undefined | { anchor: string | undefined; path: string };
  }): string {
    const parts: string[] = [];

    if (resolved.json !== undefined)
      parts.push(`json \`${resolved.json.path}\``);
    if (resolved.markdown !== undefined) {
      parts.push(
        `markdown \`${resolved.markdown.path}\`${resolved.markdown.anchor === undefined ? "" : ` anchor \`${resolved.markdown.anchor}\``}`,
      );
    }

    return parts.length === 0 ? "_none_" : parts.join(", ");
  }

  /** Describes a raised value, whether or not it was an `Error`. */
  describeError(error: unknown): string {
    return error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  }

  /** Lists a raised validation error's messages, one per line. */
  describeIssues(error: unknown): string {
    return error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join("\n")
      : this.describeError(error);
  }

  /** Loads a fixture configuration by naming its path explicitly. */
  async describeLoadRefusal(relativePath: string): Promise<string> {
    try {
      await this.configurationService.loadConfiguration({
        configurationPath: resolveFixture(
          CONFIGURATION_FIXTURES_SEGMENT,
          relativePath,
        ),
      });
    } catch (error) {
      return this.redactPath(this.describeError(error));
    }

    /* v8 ignore next -- both fixtures are refused */
    return "loaded";
  }

  /** Loads one configuration fixture by searching upward from its directory. */
  async loadFixture(
    fixtureName: string,
  ): Promise<ResolvedCodependixConfiguration> {
    return this.configurationService.loadConfiguration({
      searchDirectory: resolveFixture(
        CONFIGURATION_FIXTURES_SEGMENT,
        fixtureName,
      ),
    });
  }

  /**
   * Replaces an absolute path with a repository-relative one.
   *
   * A committed example that carried the absolute path of whichever machine
   * rendered it would fail `examples --check` everywhere else.
   */
  redactPath(message: string): string {
    return message.replaceAll(
      resolveFixture(CONFIGURATION_FIXTURES_SEGMENT),
      "<fixtures>/configuration",
    );
  }
}
