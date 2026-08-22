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
    description: "Generate a Python Jupyter notebook application",
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
      "Generate a NestJS command-line application using nest-commander",
    inputs: defineInputs({
      name: z.string().describe("Project name (kebab-case)"),
      type: z
        .string()
        .describe("Project type (application, package, or tools)"),
    }),
    instances: [
      {
        patterns: [
          "applications/{caelundas,lexico-ingestion}",
          "packages/conformetry-cli",
          "tools/{synchronization,validation}",
        ],
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
          "packages/callidescope-configuration",
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
      "Generate a NestJS command module with command, module, and unit test files",
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
      "Generate a NestJS dataloader module with dataloader, types, and unit test files",
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
      "Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files",
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
    description: "Generate NestJS service and unit test files",
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
      "Generate a NestJS service module with module, service, types, constants, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }],
    name: "nestjs-service-module",
    templatePath: "configuration/conformetry-templates/nestjs-service-module",
  },
  {
    aliases: ["c"],
    description: "Generate a React component with test file",
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
