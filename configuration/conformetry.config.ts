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
  // Project-level generators keep hand-written globs. They take no `project`
  // input, so a scope would constrain no prompt, and the set of projects each
  // one governs is not a shape derivable from a tag.
  {
    aliases: ["jna"],
    description: "Generate a Python Jupyter notebook application",
    inputs: defineInputs({
      description: z.string().describe("Application description"),
      name: z.string().describe("Application name in kebab-case"),
    }),
    instances: [
      {
        patterns: ["applications/affirmations"],
        substitutions: { type: "applications" },
      },
    ],
    name: "jupyter-notebook-application",
    templatePath:
      "configuration/conformetry-templates/jupyter-notebook-application",
  },
  {
    aliases: ["nca"],
    description:
      "Generate a NestJS command-line application using nest-commander",
    inputs: defineInputs({
      name: z.string().describe("Project name (kebab-case)"),
      type: z
        .string()
        .describe("Project type (application, package, or tools)"),
    }),
    instances: [
      {
        patterns: ["applications/{caelundas,lexico-ingestion}"],
        substitutions: { type: "applications" },
      },
      {
        patterns: ["packages/conformetry-cli"],
        substitutions: { type: "packages" },
      },
      {
        patterns: ["tools/synchronization"],
        substitutions: { type: "tools" },
      },
    ],
    name: "nestjs-command-project",
    templatePath: "configuration/conformetry-templates/nestjs-command-project",
  },
  {
    aliases: ["nga"],
    description: "Generate a NestJS GraphQL API application",
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
      "Generate a NestJS service package template for internal workspace libraries",
    inputs: defineInputs({
      name: z.string().describe("Project name (kebab-case)"),
      type: z
        .string()
        .describe("Project type (application, package, or tools)"),
    }),
    instances: [
      {
        patterns: [
          "packages/conformetry-{configuration,core,files,generation,json,jupyter,markdown,python,text,typescript,validation,nx}",
        ],
        substitutions: { type: "packages" },
      },
    ],
    name: "nestjs-service-project",
    templatePath: "configuration/conformetry-templates/nestjs-service-project",
  },

  // Module and file generators are scoped instead. The tags pick the projects
  // the template suits — which is what `nx g` prompts with — and the patterns
  // pick what inside them, so the instances validation checks are derived from
  // the same statement rather than restated as a parallel list of globs.
  {
    aliases: ["ncm"],
    description:
      "Generate a NestJS command module with command, module, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    name: "nestjs-command-module",
    scope: {
      patterns: ["src/modules/*"],
      tags: ["framework:nest-commander"],
    },
    templatePath: "configuration/conformetry-templates/nestjs-command-module",
  },
  {
    aliases: ["ndm"],
    description:
      "Generate a NestJS dataloader module with dataloader, types, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    name: "nestjs-dataloader-module",
    scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
    templatePath:
      "configuration/conformetry-templates/nestjs-dataloader-module",
  },
  {
    aliases: ["ngm"],
    description:
      "Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    name: "nestjs-graphql-module",
    scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
    templatePath: "configuration/conformetry-templates/nestjs-graphql-module",
  },
  {
    aliases: ["nsf"],
    description: "Generate NestJS service and unit test files",
    inputs: defineInputs({
      module: z.string().describe("Target module name in kebab-case"),
      name: z.string().describe("Service name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    name: "nestjs-service-file",
    scope: {
      patterns: [
        "src/modules/*/*.service.ts",
        "src/modules/*/*.service.unit.test.ts",
      ],
      tags: ["framework:nestjs"],
    },
    templatePath: "configuration/conformetry-templates/nestjs-service-file",
  },
  {
    aliases: ["nsm"],
    description:
      "Generate a NestJS service module with module, service, types, constants, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    name: "nestjs-service-module",
    scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
    templatePath: "configuration/conformetry-templates/nestjs-service-module",
  },
  {
    aliases: ["c"],
    description: "Generate a React component with test file",
    inputs: defineInputs({
      name: z.string().describe("Component name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    name: "react-component",
    // Tags but no patterns: the prompt is confined to the React projects,
    // while nothing is claimed to be a validated instance yet.
    scope: { tags: ["framework:react"] },
    templatePath: "configuration/conformetry-templates/react-component",
  },
];

export default conformetryConfiguration;
