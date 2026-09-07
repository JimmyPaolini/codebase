import {
  type CallidescopeConfiguration,
  type CallidescopeLimits,
} from "@callidescope/configuration";

/**
 * What every project in this repository is held to unless it says otherwise.
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
 * Thirty-one projects under `packages/` now declare their own measured depth,
 * and eleven declare nothing and are held to the number below. Three reasons,
 * none of them that nobody got to them. The four skill packages —
 * `callidescope-agents`, `codependix-agents`, `codometer-agents`,
 * `conformetry-agents` — and `codependix-examples` hold between zero and three
 * callables, so there is no stack of theirs to gate. The five conformetry leaf
 * analyzers hold real code that roots nothing: `conformetry-typescript` has
 * forty callables, `-json` twenty-three, `-jupyter` twenty-two, `-python`
 * eleven, and `-text` five, and every one of them is reached from
 * `conformetry-generation` above rather than entered directly, so each
 * measures zero however much it does. Gating either kind at zero would fail on
 * the first stack of any length, which is a landmine rather than a ratchet.
 *
 * `codometer-examples` is the eleventh, and it is the same landmine one frame
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
   * The deepest stack this repository currently has, so the gate starts
   * green and only fails on a regression past today's worst.
   *
   * A ratchet rather than a target. Set to the issue's suggested six, this
   * fails on arrival with dozens of findings — which is a backlog, not a
   * gate, and a red pipeline nobody can act on teaches people to ignore it.
   * Lower it as the outliers come down; the distribution today runs
   * 17, 17, 17, 16, 16, 16, then six at 15, four at 14, four at 13, five at
   * 12, and a long tail at 11 and below.
   *
   * Came down from 19 by removing three frames that were not layers: a
   * `FormsService` method that forwarded its arguments unchanged to the
   * forms builder, a rung of lexico-ingestion's finite-verb cascade whose
   * whole body re-ran three guards the rungs above had already applied, and
   * a caelundas method that destructured six fields and passed the same six
   * on. Nothing was merged that was doing work.
   *
   * Three stacks now sit at 17 and pin the ratchet: `LexicoIngestionCommand.run`,
   * and callidescope-nx's `depthExecutor` and `breadthExecutor`. Sixteen is
   * one frame from each, and neither one is obviously spare — lexico's
   * remaining seventeen are a command, a recursion pair, a parse, and the
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
 * So the two are split at the flag rather than by leaving the destination unset.
 * `nx run codebase:callidescope:check` passes `--check depth`, which reads no
 * destination at all, so its exit code is purely the depth verdict.
 * `nx run codebase:callidescope:write` passes `--write`, and the release
 * workflow runs it on main. Two configurations carry that split with no third,
 * because the target hangs off nothing: `lint-codebase` does not depend on it,
 * so no run of it ever forwards `write` here, and the pull request names
 * `check` itself.
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
