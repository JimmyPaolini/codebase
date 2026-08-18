import path from "node:path";

import {
  ConfigurationService,
  InputService,
  TemplateDiscoveryMatchingService,
  TemplateDiscoveryService,
} from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_CONFIGURATION_PATH } from "../../constants.js";

import {
  DETAIL_INDENT,
  INSTANCE_INDENT,
  NO_CANDIDATES_MESSAGE,
  NO_OVERLAP_MESSAGE,
  PATH_REQUIRED_MESSAGE,
  PERCENT_SCALE,
} from "./explain.constants.js";

import type {
  ConsideredTemplate,
  ExplainCommandOptions,
  ExplainedInstance,
  ExplainVerdict,
} from "./explain.types.js";
import type {
  Instance,
  ResolvedInstances,
  TemplateDefinition,
} from "@conformetry/configuration";

/**
 * Explains which template a path is an instance of, and why.
 *
 * Nothing records where an instance came from — attribution is inferred from
 * how much of a template's structure the path already has. That makes the two
 * failing outcomes, `ambiguous` and `no-match`, impossible to act on from the
 * conformance report alone: it names them without showing what was weighed.
 * This command shows the ranking behind the verdict.
 *
 * Output goes to standard output rather than through the logger, which asserts
 * every message opens with an emoji and a verb — right for a log line, wrong
 * for a report.
 */
@Command({
  description: "Run the explain command",
  name: "explain",
})
@Injectable()
export class ExplainCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly inputService: InputService,
    private readonly templateDiscoveryMatchingService: TemplateDiscoveryMatchingService,
    private readonly templateDiscoveryService: TemplateDiscoveryService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ExplainCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Renders one explained instance as readable lines.
   *
   * The path is made relative for reading, matching how the conformance report
   * names instances. The machine-readable form keeps the absolute path, which
   * needs no working directory to interpret.
   */
  private describeInstance(args: {
    explained: ExplainedInstance;
    workingDirectory: string;
  }): string[] {
    const { explained } = args;
    const instance = path.relative(
      args.workingDirectory,
      path.join(explained.instancePath, explained.nameStem),
    );
    const lines = [
      `${INSTANCE_INDENT}${instance}`,
      `${DETAIL_INDENT}Verdict: ${this.describeVerdict(explained)}`,
    ];

    if (explained.considered.length === 0) {
      lines.push(`${DETAIL_INDENT}Considered: ${NO_OVERLAP_MESSAGE}`);

      return lines;
    }

    lines.push(`${DETAIL_INDENT}Considered:`);
    for (const considered of explained.considered) {
      const percentage = Math.round(considered.matchRatio * PERCENT_SCALE);
      lines.push(
        `${DETAIL_INDENT}${INSTANCE_INDENT}${considered.name} ` +
          `${String(considered.matchedFileCount)}/${String(considered.templateFileCount)} files ` +
          `${String(percentage)}%`,
      );
    }

    return lines;
  }

  /**
   * Phrases one verdict for a reader.
   *
   * A record keyed by the verdict type rather than a switch: the key set is
   * checked against the union, so a new verdict fails to compile until it is
   * given wording here.
   */
  private describeVerdict(explained: ExplainedInstance): string {
    const phrases: Record<ExplainVerdict, string> = {
      ambiguous: `ambiguous between ${explained.templates.join(", ")}`,
      matched: `matched ${explained.templates.join(", ")}`,
      "no-match": "no template explains this path",
    };

    return phrases[explained.verdict];
  }

  /** Pairs each instance with its verdict and the ranking behind it. */
  private explainInstances(args: {
    instances: Instance[];
    resolved: ResolvedInstances;
    templates: TemplateDefinition[];
  }): ExplainedInstance[] {
    return args.instances.map((instance) => {
      const matches = this.templateDiscoveryMatchingService.matchTemplates({
        instance,
        substitutions:
          this.templateDiscoveryMatchingService.buildSubstitutions(instance),
        templates: args.templates,
      });

      return {
        considered: matches.map((match): ConsideredTemplate => {
          return {
            matchedFileCount: match.matchedFileCount,
            matchRatio: match.matchRatio,
            name: match.template.name,
            templateFileCount: match.template.filePaths.length,
          };
        }),
        instancePath: instance.path,
        nameStem: instance.nameStem,
        templates: this.resolveVerdictTemplates({ instance, ...args }),
        verdict: this.resolveVerdict({ instance, resolved: args.resolved }),
      };
    });
  }

  /** Reads the verdict the real matching pass reached for one instance. */
  private resolveVerdict(args: {
    instance: Instance;
    resolved: ResolvedInstances;
  }): ExplainVerdict {
    const unmatched = args.resolved.unmatched.find((entry) => {
      return entry.instance === args.instance;
    });

    if (unmatched !== undefined) {
      return unmatched.reason === "ambiguous" ? "ambiguous" : "no-match";
    }

    return "matched";
  }

  /** Names the templates the verdict itself points at. */
  private resolveVerdictTemplates(args: {
    instance: Instance;
    resolved: ResolvedInstances;
  }): string[] {
    const unmatched = args.resolved.unmatched.find((entry) => {
      return entry.instance === args.instance;
    });

    if (unmatched !== undefined) {
      return unmatched.tiedTemplateNames;
    }

    return args.resolved.matched
      .filter((entry) => entry.instance === args.instance)
      .map((entry) => entry.template.name);
  }

  // 🌎 Public Methods

  /** Parses the optional configuration path. */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Selects the machine-readable report. */
  @Option({
    description: "Write the report as JSON",
    flags: "--json",
  })
  public parseJson(): boolean {
    return true;
  }

  /** Explains every instance the given path expands to. */
  public async run(
    passedParameters: string[],
    options: ExplainCommandOptions,
  ): Promise<void> {
    const [requestedPath] = passedParameters;
    if (requestedPath === undefined || requestedPath === "") {
      throw new Error(PATH_REQUIRED_MESSAGE);
    }

    const workingDirectory = process.cwd();
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const templates = this.templateDiscoveryService.collectTemplates({
      configuration,
      workingDirectory,
    });
    const instances = this.templateDiscoveryService.findInstances({
      patterns: [requestedPath],
      workingDirectory,
    });
    const explained = this.explainInstances({
      instances,
      resolved: this.templateDiscoveryService.matchInstances({
        instances,
        templates,
      }),
      templates,
    });

    if (options.json === true) {
      console.info(JSON.stringify(explained, undefined, 2));
      return;
    }

    if (explained.length === 0) {
      console.info(NO_CANDIDATES_MESSAGE);
      return;
    }

    for (const instance of explained) {
      console.info(
        this.describeInstance({
          explained: instance,
          workingDirectory,
        }).join("\n"),
      );
    }
  }
}
