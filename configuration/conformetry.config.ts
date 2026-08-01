/**
 * Defines the full declarative generator registry for the repository.
 */
export interface ConformetryConfiguration {
  generators: Record<string, ConformetryGeneratorDefinition>;
}

/**
 * Describes a generator entry in the declarative configuration registry.
 */
export interface ConformetryGeneratorDefinition {
  aliases?: string[];
  description?: string;
  hooks?: {
    postGenerate?: ConformetryGeneratorHookDefinition;
    preGenerate?: ConformetryGeneratorHookDefinition;
  };
  name: string;
  schemaPath: string;
  targetPathStrategy: string;
  templateDirectoryPath: string;
}

/**
 * Represents a hook that can run before or after a generator execution.
 */
export interface ConformetryGeneratorHookDefinition {
  name: string;
}

export const CONFORMETRY_PATTERNS = [
  "configuration/conformetry.config.ts",
  "configuration/conformetry-templates/**",
] as const;

const conformetryConfiguration: ConformetryConfiguration = {
  generators: {
    "jupyter-notebook-application": {
      aliases: ["jna"],
      description: "Generate a Python Jupyter notebook application",
      name: "jupyter-notebook-application",
      schemaPath:
        "configuration/conformetry-templates/jupyter-notebook-application/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/jupyter-notebook-application",
    },
    "nestjs-command-application": {
      aliases: ["nca"],
      description:
        "Generate a NestJS command-line application using nest-commander",
      name: "nestjs-command-application",
      schemaPath:
        "configuration/conformetry-templates/nestjs-command-application/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-command-application",
    },
    "nestjs-command-module": {
      aliases: ["ncm"],
      description:
        "Generate a NestJS command module with command, module, and unit test files",
      name: "nestjs-command-module",
      schemaPath:
        "configuration/conformetry-templates/nestjs-command-module/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-command-module",
    },
    "nestjs-dataloader-module": {
      aliases: ["ndm"],
      description:
        "Generate a NestJS dataloader module with dataloader, types, and unit test files",
      name: "nestjs-dataloader-module",
      schemaPath:
        "configuration/conformetry-templates/nestjs-dataloader-module/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-dataloader-module",
    },
    "nestjs-graphql-application": {
      aliases: ["nga"],
      description: "Generate a NestJS GraphQL API application",
      name: "nestjs-graphql-application",
      schemaPath:
        "configuration/conformetry-templates/nestjs-graphql-application/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-graphql-application",
    },
    "nestjs-graphql-module": {
      aliases: ["ngm"],
      description:
        "Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files",
      name: "nestjs-graphql-module",
      schemaPath:
        "configuration/conformetry-templates/nestjs-graphql-module/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-graphql-module",
    },
    "nestjs-service-file": {
      aliases: ["nsf"],
      description: "Generate NestJS service and unit test files",
      name: "nestjs-service-file",
      schemaPath:
        "configuration/conformetry-templates/nestjs-service-file/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-service-file",
    },
    "nestjs-service-module": {
      aliases: ["nsm"],
      description:
        "Generate a NestJS service module with module, service, types, constants, and unit test files",
      name: "nestjs-service-module",
      schemaPath:
        "configuration/conformetry-templates/nestjs-service-module/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/nestjs-service-module",
    },
    "react-component": {
      aliases: ["c"],
      description: "Generate a React component with test file",
      name: "react-component",
      schemaPath:
        "configuration/conformetry-templates/react-component/schema.json",
      targetPathStrategy: "name",
      templateDirectoryPath:
        "configuration/conformetry-templates/react-component",
    },
  },
};

export default conformetryConfiguration;
