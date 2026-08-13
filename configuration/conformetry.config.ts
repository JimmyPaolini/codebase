import { z } from "zod";

import type {
  ConformetryConfiguration,
  ConformetryGeneratorInputDefinition,
} from "@jimmypaolini/conformetry-configuration";

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

/** Where those projects keep their modules. */
const GENERATED_MODULE_PATTERNS = [
  "applications/{affirmations,caelundas,lexico-ingestion}/src/modules/*",
  "packages/conformetry*/src/modules/*",
  "tools/synchronization/src/modules/*",
];

/** Every service file inside those modules. */
const GENERATED_SERVICE_FILE_PATTERNS = [
  "applications/{affirmations,caelundas,lexico-ingestion}/src/modules/*/*.service.ts",
  "applications/{affirmations,caelundas,lexico-ingestion}/src/modules/*/*.service.unit.test.ts",
  "packages/conformetry*/src/modules/*/*.service.ts",
  "packages/conformetry*/src/modules/*/*.service.unit.test.ts",
  "tools/synchronization/src/modules/*/*.service.ts",
  "tools/synchronization/src/modules/*/*.service.unit.test.ts",
];

const conformetryConfiguration: ConformetryConfiguration = [
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
    aliases: ["ncm"],
    description:
      "Generate a NestJS command module with command, module, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: GENERATED_MODULE_PATTERNS }],
    name: "nestjs-command-module",
    templatePath: "configuration/conformetry-templates/nestjs-command-module",
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
        patterns: ["packages/conformetry"],
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
    aliases: ["ndm"],
    description:
      "Generate a NestJS dataloader module with dataloader, types, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: GENERATED_MODULE_PATTERNS }],
    name: "nestjs-dataloader-module",
    templatePath:
      "configuration/conformetry-templates/nestjs-dataloader-module",
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
    aliases: ["ngm"],
    description:
      "Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files",
    inputs: defineInputs({
      name: z.string().describe("Module name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [{ patterns: GENERATED_MODULE_PATTERNS }],
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
    instances: [{ patterns: GENERATED_SERVICE_FILE_PATTERNS }],
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
    instances: [{ patterns: GENERATED_MODULE_PATTERNS }],
    name: "nestjs-service-module",
    templatePath: "configuration/conformetry-templates/nestjs-service-module",
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
        patterns: ["packages/conformetry*"],
        substitutions: { type: "packages" },
      },
    ],
    name: "nestjs-service-project",
    templatePath: "configuration/conformetry-templates/nestjs-service-project",
  },
  {
    aliases: ["c"],
    description: "Generate a React component with test file",
    inputs: defineInputs({
      name: z.string().describe("Component name in kebab-case"),
      project: z.string().describe("Parent project name in kebab-case"),
    }),
    instances: [],
    name: "react-component",
    templatePath: "configuration/conformetry-templates/react-component",
  },
];

export default conformetryConfiguration;
