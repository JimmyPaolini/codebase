import {
  type CodependixConfiguration,
  type CodependixProjectConfiguration,
} from "@codependix/configuration";

/**
 * What a project's own `codependix.config.ts` spreads, and then overrides.
 *
 * Mirrors `configuration/callidescope.config.ts`'s `projectDefaults` export:
 * a project gets its own dependency graph spliced into its own `README.md`
 * only by writing a file that spreads this object — `include`/`exclude`
 * below still scope which projects contribute to the workspace-level graphs
 * and get judged by `boundaries`, but no longer imply per-project output on
 * their own. A project with no file of its own participates in both of
 * those, and produces no export of its own.
 *
 * ```ts
 * import { projectDefaults } from "../../configuration/codependix.config.js";
 *
 * export default {
 *   ...projectDefaults,
 * };
 * ```
 *
 * A relative import resolved by the configuration loader when it reads the
 * file, rather than a package dependency, so spreading this adds no edge to
 * a project's dependency graph.
 */
export const projectDefaults = {
  /**
   * Each anchor is named after the package that builds the graph it holds —
   * `codependix-file-imports`, `codependix-nestjs-modules`,
   * `codependix-nx-projects` — so a block in a README names the thing that
   * wrote it rather than an abbreviation of it.
   *
   * **Renaming one of these is a two-place change, and doing half of it
   * stops every release.** An anchor a README no longer carries is not an
   * error: `--write` appends a fresh section below the orphaned block
   * instead of replacing it, and the duplicate `###` headings then fail
   * `markdown-lint` inside the pre-commit hook that `@semantic-release/git`
   * fires for the version commit. That happens in `prepare`, before
   * `publish`, so nothing reaches a registry — the release simply never
   * happens, and the failure names a markdown rule rather than an anchor.
   * #842 renamed these anchors in every README and not here, and no release
   * was published between it and #857.
   *
   * So rename here and re-splice every README in the same commit, and let
   * `codebase:codependix:check` prove it — bearing in mind that it runs on
   * `main` and nowhere else, so a pull request cannot catch this.
   */
  fileImports: {
    markdown: { anchor: "codependix-file-imports" },
    target: "markdown",
  },
  nestjsModules: {
    markdown: { anchor: "codependix-nestjs-modules" },
    target: "markdown",
  },
  nxProjects: {
    markdown: { anchor: "codependix-nx-projects" },
    target: "markdown",
  },
} satisfies CodependixProjectConfiguration;

/**
 * `include`/`exclude` scope which projects contribute to the workspace-level
 * graphs below and get judged by `boundaries` — unrelated to per-project
 * output, which a project now opts into by writing its own
 * `codependix.config.ts` spreading `projectDefaults` above.
 *
 * Every field below, and every refusal a configuration can be rejected with, is
 * resolved by the real loader and rendered as a worked example in
 * `packages/ic-suite/codependix/codependix-examples` — see its `README.md`, and the
 * `configuration-resolution` and `refusals` examples in particular. This file is the only production configuration
 * codependix has; those are where the shape is explained.
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
   * The `nxProjects` block restates all 32 `depConstraints` from
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
   * No Python rules yet under `fileImports`, and that costs nothing:
   * `BoundaryCheckService` never builds a level nothing judges, so a level
   * named here is the only kind that is ever built.
   *
   * No `acyclic` rule at the `nestjsModules` level either, and the reason is
   * the level itself rather than the workspace. `NestjsModuleGraph`
   * identifies a module by its class name and nothing else, so two
   * same-named modules in two different packages collapse into one node —
   * `codometer-cli` draws `ChangesModule --> ChangesModule` and
   * `ConfigurationModule --> ConfigurationModule` for exactly that reason. A
   * cycle rule there reports those name collisions as self-loops, which is a
   * backlog about the graph's identity model rather than a finding about the
   * code. It can be seeded once `codependix-nestjs-modules` learns each
   * module's declaring file.
   */
  boundaries: {
    fileImports: {
      typescript: [
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
    },
    nestjsModules: [
      {
        from: { id: ["*"] },
        kind: "forbid",
        message:
          "A root module composes an application; nothing inside one may import it back. This is the one rule at this level, and the level had no gate of any kind before — neither this repository nor the ESLint ecosystem enforces anything about a NestJS container's shape, because a module edge is what the container resolved rather than what a file declared.",
        name: "nothing-imports-a-root-module",
        to: { id: ["MainModule"] },
      },
    ],
    nxProjects: [
      {
        from: { tags: ["type:application"] },
        kind: "allow",
        message:
          "An application composes packages; it never composes another application. Two applications that depend on each other cannot be deployed or versioned apart.",
        name: "applications-depend-only-on-packages",
        to: { tags: ["type:package"] },
      },
      // 🔭 Callidescope
      {
        from: { tags: ["name:callidescope-core"] },
        kind: "forbid",
        message:
          "The callidescope spine points one way: core is the contracts leaf, configuration resolves the file and the flags over it, the graph builder analyzes, the output renderer reads both, the command-line host composes them, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-core-is-a-leaf",
        to: { id: ["*"] },
      },
      {
        from: { tags: ["name:callidescope-configuration"] },
        kind: "allow",
        message:
          "The callidescope spine points one way: core is the contracts leaf, configuration resolves the file and the flags over it, the graph builder analyzes, the output renderer reads both, the command-line host composes them, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-configuration-layer",
        to: { tags: ["name:callidescope-core", "name:logger"] },
      },
      {
        from: { tags: ["name:callidescope-graph"] },
        kind: "allow",
        message:
          "The callidescope spine points one way: core is the contracts leaf, configuration resolves the file and the flags over it, the graph builder analyzes, the output renderer reads both, the command-line host composes them, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-graph-layer",
        to: {
          tags: [
            "name:callidescope-configuration",
            "name:callidescope-core",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:callidescope-output"] },
        kind: "allow",
        message:
          "The callidescope spine points one way: core is the contracts leaf, configuration resolves the file and the flags over it, the graph builder analyzes, the output renderer reads both, the command-line host composes them, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-output-layer",
        to: {
          tags: [
            "name:callidescope-configuration",
            "name:callidescope-core",
            "name:callidescope-graph",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:callidescope-cli"] },
        kind: "allow",
        message:
          "The callidescope spine points one way: core is the contracts leaf, configuration resolves the file and the flags over it, the graph builder analyzes, the output renderer reads both, the command-line host composes them, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-cli-layer",
        to: {
          tags: [
            "name:callidescope-configuration",
            "name:callidescope-core",
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
          "The callidescope spine points one way: core is the contracts leaf, configuration resolves the file and the flags over it, the graph builder analyzes, the output renderer reads both, the command-line host composes them, and the Nx plugin sits on top so `@nx/devkit` never reaches a package that traces.",
        name: "callidescope-nx-layer",
        to: {
          tags: [
            "name:callidescope-cli",
            "name:callidescope-configuration",
            "name:callidescope-core",
            "name:callidescope-graph",
            "name:callidescope-output",
            "name:logger",
          ],
        },
      },
      // 🕸️ Codependix
      {
        from: { tags: ["name:codependix-core"] },
        kind: "forbid",
        message:
          "The codependix chain points one way: core is the contracts leaf, configuration resolves the config file and the command line over it, the four analyzers read both, the output renderer reads all of them, and the command-line host composes the lot.",
        name: "codependix-core-is-a-leaf",
        to: { id: ["*"] },
      },
      {
        from: { tags: ["name:codependix-configuration"] },
        kind: "allow",
        message:
          "The codependix chain points one way: core is the contracts leaf, configuration resolves the config file and the command line over it, the four analyzers read both, the output renderer reads all of them, and the command-line host composes the lot.",
        name: "codependix-configuration-layer",
        to: { tags: ["name:codependix-core"] },
      },
      {
        from: {
          id: [
            "codependix-file-imports",
            "codependix-nestjs-modules",
            "codependix-nx-projects",
          ],
        },
        kind: "allow",
        message:
          "The three graph builders are analysis leaves: each reads the contracts and the resolved configuration and nothing else, which is what lets a host take one graph builder without dragging the others behind it. Narrowed from the rule that let them reach no codependix package at all, now that core and configuration sit beneath them.",
        name: "codependix-graph-builders-are-leaves",
        to: {
          tags: [
            "name:codependix-configuration",
            "name:codependix-core",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:codependix-boundaries"] },
        kind: "allow",
        message:
          "codependix-boundaries builds each level's graph and judges it, and is called by a host rather than calling one. It sits at the top of the analysis layer — the one analyzer that reads the other three — and may never reach the renderer or the host above it.",
        name: "codependix-boundaries-layer",
        to: {
          tags: [
            "name:codependix-configuration",
            "name:codependix-core",
            "name:codependix-file-imports",
            "name:codependix-nestjs-modules",
            "name:codependix-nx-projects",
          ],
        },
      },
      {
        from: { tags: ["name:codependix-output"] },
        kind: "allow",
        message:
          "The codependix chain points one way: core is the contracts leaf, configuration resolves the config file and the command line over it, the four analyzers read both, the output renderer reads all of them, and the command-line host composes the lot.",
        name: "codependix-output-layer",
        to: {
          tags: [
            "name:codependix-boundaries",
            "name:codependix-configuration",
            "name:codependix-core",
            "name:codependix-file-imports",
            "name:codependix-nestjs-modules",
            "name:codependix-nx-projects",
            "name:logger",
          ],
        },
      },
      {
        from: { tags: ["name:codependix-cli"] },
        kind: "allow",
        message:
          "The codependix chain points one way: core is the contracts leaf, configuration resolves the config file and the command line over it, the four analyzers read both, the output renderer reads all of them, and the command-line host composes the lot.",
        name: "codependix-cli-layer",
        to: {
          tags: [
            "name:codependix-boundaries",
            "name:codependix-configuration",
            "name:codependix-core",
            "name:codependix-output",
            "name:logger",
          ],
        },
      },
      // ⏲️ Codometer
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
      // 👔 Conformetry
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
        from: { tags: ["name:conformetry-languages"] },
        kind: "allow",
        message:
          "The conformetry chain points one way, with `conformetry-core` as the leaf every other package may reach and `conformetry-generation` owning template rendering.",
        name: "conformetry-languages-layer",
        to: { tags: ["name:conformetry-core"] },
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
            "name:conformetry-languages",
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
    ],
  },
  /**
   * Every project participates in the workspace-level graphs and boundary
   * checking, stated rather than assumed.
   *
   * `include` defaults to nothing so that participation is always declared —
   * see `DEFAULT_INCLUDE_GLOBS`. This no longer implies per-project README
   * output on its own: a project matched here that carries no
   * `codependix.config.ts` of its own contributes to the workspace-level
   * graphs below and is judged by `boundaries`, but produces no export of
   * its own. Getting one requires the project's own file, spreading
   * `projectDefaults` above.
   */
  include: ["**"],
  /**
   * All three graph types are exported once for the whole repository, each
   * spliced into its own anchor under the root README's `## 🕸️ Codependix`
   * heading.
   *
   * The anchor names are the same three `projectDefaults` uses, rather than
   * a `codependix-workspace-*` set of their own. An anchor is resolved
   * within one file, and these three are the only blocks the root
   * `README.md` carries: the workspace export writes there, and a
   * per-project export writes to its own project's README. Nothing collides
   * until the root itself gets a `codependix.config.ts` — which would then
   * be a fourth through sixth block in this same file, and would need its
   * own `path` or its own anchors.
   */
  workspace: {
    fileImports: {
      markdown: { anchor: "codependix-file-imports" },
      target: "markdown",
    },
    nestjsModules: {
      markdown: { anchor: "codependix-nestjs-modules" },
      target: "markdown",
    },
    nxProjects: {
      markdown: { anchor: "codependix-nx-projects" },
      target: "markdown",
    },
  },
};

export default codependixConfiguration;
