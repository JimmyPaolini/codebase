// ♟️ Constants

/** Project metadata file that marks a workspace project root. */
export const PROJECT_METADATA_FILENAME = "project.json";

/** Directories never descended into while scanning for projects. */
export const SKIPPED_DIRECTORY_NAMES = new Set<string>([
  ".git",
  ".nx",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "tmp",
]);

/**
 * Template directories are themselves full of `project.json` files.
 *
 * They describe what a project *should* look like, not a project that exists,
 * so scanning would report every template as a failing project.
 */
export const TEMPLATE_ROOT_PREFIX = "configuration/conformetry-templates/";

/** Directory holding a project's feature modules, for module-scoped rules. */
export const MODULES_DIRECTORY = "src/modules";

/** Prefix of the `project.json` tag naming a project's generator. */
export const GENERATOR_TAG_PREFIX = "generator:";

/** Module directory never validated as a feature module. */
export const EXCLUDED_MODULE_NAMES = new Set<string>(["logger"]);

/**
 * Which module directories each module generator governs.
 *
 * A module directory is not self-describing — `src/modules/widget` could be a
 * service module, a command module, or a GraphQL module — so the generator is
 * identified by the files present. Without this, every module generator is
 * compared against every module directory and each one demands the others'
 * files: a service module is told it is missing a `.resolver.ts`.
 *
 * `required` names suffixes that must exist, `forbidden` names suffixes whose
 * presence means a different generator owns the directory. Suffixes are
 * resolved against the directory name, so `widget/widget.service.ts`.
 */
export const MODULE_GENERATOR_MARKERS: Readonly<
  Record<string, { forbidden: string[]; required: string[] }>
> = {
  "nestjs-command-module": { forbidden: [], required: [".command.ts"] },
  "nestjs-dataloader-module": { forbidden: [], required: [".dataloader.ts"] },
  "nestjs-graphql-module": { forbidden: [], required: [".resolver.ts"] },
  "nestjs-service-module": {
    forbidden: [".command.ts", ".dataloader.ts", ".resolver.ts"],
    required: [".module.ts", ".service.ts"],
  },
};
