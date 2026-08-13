import path from "node:path";

import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Injectable } from "@nestjs/common";

import {
  GENERATED_FILE_NOTICE,
  GENERATORS_SCHEMA_PATH,
  JSON_INDENT,
} from "./generator.constants";

import type { EmitPluginArguments, EmittedFile } from "./generator.types";
import type { ConformetryGeneratorDefinition } from "@jimmypaolini/conformetry-configuration";

/**
 * Derives an Nx generator plugin from the conformetry configuration.
 *
 * Nx needs a `generators.json`, a factory function per generator, and a JSON
 * schema per generator — none of which it will accept as runtime data. The
 * generators a workspace has are a property of its configuration, so rather
 * than hand-maintaining three files per generator, they are emitted from the
 * configuration and kept honest by `nx sync:check`.
 */
@Injectable()
export class GeneratorService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly renderingService: RenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The exported factory name for one generator, e.g. `nestjsServiceModule`. */
  private buildFactoryName(generatorName: string): string {
    const substitutions =
      this.renderingService.buildNameSubstitutions(generatorName);

    return substitutions["nameCamelCase"] ?? generatorName;
  }

  /**
   * Builds the `generators.json` Nx reads.
   *
   * Schemas are referenced by a path inside the emitted plugin, never one that
   * escapes it — a schema path pointing outside the package resolves to
   * nothing once the package is installed somewhere else.
   */
  private buildGeneratorsManifest(args: {
    definitions: ConformetryGeneratorDefinition[];
    outputPath: string;
  }): string {
    const generators: Record<string, unknown> = {};

    for (const definition of args.definitions) {
      generators[definition.name] = {
        ...(definition.aliases === undefined
          ? {}
          : { aliases: definition.aliases }),
        ...(definition.description === undefined
          ? {}
          : { description: definition.description }),
        factory: `./src/generators#${this.buildFactoryName(definition.name)}`,
        schema: `./src/schemas/${definition.name}.json`,
      };
    }

    return this.stringify({
      // Relative to wherever the plugin was emitted, not a fixed number of
      // levels up: the output path is configurable, and a `..` count that only
      // works two directories deep is how the previous hand-written manifest
      // ended up pointing at nothing.
      $schema: path
        .relative(args.outputPath, GENERATORS_SCHEMA_PATH)
        .split(path.sep)
        .join("/"),
      generators,
    });
  }

  /**
   * Builds the wrapper module Nx calls into.
   *
   * One thin export per generator, because Nx does not pass the generator's
   * own name to its factory — the name has to be bound at the call site, so
   * the wrappers cannot be collapsed into a single function.
   */
  private buildGeneratorsModule(args: {
    definitions: ConformetryGeneratorDefinition[];
  }): string {
    const wrappers = args.definitions.map((definition) => {
      return [
        "/**",
        ` * Runs the \`${definition.name}\` conformetry generator.`,
        " */",
        `export async function ${this.buildFactoryName(definition.name)}(`,
        "  tree: Tree,",
        "  options?: Record<string, unknown>,",
        "): Promise<void> {",
        "  await runConformetryGenerator({",
        `    generatorName: "${definition.name}",`,
        "    ...(options === undefined ? {} : { options }),",
        "    tree,",
        "  });",
        "}",
      ].join("\n");
    });

    return [
      GENERATED_FILE_NOTICE,
      "",
      'import { runConformetryGenerator } from "@jimmypaolini/conformetry-nx";',
      "",
      'import type { Tree } from "@nx/devkit";',
      "",
      ...wrappers.flatMap((wrapper) => [wrapper, ""]),
    ].join("\n");
  }

  /**
   * Builds one generator's JSON schema from its configured inputs.
   *
   * Every input is required: a conformetry generator substitutes each of its
   * placeholders, and mustache renders a missing one as empty rather than
   * failing, so an optional input would silently produce a hole.
   */
  private buildSchema(definition: ConformetryGeneratorDefinition): string {
    return this.stringify({
      $schema: "http://json-schema.org/schema",
      ...(definition.description === undefined
        ? {}
        : { description: definition.description }),
      properties: definition.inputs,
      required: Object.keys(definition.inputs),
      title: definition.name,
      type: "object",
    });
  }

  /** Serializes emitted JSON the way the workspace formatter would. */
  private stringify(value: unknown): string {
    return `${JSON.stringify(value, undefined, JSON_INDENT)}\n`;
  }

  // 🌎 Public Methods

  /**
   * Returns every file the consumer's generator plugin consists of.
   *
   * Pure with respect to the filesystem: the caller writes these through an Nx
   * `Tree`, which is what lets `nx sync:check` compare them against what is on
   * disk without touching it.
   */
  public async emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const definitions = configuration.toSorted((left, right) => {
      return left.name.localeCompare(right.name);
    });

    return [
      {
        content: this.buildGeneratorsManifest({
          definitions,
          outputPath: args.outputPath,
        }),
        filePath: path.join(args.outputPath, "generators.json"),
      },
      {
        content: this.buildGeneratorsModule({ definitions }),
        filePath: path.join(args.outputPath, "src/generators.ts"),
      },
      ...definitions.map((definition) => {
        return {
          content: this.buildSchema(definition),
          filePath: path.join(
            args.outputPath,
            `src/schemas/${definition.name}.json`,
          ),
        };
      }),
      {
        // The wrappers import the plugin at runtime, so the emitted package
        // has to declare it — otherwise `nx g` resolves the factory and then
        // fails inside it, which reads as a broken generator rather than a
        // missing install.
        content: this.stringify({
          dependencies: {
            "@jimmypaolini/conformetry-nx": "workspace:*",
            "@nx/devkit": "catalog:",
          },
          generators: "./generators.json",
          name: args.packageName,
          nx: { generators: "./generators.json" },
          private: true,
          type: "module",
          version: "0.0.1",
        }),
        filePath: path.join(args.outputPath, "package.json"),
      },
    ];
  }
}
