import {
  type CallidescopeConfiguration,
  type CallidescopeLimits,
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
 * — `limits: { maximumDepth: 10 }`, and nothing beside it. **Never spread this
 * object into one.** `spreadThreshold` is a limit only a workspace may set, and
 * a project file carrying it is refused outright before anything is traced.
 *
 * Writing the override alone drops nothing. `ProjectConfigurationService`
 * resolves each limit on its own, falling back to the workspace's number per
 * limit rather than per object, so a project that names one keeps every other
 * one it inherits. And a spread has nothing left to contribute anyway:
 * `maximumDepth` and `maximumBreadth` are the only two limits a project may
 * set, so it would supply exactly the field being overridden, plus the one that
 * gets the file rejected.
 *
 * `codometer.config.ts`'s `compiledJavaScriptTarget`, beside this file in this
 * directory, is a precedent that does not transfer, and reasoning from it is
 * what once wrote this rule inverted. That object is a target: one element of a
 * list, `Omit`-typed because it is deliberately incomplete, with no per-field
 * fallback anywhere behind it. A project replacing it wholesale really does
 * lose every counter it did not restate, which is what lexico did. A limit is
 * neither a list element nor incomplete, and does have that fallback.
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
 * Thirty-two projects under `packages/` now declare their own measured depth,
 * and six declare nothing and are held to the number below. Two reasons,
 * neither of them that nobody got to them. The four skill packages —
 * `callidescope-agents`, `codependix-agents`, `codometer-agents`,
 * `conformetry-agents` — and `codependix-examples` hold between zero and three
 * callables, so there is no stack of theirs to gate. Gating that at zero would
 * fail on the first stack of any length, which is a landmine rather than a
 * ratchet.
 *
 * There used to be a third reason, and consolidating the conformetry Languages
 * removed it. Five leaf analyzers — `conformetry-typescript`, `-json`,
 * `-jupyter`, `-python`, `-text` — each held real code that rooted nothing,
 * because every one of them was entered from above rather than directly, so
 * each measured zero however much it did. They are now modules of
 * `conformetry-languages`, and what was a call between packages is a call
 * inside one, so a scoped run finally enters at a surface of its own and
 * measures four rather than zero. That package declares four and gates like
 * any other.
 *
 * `codometer-examples` is the sixth, and it is the same landmine one frame
 * along. It measures two, over two callables in a package that is a corpus and
 * a test suite rather than a library, and a limit at two breaches the moment
 * either of those callables gains a single frame — which, in a fixture corpus,
 * is a thing somebody adds casually and correctly. Headroom is not the
 * alternative: a limit set above what a project measures gates nothing and
 * lies about having been measured. So this one inherits, and the honest record
 * of its two is a `breadth`/`depth` run against it rather than a number in a
 * file.
 *
 * The dependency closure a scoped run traces did fix this for
 * `codometer-changes`, which measured zero before it and ten after. The ten
 * with no caller are a different phenomenon and the closure does not reach
 * them: it supplies the callees a stack descends into, and what these are
 * missing is a caller.
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
 * be about, and narrowing it to the one limit a project may override was
 * considered and rejected — that leaves an object whose only member every
 * reader of it immediately replaces.
 * `packages/callidescope-cli/testing/workspace-limits.integration.test.ts`
 * fails if the workspace-only limit ever leaves this object, so the
 * prohibition above cannot quietly stop being true.
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
   * barely a callable between them, and the conformetry leaf analyzers root
   * nothing, so each measures zero however much it does. A number lowered here
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
  spreadThreshold: 4,
} satisfies CallidescopeLimits;

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
 *   to act on a depth, module-spread, or misplaced-callable finding.
 * - `packages/callidescope-examples/AGENTS.md` — a "callidescope reported X →
 *   open this example" table, for an agent handed a failing run.
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  excludeFrom: ["configuration/.callidescopeignore"],
  /**
   * `LoggerService` sits behind nearly every other callable in this
   * repository. A call to it is a fact about instrumentation, not about
   * how deep or wide the code around it is, and counting it would move
   * every other callable's depth and breadth on a change that has nothing
   * to do with them.
   */
  ignoreCallees: ["LoggerService.*"],
  output: {
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
  limits: workspaceLimits,
};

export default callidescopeConfiguration;
