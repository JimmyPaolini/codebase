import { type CodependixConfiguration } from "@codependix/configuration";

/**
 * Every project in the workspace — and the workspace root itself — gets a
 * Markdown export of its own Nx Neighborhood, NestJS module graph, and
 * file-level import graph, spliced into its `README.md` via codependix's
 * anchor-comment mechanism. The same "cover the whole repository by default"
 * philosophy `codometer.config.ts` and `callidescope.config.ts` both follow,
 * but for real this time: no explicit include list is needed, and no JSON
 * output is produced by default at all.
 *
 * Markdown used to be the opt-in exception here, because `AnchorsService`
 * treated a missing anchor block as an error rather than creating one — a
 * deliberate choice so that placing a Markdown export stayed something a
 * human did once, by hand, rather than codependix guessing where in a
 * document it belonged. That could not scale to every project in the
 * workspace, since nobody has hand-placed anchor blocks everywhere. Now
 * `DeliveryService` auto-creates a missing `## 🕸️ Codependix` section on
 * `--write` — appending it to the end of the file, or inserting a new
 * `### <Subheading>` under an existing section — and only a project with no
 * `README.md` at all still fails outright. A `--check` run against a project
 * that has never had codependix output simply reports it as stale, the same
 * as any other drift this tool reports.
 *
 * Every field below, and every refusal a configuration can be rejected with, is
 * resolved by the real loader and rendered as a worked example in
 * `packages/codependix-examples` — see its `README.md`, and `output/08` and
 * `output/13` in particular. This file is the only production configuration
 * codependix has; those are where the shape is explained.
 *
 * `target: "markdown"` here costs nothing for a project a given graph type
 * does not apply to: a project that is not a NestJS project or carries no
 * `tsconfig.json` simply never appears in that graph type's results (see
 * `NestjsProjectService` and `TypescriptProjectService`).
 */
const codependixConfiguration: CodependixConfiguration = {
  defaults: {
    imports: {
      markdown: { anchor: "codependix-imports" },
      target: "markdown",
    },
    nestjs: {
      markdown: { anchor: "codependix-nestjs" },
      target: "markdown",
    },
    nx: {
      markdown: { anchor: "codependix-nx" },
      target: "markdown",
    },
    pythonImports: {
      markdown: { anchor: "codependix-imports-python" },
      target: "markdown",
    },
  },
  workspace: {
    nx: {
      markdown: { anchor: "codependix-workspace" },
      target: "markdown",
    },
  },
};

export default codependixConfiguration;
