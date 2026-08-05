import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";

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
      parameters: {
        description: {
          description: "Application description",
          type: "string",
        },
        name: {
          description: "Application name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-command-application": {
      aliases: ["nca"],
      description:
        "Generate a NestJS command-line application using nest-commander",
      name: "nestjs-command-application",
      parameters: {
        name: {
          description: "Project name (kebab-case)",
          type: "string",
        },
        type: {
          description: "Project type (application, package, or tools)",
          type: "string",
        },
      },
    },
    "nestjs-command-module": {
      aliases: ["ncm"],
      description:
        "Generate a NestJS command module with command, module, and unit test files",
      name: "nestjs-command-module",
      parameters: {
        name: {
          description: "Module name in kebab-case",
          type: "string",
        },
        project: {
          description: "Parent project name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-dataloader-module": {
      aliases: ["ndm"],
      description:
        "Generate a NestJS dataloader module with dataloader, types, and unit test files",
      name: "nestjs-dataloader-module",
      parameters: {
        name: {
          description: "Module name in kebab-case",
          type: "string",
        },
        project: {
          description: "Parent project name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-graphql-application": {
      aliases: ["nga"],
      description: "Generate a NestJS GraphQL API application",
      name: "nestjs-graphql-application",
      parameters: {
        name: {
          description: "Application name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-graphql-module": {
      aliases: ["ngm"],
      description:
        "Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files",
      name: "nestjs-graphql-module",
      parameters: {
        name: {
          description: "Module name in kebab-case",
          type: "string",
        },
        project: {
          description: "Parent project name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-service-file": {
      aliases: ["nsf"],
      description: "Generate NestJS service and unit test files",
      name: "nestjs-service-file",
      parameters: {
        module: {
          description: "Target module name in kebab-case",
          type: "string",
        },
        name: {
          description: "Service name in kebab-case",
          type: "string",
        },
        project: {
          description: "Parent project name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-service-module": {
      aliases: ["nsm"],
      description:
        "Generate a NestJS service module with module, service, types, constants, and unit test files",
      name: "nestjs-service-module",
      parameters: {
        name: {
          description: "Module name in kebab-case",
          type: "string",
        },
        project: {
          description: "Parent project name in kebab-case",
          type: "string",
        },
      },
    },
    "nestjs-service-package": {
      aliases: ["nsp"],
      description:
        "Generate a NestJS service package template for internal workspace libraries",
      name: "nestjs-service-package",
      parameters: {
        name: {
          description: "Project name (kebab-case)",
          type: "string",
        },
        type: {
          description: "Project type (application, package, or tools)",
          type: "string",
        },
      },
    },
    "react-component": {
      aliases: ["c"],
      description: "Generate a React component with test file",
      name: "react-component",
      parameters: {
        name: {
          description: "Component name in kebab-case",
          type: "string",
        },
        project: {
          description: "Parent project name in kebab-case",
          type: "string",
        },
      },
    },
  },
};

export default conformetryConfiguration;
