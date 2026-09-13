import {
  type CallidescopeConfiguration,
  type CallidescopeLimits,
  type CallidescopeProjectConfiguration,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_PROJECT_README_HEADING,
} from "@callidescope/configuration";

/**
 * What every project in this repository is held to unless it says otherwise.
 *
 * **Defaults, never ceilings.** Each limit here is what a project falls back
 * to, and a project declaring a number *higher* than one of these keeps its
 * own — nothing clamps it. That has to be true for the numbers below to mean
 * anything: a workspace limit is pinned by the single worst stack anywhere in
 * the repository, so reading it as a ceiling would hold every project to the
 * worst one's allowance, which is the arrangement the per-project gate exists
 * to replace. The gate a branch runs reads a project's own resolved limit and
 * never this object directly.
 *
 * A project's own `callidescope.config.ts` writes only the limits it overrides
 * — `limits: { maximumDepth: 10 }`, and nothing beside it. Writing the
 * override alone drops nothing: `ProjectConfigurationService` resolves each
 * limit on its own, falling back to the workspace's number per limit rather
 * than per object, so a project that names one keeps the other. A spread has
 * nothing left to contribute anyway, `maximumDepth` and `maximumBreadth` being
 * the only two limits there are.
 *
 * A project's file also carries no type annotation, and so no import of
 * `CallidescopeConfiguration`. An `import type` is still an Nx dependency
 * edge: it puts `@callidescope/configuration` into that project's graph, it
 * widens what the project's own `gate` target has to trace, and it asks the
 * manifest of a project like `logger` to declare a toolchain package that
 * project does not use. What it would buy is a second check of something
 * already checked: the four fields a project may set are validated when the
 * file is read and a fifth is refused by name, and every project's
 * `tsconfig.json` names its own file, so the object literal is compiled either
 * way. `packages/callidescope-examples` is the annotated exception on purpose:
 * its two configuration files are the worked examples of this shape, and it
 * depends on the configuration package for real.
 *
 * ## The projects that override nothing
 *
 * Thirty-two projects under `packages/` now declare their own measured depth.
 * There used to be a reason more inherited the number below, and
 * consolidating the conformetry Languages removed it: five leaf analyzers —
 * `conformetry-typescript`, `-json`, `-jupyter`, `-python`, `-text` — each
 * held real code that rooted nothing, because every one of them was entered
 * from above rather than directly, so each measured zero however much it did.
 * They are now modules of `conformetry-languages`, and what was a call
 * between packages is a call inside one, so a scoped run finally enters at a
 * surface of its own and measures four rather than zero. That package
 * declares four and gates like any other.
 *
 * The dependency closure a scoped run traces did fix this for
 * `codometer-changes`, which measured zero before it and ten after. The ten
 * with no caller are a different phenomenon and the closure does not reach
 * them: it supplies the callees a stack descends into, and what these are
 * missing is a caller.
 *
 * ## The projects traced by nothing
 *
 * Seven projects are not measured at all, rather than inheriting the number
 * below. The four skill packages — `callidescope-agents`,
 * `codependix-agents`, `codometer-agents`, `conformetry-agents` — hold barely
 * a callable between them, the same landmine a real project would avoid by
 * declaring its own number rather than being gated at zero, except these have
 * no real code underneath to ever grow into. And
 * `codependix-examples`, `codometer-examples`, and `conformetry-examples` are
 * fixture corpora rather than libraries: a depth number over one reports on a
 * corpus's incidental shape instead of on production code, the same reason
 * `packages/callidescope-examples` is excluded below in favor of its own
 * report-freshness gate.
 *
 * A project cannot exclude itself this way — discovery finds a project's
 * `tsconfig.json` before that project's own `callidescope.config.ts` is ever
 * read, so removing a project from tracing has to happen at the workspace's
 * own file. `configuration/.callidescopeignore` is where all seven are named,
 * beside `packages/callidescope-examples` and the other exclusions this
 * workspace declares.
 *
 * Six projects under `applications/` and `tools/` declare their own measured
 * depth the same way, and none of them inherit — but two more things sit
 * outside what either task covers and still need writing down rather than
 * left implicit.
 *
 * `configuration/` measures depth 3 and holds its own `tsconfig.json`, so it
 * appears as a traced root — but it is not an Nx project, so no target can
 * ever be inferred onto it, and it is gated by nothing. It keeps being traced
 * and published by the workspace `write` run.
 *
 * `applications/JimmyPaolini` and `applications/affirmations` have no `gate`
 * target at all — a different fact from inheriting one. Inheriting means a
 * gate that runs and passes against the workspace number; these two have no
 * gate to pass. `JimmyPaolini` holds only a `package.json`, being the git
 * submodule this repository leaves deliberately uninitialized everywhere (see
 * `AGENTS.md`'s `### Git Worktrees`); `affirmations` is a Python Jupyter
 * notebook application holding no `tsconfig.json`, and the plugin infers its
 * targets only onto a project that holds one
 * (`packages/callidescope-nx/src/modules/plugin/plugin.service.ts:353`).
 *
 * Still exported although nothing imports it, because a rule needs a name to
 * be about.
 */
export const workspaceLimits = {
  /**
   * The default a project that declares nothing is judged by — and no longer
   * this repository's ratchet.
   *
   * **The ratchet is thirty-eight numbers now**, one per project that declares
   * its own, every one of them set from a boundary-tested run at its gate's own
   * scope: it passes at the number written and fails one below it. That is what
   * a ratchet is, and it is what this single number could never be. Seventeen
   * is the deepest stack anywhere in the repository, so as one workspace-wide
   * limit it gated the three projects near it and nothing else — `logger` at
   * four had thirteen frames of free rein, which is to say no gate at all.
   * `nx run callidescope-cli:start -- limits --config
   * configuration/callidescope.config.ts` prints the whole set and the file
   * each number is written in.
   *
   * **Lowering this number is not how the ratchet descends.** It reaches only
   * the projects that declare none of their own, and those are the ones with
   * no stack to gate — the four skill packages and `codependix-examples` hold
   * barely a callable between them. A number lowered here
   * fires on the first stack any of them grows rather than on a regression, and
   * the value it stands in for is exactly the one they cannot pick for
   * themselves. To tighten a project, write the boundary-tested number in that
   * project's own `callidescope.config.ts`; `## The projects that override
   * nothing` above says which projects those are and why each one inherits.
   *
   * The history is still worth keeping, because it is what the per-project
   * numbers were measured against. Set to the issue's suggested six, one
   * workspace limit failed on arrival with dozens of findings — a backlog
   * rather than a gate, and a red pipeline nobody can act on teaches people to
   * ignore it. It came down from 19 by removing three frames that were not
   * layers: a `FormsService` method that forwarded its arguments unchanged to
   * the forms builder, a rung of lexico-ingestion's finite-verb cascade whose
   * whole body re-ran three guards the rungs above had already applied, and a
   * caelundas method that destructured six fields and passed the same six on.
   * Nothing was merged that was doing work.
   *
   * Three stacks sit at 17 and are why it stopped there:
   * `LexicoIngestionCommand.run`, and callidescope-nx's `depthExecutor` and
   * `breadthExecutor`. Both of those projects now write that number in a file
   * of their own, where it gates the project owning the stack and nobody
   * else — which is the whole difference this ticket made. Sixteen
   * is one frame from each and neither frame is obviously spare — lexico's
   * seventeen are a command, a recursion pair, a parse, and the
   * mood/voice/tense/number/person descent, each of which earns its frame.
   * Reaching 16 by collapsing one of those would buy the number and cost the
   * code, which is the trade this comment exists to refuse.
   */
  maximumDepth: 17,
} satisfies CallidescopeLimits;

/**
 * What a project's own `callidescope.config.ts` spreads, and then overrides.
 *
 * The second of this file's two exports, and the second of its two roles. The
 * default export below is the *workspace run's* own configuration — the
 * directories it traces, the ignore file it reads, and the destinations it
 * writes — and is what a run loads. This object is what one *project* is held
 * to, and nothing here belongs to the run: a project spreading it cannot
 * accidentally adopt the workspace's own output destinations, because none of
 * them is in here to adopt.
 *
 * ```ts
 * import { projectDefaults } from "../../configuration/callidescope.config.js";
 *
 * export default {
 *   ...projectDefaults,
 *   limits: { maximumBreadth: undefined, maximumDepth: 4 },
 * };
 * ```
 *
 * A relative import resolved by the configuration loader when it reads the
 * file, rather than a package dependency, so spreading this adds no edge to a
 * project's dependency graph — the same arrangement forty-nine
 * `codometer.config.ts` files in this repository already run on.
 *
 * **Every value here is the value a project already gets today.** The
 * decorators are the tool's own list, the entry-point switches are its own
 * defaults, `maximumDepth` is the workspace number a project that declares
 * nothing already falls back to, and the markdown destination is where the
 * README fan-out already puts that project's section. Spreading this is
 * therefore a no-op that makes the inheritance visible, which is the whole
 * point of the shape: what a project is held to becomes something a reader can
 * see in the project's own file rather than resolve across two.
 *
 * Nothing spreads it yet. The capability lands first so that the thirty-eight
 * project files can migrate in reviewable batches while the branch stays
 * green, and until one of them does, every project loads exactly as before.
 */
export const projectDefaults = {
  entryPoints: {
    addresses: [],
    decorators: [...DEFAULT_ENTRY_POINT_DECORATORS],
    includeExportedFunctions: true,
    includeOrphans: true,
    includeTests: false,
  },
  exclude: [],
  limits: {
    /**
     * Left unset, and required to be written either way.
     *
     * Breadth is gated only where every callable at a project's widest number
     * is a closed enumeration, so a project declaring nothing here is making
     * the same statement the twenty projects without a breadth limit make
     * today — the difference being that it is now written down rather than
     * inferred from an absence.
     */
    maximumBreadth: undefined,
    maximumDepth: workspaceLimits.maximumDepth,
  },
  write: {
    /**
     * The block the README fan-out writes today, said by the project itself.
     *
     * The path is read relative to the project's own root, so this is the same
     * `<project>/README.md` the workspace declaration reaches — and a project
     * moving its section somewhere else, or writing `undefined` to publish
     * nothing at all, is now a one-line edit in the file that owns the
     * document.
     */
    markdown: {
      heading: DEFAULT_PROJECT_README_HEADING,
      path: "README.md",
    },
    /**
     * No diagram by default.
     *
     * A project's README carries the table today and nothing else, and turning
     * a diagram on for every project at once is a decision about thirty-eight
     * documents rather than a default. A project that wants one writes it here.
     */
    mermaid: undefined,
  },
} satisfies CallidescopeProjectConfiguration;

/**
 * The report is published on main, and only the depth gate runs on a branch.
 *
 * A generated block in a tracked file has to be regenerated by whoever changes
 * the thing it describes, and this one changes on nearly every pull request.
 * Codometer already documents where that leads — every branch rewrites the same
 * block and conflicts with every other one — which is why it measures on main
 * instead. A call-stack block inherits that, and something worse: staleness
 * would fail every pull request whose call graph moved until the author reran
 * the writer, burying the depth findings the gate exists to surface.
 *
 * So the two are split at the mechanism rather than by leaving the destination
 * unset. Depth — and, wherever a project declares `limits.maximumBreadth`,
 * breadth too — is gated by the inferred per-project `gate` target, an
 * executor of its own rather than a flag on this one, scoped by `nx affected`
 * to whatever a change touched. It reads no destination at all, so its exit
 * code is purely the depth (and, where judged, breadth) verdict.
 * `nx run codebase:callidescope:write` passes `--write`, and the release
 * workflow runs it on main. That is the only configuration this target
 * carries now: `lint-codebase` does not depend on it, so no run of it ever
 * forwards `write` here, and `defaultConfiguration` is `write` for the same
 * reason — there is nothing else left to default to.
 *
 * Every rule and finding this configuration turns on has a worked example in
 * `packages/callidescope-examples`, which also demonstrates the opposite half
 * of the split above: it gates `reports` rather than `depth`, because its
 * traced source is frozen fixture code. `.callidescopeignore` keeps it out of
 * this run, because its fixtures exist to breach the limits set here.
 *
 * - `packages/callidescope-examples/README.md` — how to read a stack, and how
 *   to act on a depth or breadth finding.
 * - `packages/callidescope-examples/AGENTS.md` — a "callidescope reported X →
 *   open this example" table, for an agent handed a failing run.
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  /**
   * `LoggerService` sits behind nearly every other callable in this
   * repository. A call to it is a fact about instrumentation, not about
   * how deep or wide the code around it is, and counting it would move
   * every other callable's depth and breadth on a change that has nothing
   * to do with them.
   */
  excludeCallees: ["LoggerService.*"],
  excludeFrom: ["configuration/.callidescopeignore"],
  limits: workspaceLimits,
  write: {
    /**
     * The workspace-scope block in the repository's own README.
     *
     * The root README used to carry a `projectReadmes` section like any other
     * project's, because the workspace root holds a `tsconfig.json` and so was
     * discovered as a project. What it described was the four loose
     * maintenance scripts that belonged to no other project — never the
     * workspace — and it was headed "Call stacks traced through ``", the
     * project's name being its root-relative path and the root's being empty.
     * `.callidescopeignore` now drops that project, and this destination puts
     * the whole run's report there instead: the summary, one row per project
     * against its own limit, and the findings nothing gates.
     *
     * `heading` is set because the block is spliced into a file that already
     * has a title. The default is `#`, and a second first-level heading is
     * something every markdown linter here rejects; the subsections follow
     * this level down to `###` on their own.
     *
     * Published by `nx run codebase:callidescope:write` on main, and for the
     * same reason as the per-project sections below it, never checked on a
     * pull request.
     */
    markdown: {
      description:
        "The workspace's call graph, traced by [callidescope](packages/callidescope-cli), regenerated by `nx run codebase:callidescope:write`. Projects are listed tightest-first: the rows at the top are the ones a ratchet cannot descend past.",
      heading: "## 🔭 Callidescope",
      path: "README.md",
    },
    /**
     * A section in every traced project's own README.
     *
     * Published by `nx run codebase:callidescope:write` on main. Deliberately
     * not checked on pull requests: the block moves whenever the call graph
     * does, so gating on its freshness would fail branches for being out of
     * date with `main` rather than for anything they did.
     */
    projectReadmes: {},
  },
};

export default callidescopeConfiguration;
