/**
 * Maps project tags to conformetry template rule names.
 */
export const TEMPLATE_RULE_NAMES_BY_PROJECT_TAG: Readonly<
  Record<string, readonly string[]>
> = {
  "framework:react": ["react-component"],
  "generator:jupyter-notebook-application": ["jupyter-notebook-application"],
  "generator:nestjs-command-application": [
    "nestjs-command-application",
    "nestjs-command-module",
    "nestjs-service-file",
    "nestjs-service-module",
  ],
  "generator:nestjs-graphql-application": [
    "nestjs-graphql-application",
    "nestjs-graphql-module",
    "nestjs-service-file",
    "nestjs-service-module",
  ],
  "generator:nestjs-service-package": [
    "nestjs-service-package",
    "nestjs-service-file",
    "nestjs-service-module",
  ],
};

export const PROJECT_METADATA_FILENAME = "project.json";

export const SKIPPED_DIRECTORY_NAMES = new Set<string>([
  ".git",
  "dist",
  "node_modules",
]);
