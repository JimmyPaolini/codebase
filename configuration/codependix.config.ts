import { type CodependixConfiguration } from "@codependix/configuration";

/**
 * Every project in the workspace — and the workspace root itself — gets a
 * Markdown export of its own Nx Neighborhood, NestJS module graph, and
 * file-level import graph, spliced into its `README.md` via codependix's
 * anchor-comment mechanism. That whole-repository coverage is declared, in
 * the one `include` line below, rather than assumed: `include` defaults to
 * nothing, so a configuration naming no project exports for none. No JSON
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
   * Every rule was verified to hold across `packages/`, `applications/`, and
   * `tools/` before it was written down. That is deliberate, and the same
   * reasoning `callidescope.config.ts` sets out for its `maximumDepth`: a rule
   * that arrives red is a backlog rather than a gate, and a red pipeline
   * nobody can act on teaches people to ignore it.
   *
   * The `nx` block restates all 32 `depConstraints` from
   * `configuration/eslint.config.ts`, translated mechanically:
   * `onlyDependOnLibsWithTags` is an `allow` rule, `notDependOnLibsWithTags`
   * is a `forbid` rule, and an empty `onlyDependOnLibsWithTags` — "may depend
   * on nothing" — is a `forbid` reaching everything.
   *
   * **This is a deliberate duplication, and it costs something.** Two places
   * now state the same layering, and a change to one has to be made in the
   * other. It is kept because the two gates do not see the same graph:
   * `@nx/enforce-module-boundaries` reads import statements, so an
   * `implicitDependencies` entry is invisible to it, while these rules read
   * the project graph and see both. Every rule here therefore gates at least
   * as much as its ESLint counterpart, and most gate more.
   *
   * One rule needed narrowing to arrive green, and it is the whole
   * demonstration: `conformetry-examples` declares an implicit dependency on
   * `conformetry-cli` that no import backs, which ESLint has nothing to flag.
   * It carries `edges: { implicit: false }` and says why. Nothing else needed
   * it.
   *
   * ESLint keeps one advantage this cannot match: it reports at the import
   * site, with a line number. Deleting the `depConstraints` in favour of these
   * would trade that away, so both run.
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
        from: { tags: ["type:application"] },
        kind: "allow",
        message:
          "An application composes packages; it never composes another application. Two applications that depend on each other cannot be deployed or versioned apart.",
        name: "applications-depend-only-on-packages",
        to: { tags: ["type:package"] },
      },
      {
        from: { tags: ["name:callidescope-configuration"] },
        kind: "forbid",
        message:
          "The callidescope chain points one way: configuration is the leaf, the graph builder reads it, the output renderer reads both, the command-line host composes all three, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-configuration-is-a-leaf",
        to: { id: ["*"] },
      },
      {
        from: { tags: ["name:callidescope-graph"] },
        kind: "allow",
        message:
          "The callidescope chain points one way: configuration is the leaf, the graph builder reads it, the output renderer reads both, the command-line host composes all three, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-graph-layer",
        to: { tags: ["name:callidescope-configuration", "name:logger"] },
      },
      {
        from: { tags: ["name:callidescope-output"] },
        kind: "allow",
        message:
          "The callidescope chain points one way: configuration is the leaf, the graph builder reads it, the output renderer reads both, the command-line host composes all three, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-output-layer",
        to: {
          tags: [
            "name:callidescope-configuration",
            "name:callidescope-graph",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:callidescope-cli"] },
        kind: "allow",
        message:
          "The callidescope chain points one way: configuration is the leaf, the graph builder reads it, the output renderer reads both, the command-line host composes all three, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-cli-layer",
        to: {
          tags: [
            "name:callidescope-configuration",
            "name:callidescope-graph",
            "name:callidescope-output",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:callidescope-nx"] },
        kind: "allow",
        message:
          "The callidescope chain points one way: configuration is the leaf, the graph builder reads it, the output renderer reads both, the command-line host composes all three, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-nx-layer",
        to: {
          tags: [
            "name:callidescope-cli",
            "name:callidescope-configuration",
            "name:callidescope-graph",
            "name:callidescope-output",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:codometer-configuration"] },
        kind: "forbid",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-configuration-is-a-leaf",
        to: { id: ["*"] },
      },
      {
        from: { tags: ["name:codometer-changes"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-changes-layer",
        to: { tags: ["name:logger"] },
      },
      {
        from: { tags: ["name:codometer-discovery"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-discovery-layer",
        to: { tags: ["name:codometer-configuration", "name:logger"] },
      },
      {
        from: { tags: ["name:codometer-languages"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-languages-layer",
        to: { tags: ["name:codometer-configuration", "name:logger"] },
      },
      {
        from: { tags: ["name:codometer-customization"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-customization-layer",
        to: {
          tags: ["name:codometer-configuration", "name:codometer-languages"],
        },
      },
      {
        from: { tags: ["name:codometer-size"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-size-layer",
        to: { tags: ["name:codometer-configuration", "name:logger"] },
      },
      {
        from: { tags: ["name:codometer-output"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-output-layer",
        to: {
          tags: [
            "name:codometer-changes",
            "name:codometer-configuration",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:codometer-cli"] },
        kind: "allow",
        message:
          "The codometer chain points one way: configuration and the measurement packages are leaves, the output renderer joins a change collection to a report, and the command-line host composes all of them.",
        name: "codometer-cli-layer",
        to: {
          tags: [
            "name:codometer-changes",
            "name:codometer-configuration",
            "name:codometer-customization",
            "name:codometer-discovery",
            "name:codometer-languages",
            "name:codometer-output",
            "name:codometer-size",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:conformetry-core"] },
        kind: "forbid",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-core-is-a-leaf",
        to: { id: ["*"] },
      },
      {
        from: { tags: ["name:conformetry-generation"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-generation-layer",
        to: { tags: ["name:conformetry-core"] },
      },
      {
        from: { tags: ["name:conformetry-configuration"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-configuration-layer",
        to: { tags: ["name:conformetry-core", "name:conformetry-generation"] },
      },
      {
        from: { tags: ["name:conformetry-files"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-files-layer",
        to: {
          tags: ["name:conformetry-configuration", "name:conformetry-core"],
        },
      },
      {
        from: { tags: ["name:conformetry-json"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-json-layer",
        to: {
          tags: ["name:conformetry-configuration", "name:conformetry-core"],
        },
      },
      {
        from: { tags: ["name:conformetry-markdown"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-markdown-layer",
        to: {
          tags: ["name:conformetry-configuration", "name:conformetry-core"],
        },
      },
      {
        from: { tags: ["name:conformetry-python"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-python-layer",
        to: {
          tags: ["name:conformetry-configuration", "name:conformetry-core"],
        },
      },
      {
        from: { tags: ["name:conformetry-text"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-text-layer",
        to: {
          tags: ["name:conformetry-configuration", "name:conformetry-core"],
        },
      },
      {
        from: { tags: ["name:conformetry-typescript"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-typescript-layer",
        to: {
          tags: ["name:conformetry-configuration", "name:conformetry-core"],
        },
      },
      {
        from: { tags: ["name:conformetry-jupyter"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-jupyter-layer",
        to: {
          tags: [
            "name:conformetry-configuration",
            "name:conformetry-core",
            "name:conformetry-json",
            "name:conformetry-markdown",
            "name:conformetry-python",
          ],
        },
      },
      {
        from: { tags: ["name:conformetry-validation"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-validation-layer",
        to: {
          tags: [
            "name:conformetry-configuration",
            "name:conformetry-core",
            "name:conformetry-files",
            "name:conformetry-json",
            "name:conformetry-jupyter",
            "name:conformetry-markdown",
            "name:conformetry-python",
            "name:conformetry-text",
            "name:conformetry-typescript",
          ],
        },
      },
      {
        from: { tags: ["name:conformetry"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-layer",
        to: {
          tags: [
            "name:conformetry-configuration",
            "name:conformetry-core",
            "name:conformetry-generation",
            "name:conformetry-validation",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:conformetry-nx"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-nx-layer",
        to: {
          tags: [
            "name:conformetry-configuration",
            "name:conformetry-core",
            "name:conformetry-generation",
            "name:conformetry-json",
            "name:conformetry-jupyter",
            "name:conformetry-markdown",
            "name:conformetry-python",
            "name:conformetry-text",
            "name:conformetry-typescript",
            "name:conformetry-validation",
            "name:logger",
          ],
        },
      },
      {
        edges: { implicit: false },
        from: { tags: ["name:conformetry-examples"] },
        kind: "allow",
        message:
          "The examples package sits above every runtime package and above the Nx host, and may not import the command-line host — the claim its embedding example makes. Narrowed to explicit edges because its `implicitDependencies` entry on conformetry-cli is a task-graph dependency, so its examples re-run when the host changes, rather than an import.",
        name: "conformetry-examples-layer",
        to: {
          tags: [
            "name:conformetry-configuration",
            "name:conformetry-core",
            "name:conformetry-generation",
            "name:conformetry-nx",
            "name:conformetry-validation",
          ],
        },
      },
      {
        from: { tags: ["type:package"] },
        kind: "forbid",
        message:
          "A package is shared code and must stay usable without whatever application happens to consume it.",
        name: "packages-do-not-depend-on-applications",
        to: { tags: ["type:application"] },
      },
      {
        from: { tags: ["framework:react"] },
        kind: "forbid",
        message:
          "A React project must not pull a NestJS container into a browser bundle.",
        name: "react-does-not-depend-on-nestjs",
        to: { tags: ["framework:nestjs"] },
      },
      {
        from: { tags: ["domain:caelundas"] },
        kind: "forbid",
        message:
          "The two domains share no code by design; anything genuinely common belongs in a package neither owns.",
        name: "caelundas-does-not-reach-lexico",
        to: { tags: ["domain:lexico"] },
      },
      {
        from: { tags: ["domain:lexico"] },
        kind: "forbid",
        message:
          "The two domains share no code by design; anything genuinely common belongs in a package neither owns.",
        name: "lexico-does-not-reach-caelundas",
        to: { tags: ["domain:caelundas"] },
      },
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
  /**
   * Every project participates, stated rather than assumed.
   *
   * `include` defaults to nothing so that participation is always declared —
   * see `DEFAULT_INCLUDE_GLOBS`. Dropping this line does not fall back to
   * whole-workspace coverage; it stops every export instead, and quietly,
   * since `--check boundaries` judges every project regardless and stays
   * green. `codependix --write` warns when it happens.
   */
  include: ["**"],
  workspace: {
    nx: {
      markdown: { anchor: "codependix-workspace" },
      target: "markdown",
    },
  },
};

export default codependixConfiguration;
