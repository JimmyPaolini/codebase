import { z } from "zod";

import type {
  ConformetryConfiguration,
  JsonSchemaDefinition,
} from "@jimmypaolini/conformetry-configuration";

export const CONFORMETRY_PATTERNS = [
  "configuration/conformetry.config.ts",
  "configuration/conformetry-templates/**",
] as const;

function defineParameters(
  shape: z.ZodRawShape,
): Record<string, JsonSchemaDefinition> {
  const schema = z.toJSONSchema(z.object(shape));
  const properties = schema.properties;

  if (properties === undefined) {
    return {};
  }

  return properties as Record<string, JsonSchemaDefinition>;
}

const conformetryConfiguration: ConformetryConfiguration = {
  generators: {
    "jupyter-notebook-application": {
      aliases: ["jna"],
      description: "Generate a Python Jupyter notebook application",
      name: "jupyter-notebook-application",
      parameters: defineParameters({
        description: z.string().describe("Application description"),
        name: z.string().describe("Application name in kebab-case"),
      }),
    },
    "nestjs-command-module": {
      aliases: ["ncm"],
      description:
        "Generate a NestJS command module with command, module, and unit test files",
      name: "nestjs-command-module",
      parameters: defineParameters({
        name: z.string().describe("Module name in kebab-case"),
        project: z.string().describe("Parent project name in kebab-case"),
      }),
    },
    "nestjs-command-project": {
      aliases: ["nca"],
      description:
        "Generate a NestJS command-line application using nest-commander",
      name: "nestjs-command-project",
      parameters: defineParameters({
        name: z.string().describe("Project name (kebab-case)"),
        type: z
          .string()
          .describe("Project type (application, package, or tools)"),
      }),
    },
    "nestjs-dataloader-module": {
      aliases: ["ndm"],
      description:
        "Generate a NestJS dataloader module with dataloader, types, and unit test files",
      name: "nestjs-dataloader-module",
      parameters: defineParameters({
        name: z.string().describe("Module name in kebab-case"),
        project: z.string().describe("Parent project name in kebab-case"),
      }),
    },
    "nestjs-graphql-application": {
      aliases: ["nga"],
      description: "Generate a NestJS GraphQL API application",
      name: "nestjs-graphql-application",
      parameters: defineParameters({
        name: z.string().describe("Application name in kebab-case"),
      }),
    },
    "nestjs-graphql-module": {
      aliases: ["ngm"],
      description:
        "Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files",
      name: "nestjs-graphql-module",
      parameters: defineParameters({
        name: z.string().describe("Module name in kebab-case"),
        project: z.string().describe("Parent project name in kebab-case"),
      }),
    },
    "nestjs-service-file": {
      aliases: ["nsf"],
      description: "Generate NestJS service and unit test files",
      name: "nestjs-service-file",
      parameters: defineParameters({
        module: z.string().describe("Target module name in kebab-case"),
        name: z.string().describe("Service name in kebab-case"),
        project: z.string().describe("Parent project name in kebab-case"),
      }),
    },
    "nestjs-service-module": {
      aliases: ["nsm"],
      description:
        "Generate a NestJS service module with module, service, types, constants, and unit test files",
      name: "nestjs-service-module",
      parameters: defineParameters({
        name: z.string().describe("Module name in kebab-case"),
        project: z.string().describe("Parent project name in kebab-case"),
      }),
    },
    "nestjs-service-project": {
      aliases: ["nsp"],
      description:
        "Generate a NestJS service package template for internal workspace libraries",
      name: "nestjs-service-project",
      parameters: defineParameters({
        name: z.string().describe("Project name (kebab-case)"),
        type: z
          .string()
          .describe("Project type (application, package, or tools)"),
      }),
    },
    "react-component": {
      aliases: ["c"],
      description: "Generate a React component with test file",
      name: "react-component",
      parameters: defineParameters({
        name: z.string().describe("Component name in kebab-case"),
        project: z.string().describe("Parent project name in kebab-case"),
      }),
    },
  },
};

export default conformetryConfiguration;
