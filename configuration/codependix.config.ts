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
 * `packages/codependix-examples` — see its `README.md`, and the
 * `configuration-resolution` and `refusals` examples in particular. This file is the only production configuration
 * codependix has; those are where the shape is explained.
 *
 * `target: "markdown"` here costs nothing for a project a given graph type
 * does not apply to: a project that is not a NestJS project or carries no
 * `tsconfig.json` simply never appears in that graph type's results (see
 * `NestjsProjectService` and `TypescriptProjectService`).
 */
const codependixConfiguration: CodependixConfiguration = {
  /**
   * Rules every built graph is judged against, keyed by graph level and
   * gated by `--check boundaries` — never by `--check reports`, which is
   * about stale exports and belongs on the default branch. A broken boundary
   * is caused by the branch and fixed by it, so it gates every pull request.
   *
   * Four rules, every one of them verified to hold across `packages/`,
   * `applications/`, and `tools/` before it was written down. That is
   * deliberate, and the same reasoning `callidescope.config.ts` sets out for
   * its `maximumDepth`: a rule that arrives red is a backlog rather than a
   * gate, and a red pipeline nobody can act on teaches people to ignore it.
   *
   * One was drafted and dropped — "no `*.command.ts` imports another
   * `*.command.ts`". It does not hold: `lexico-ingestion` and
   * `synchronization` both compose an aggregate command out of the commands
   * beneath it, which is nest-commander's own subcommand arrangement rather
   * than a layering mistake. Fourteen edges is a backlog, so it is written
   * here as a note instead of there as a rule.
   *
   * No `pythonImports` rules yet, and that costs nothing:
   * `BoundaryCheckService` never builds a level nothing judges, so a level
   * named here is the only kind that is ever built.
   *
   * No `acyclic` rule at the `nestjs` level either, and the reason is the
   * level itself rather than the workspace. `NestjsModuleGraph` identifies a
   * module by its class name and nothing else, so two same-named modules in
   * two different packages collapse into one node — `codometer-cli` draws
   * `ChangesModule --> ChangesModule` and `ConfigurationModule -->
   * ConfigurationModule` for exactly that reason. A cycle rule there reports
   * those name collisions as self-loops, which is a backlog about the
   * graph's identity model rather than a finding about the code. It can be
   * seeded once `codependix-nestjs` learns each module's declaring file.
   */
  boundaries: {
    imports: [
      {
        from: { path: ["**/*.types.ts"] },
        kind: "forbid",
        message:
          "A *.types.ts file must not import a service. Types are the leaf of a module: a service importing its own types is the direction that works, and the reverse is what makes a module impossible to read from its type declarations alone.",
        name: "types-files-do-not-reach-services",
        to: { path: ["**/*.service.ts"] },
      },
      {
        from: { path: ["**/*.constants.ts"] },
        kind: "forbid",
        message:
          "A *.constants.ts file must not import a service. A constant that needs a service is not a constant, and the module-file layering AGENTS.md declares under NestJS class file shape says so — enforced until now only as far as where a file sits, never what it may reach.",
        name: "constants-files-do-not-reach-services",
        to: { path: ["**/*.service.ts"] },
      },
    ],
    nestjs: [
      {
        from: { id: ["*"] },
        kind: "forbid",
        message:
          "A root module composes an application; nothing inside one may import it back. This is the one rule at this level, and the level had no gate of any kind before — neither this repository nor the ESLint ecosystem enforces anything about a NestJS container's shape, because a module edge is what the container resolved rather than what a file declared.",
        name: "nothing-imports-a-root-module",
        to: { id: ["MainModule"] },
      },
    ],
    nx: [
      {
        kind: "acyclic",
        message:
          "Two projects that depend on each other cannot be built, released, or reasoned about apart. Stated here rather than left to Nx because an implicit edge closes a cycle just as a real import does, and `@nx/enforce-module-boundaries` has no import statement to flag for one.",
        name: "no-project-cycles",
      },
      {
        from: {
          id: [
            "codependix-configuration",
            "codependix-imports",
            "codependix-nestjs",
            "codependix-nx",
          ],
        },
        kind: "forbid",
        message:
          "The four graph builders and the configuration package are leaves: none of them may depend on another codependix package. Only codependix-cli composes them, which is what lets a host take one graph builder without dragging the others behind it.",
        name: "codependix-graph-builders-are-leaves",
        to: { id: ["codependix-*"] },
      },
      {
        from: { id: ["codependix-boundaries"] },
        kind: "forbid",
        message:
          "codependix-boundaries builds each level's graph and judges it, and is called by a host rather than calling one. Depending back on codependix-cli would close a cycle between the host and the logic it hosts, which is the one direction this package may never point.",
        name: "codependix-boundaries-does-not-reach-the-host",
        to: { id: ["codependix-cli"] },
      },
    ],
  },
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
