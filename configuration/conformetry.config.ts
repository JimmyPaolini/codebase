import { z } from "zod";

import type { ConformetryGeneratorInputDefinition } from "@conformetry/configuration";
import type { ConformetryNxConfiguration } from "@conformetry/nx";

export const CONFORMETRY_PATTERNS = [
  "configuration/conformetry.config.ts",
  "configuration/conformetry-templates/**",
] as const;

/**
 * Converts a Zod shape into the JSON Schema fragments conformetry reads as a
 * generator's inputs.
 */
function defineInputs(
  shape: z.ZodRawShape,
): Record<string, ConformetryGeneratorInputDefinition> {
  const schema = z.toJSONSchema(z.object(shape));
  const properties = schema.properties;

  if (properties === undefined) {
    return {};
  }

  const inputs: Record<string, ConformetryGeneratorInputDefinition> = {};

  for (const [name, definition] of Object.entries(properties)) {
    if (typeof definition === "object") {
      inputs[name] = definition;
    }
  }

  return inputs;
}

const conformetryConfiguration: ConformetryNxConfiguration = [
  // Groups without tags are plain workspace globs — the form a host with no
  // project graph writes, and the right one where the set of projects is not a
  // shape a tag describes.
  {
    aliases: ["jna"],
    description:
      "Scaffold a standalone Python application with a Jupyter notebook entry point, pytest/pyright/ruff tooling, and a shared uv workspace venv",
    inputs: defineInputs({
      description: z.string().describe("Application description"),
      name: z.string().describe("Application name in kebab-case"),
    }),
    instances: [{ patterns: ["applications/affirmations"] }],
    name: "jupyter-notebook-application",
    templatePath:
      "configuration/conformetry-templates/jupyter-notebook-application",
  },
  {
    aliases: ["nca"],
    description:
      "Scaffold a standalone NestJS CLI application built on nest-commander, for a new command-line tool in applications/, packages/, or tools/",
    inputs: defineInputs({
      name: z.string().describe("Project name (kebab-case)"),
      type: z
        .enum(["applications", "packages", "tools"])
        .describe("Project type directory (applications, packages, or tools)"),
    }),
    instances: [{ patterns: ["."], tags: ["framework:nest-commander"] }],
    name: "nestjs-command-project",
    templatePath: "configuration/conformetry-templates/nestjs-command-project",
  },
  {
    aliases: ["nga"],
    description:
      "Scaffold a standalone NestJS GraphQL API application, for a new backend service exposing a GraphQL schema over HTTP",
    inputs: defineInputs({
      name: z.string().describe("Application name in kebab-case"),
    }),
    instances: [],
    name: "nestjs-graphql-application",
    templatePath:
      "configuration/conformetry-templates/nestjs-graphql-application",
  },
  {
    aliases: ["nsp"],
    description:
      "Scaffold a standalone NestJS library package for internal workspace code shared across projects, with no CLI entry point or HTTP server",
    inputs: defineInputs({
      name: z.string().describe("Project name (kebab-case)"),
      type: z
        .enum(["applications", "packages", "tools"])
        .describe("Project type directory (applications, packages, or tools)"),
    }),
    instances: [
      {
        patterns: [
          "packages/callidescope-configuration",
          "packages/callidescope-graph",
          "packages/callidescope-output",
          "packages/codometer-configuration",
          "packages/conformetry-{configuration,core,files,generation,json,jupyter,markdown,python,text,typescript,validation,nx}",
        ],
      },
    ],
    name: "nestjs-service-project",
    templatePath: "configuration/conformetry-templates/nestjs-service-project",
  },

  // Groups with tags pick the projects the template suits — which is what
  // `nx g` prompts with — and read their globs inside each one, so where a
  // generator belongs is stated exactly once.
  {
    aliases: ["ncm"],
    description:
      "Add a nest-commander command module — command, module, constants, types, and unit test — to an existing NestJS command-line project",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [
      { patterns: ["src/modules/*"], tags: ["framework:nest-commander"] },
    ],
    name: "nestjs-command-module",
    templatePath: "configuration/conformetry-templates/nestjs-command-module",
  },
  {
    aliases: ["ndm"],
    description:
      "Add a GraphQL dataloader module — dataloader, module, types, and unit test — for batching lookups inside an existing NestJS project",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }],
    name: "nestjs-dataloader-module",
    templatePath:
      "configuration/conformetry-templates/nestjs-dataloader-module",
  },
  {
    aliases: ["ngm"],
    description:
      "Add a GraphQL module — resolver, entities, args/input types, factories, constants, and unit test — to an existing NestJS project",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }],
    name: "nestjs-graphql-module",
    templatePath: "configuration/conformetry-templates/nestjs-graphql-module",
  },
  {
    aliases: ["nsf"],
    description:
      "Add a service and its unit test to an existing NestJS module, without scaffolding the surrounding module files",
    inputs: defineInputs({
      module: z.string().describe("Target module name in kebab-case"),
      name: z.string().describe("Service name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [
      {
        patterns: [
          "src/modules/*/*.service.ts",
          "src/modules/*/*.service.unit.test.ts",
        ],
        tags: ["framework:nestjs"],
      },
    ],
    name: "nestjs-service-file",
    templatePath: "configuration/conformetry-templates/nestjs-service-file",
  },
  {
    aliases: ["nsm"],
    description:
      "Add a plain service module — module, service, constants, types, and unit test — to an existing NestJS project",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }],
    name: "nestjs-service-module",
    templatePath: "configuration/conformetry-templates/nestjs-service-module",
  },
  // Tags select projects and patterns select the instances inside them, so a
  // group naming tags alone registers nothing and this template is measured
  // against no instance at all. That is deliberate while `lexico` is still in
  // progress, and adding patterns here is what would start validating it.
  {
    aliases: ["c"],
    description:
      "Add a React component and its test file to an existing React project",
    inputs: defineInputs({
      name: z.string().describe("Component name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ tags: ["framework:react"] }],
    name: "react-component",
    templatePath: "configuration/conformetry-templates/react-component",
  },
];

export default conformetryConfiguration;
