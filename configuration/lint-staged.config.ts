/**
 * Lint-staged configuration — runs checks on staged files during pre-commit.
 *
 * Each key is a glob pattern matching staged files, and its handler returns
 * an array of commands to run. Uses `nx affected` to scope checks to the
 * projects that own the changed files, plus codebase-level checks.
 *
 * Invoked by Husky's pre-commit hook via `npx lint-staged`.
 */
import path from "node:path";

/**
 * How many tasks one `nx affected` run may execute at once.
 *
 * This was pinned to 2 because the run exhausted memory and the operating
 * system killed it. That was blamed on `analyze-code` spawning a nested
 * `nx run` per tool, each with its own scheduler, so `--parallel` bounded the
 * outer process only. `lint-codebase` is an `nx:noop` whose work hangs off
 * `dependsOn`, so one scheduler now owns every task and this number means what
 * it says.
 *
 * lint-staged reports every killed command as "Task failed to spawn:
 * undefined", so that wording alone does not identify the cause. A run killed
 * for memory does some work first; one killed for an over-long argument dies
 * instantly with no output at all. See `getStagedFilesFlags`.
 */
const ANALYSIS_PARALLELISM = 8;

/**
 * Renders staged paths as one workspace-relative `--files=` flag each.
 *
 * `--files` also accepts a single comma-separated value, but that value grows
 * without bound as a commit grows, and one over-long argument is enough to get
 * the whole run killed: Node 26 is killed by the operating system on any single
 * argument past 1011 bytes, before the script it was asked to run prints
 * anything. The commit then fails as lint-staged's "Task failed to spawn:
 * undefined" with no output to explain it, and the paths look guilty because
 * whichever one crosses the threshold appears to be the trigger. Nx unions
 * repeated `--files` flags, so the affected set is identical and every argument
 * stays path-sized.
 *
 * The workspace pins Node 24 in `.nvmrc`, which has no such limit. This keeps
 * the hook working on a Node that does.
 */
function getStagedFilesFlags(files: string[]): string {
  return files
    .map((file) => `--files=${path.relative(process.cwd(), file)}`)
    .join(" ");
}

const config = {
  // 🔒 Lockfile integrity
  // Not an Nx target: this resolves the manifests against the lockfile with a
  // real `pnpm install --frozen-lockfile`, which no target models.
  "{**/package.json,pnpm-workspace.yaml}": (): string[] => [
    "./scripts/check-lockfile.sh",
  ],

  // 📦 Manifest consistency
  // A manifest under a project makes only that project affected, but syncpack
  // and sherif compare every manifest against every other, so the root project
  // has to run whether or not `affected` selected it.
  "**/package.json": (): string[] => [
    "pnpm exec nx run-many --projects=codebase --targets=check-catalog-manifests,sherif,syncpack --outputStyle=static",
  ],

  // 🔬 Static analysis and conformetry validation
  // One `nx affected` run over every staged path, on the same `lint-codebase`
  // target the Lint Codebase workflow runs, so what passes here passes there.
  //
  // This replaces a table of per-path entries that mapped a changed file to
  // the target that cared about it. Nx already does that mapping: each leaf
  // declares the config files it reads in its own `inputs`, so touching
  // knip.config.ts or the PR template re-runs exactly the leaves it should and
  // cache-hits the rest. Doing it by hand duplicated that, and every entry
  // cost another project graph build.
  //
  // Conformetry validates the whole workspace on every commit: generated
  // instances need not match a template-pattern glob to have drifted, so it
  // cannot be scoped to `affected`.
  //
  // `callidescope` and `synchronize` are named alongside `lint-codebase` rather
  // than reached through its `dependsOn`, for the reason the Lint Codebase
  // workflow names them: both also publish a report on the default branch, and
  // Nx forwards an explicit configuration down `dependsOn`, so an edge there
  // would let `lint-codebase --configuration=write` publish from a branch.
  // Naming them in this same invocation is what keeps a commit gating call-stack
  // depth and derivation drift; a second `nx affected` call would have cost
  // another project graph build for nothing.
  //
  // One gap worth knowing, because `affected` cannot close it. `synchronize`
  // declares `project.json`, `AGENTS.md`, `README.md`, `*.module.ts` and the
  // configuration files it reads as inputs, but no `package.json` glob — so a
  // commit that stages only a manifest changes the Nx project graph, drifts the
  // `nx-project-graphs` derivation, and never selects this project. The pull
  // request still catches it, since Lint Codebase resolves `affected` against
  // the merge base rather than a staged path list. Conformetry answers the same
  // problem by staying unscoped; this one stays scoped, because removing that
  // scope would put every synchronization in every commit path.
  //
  //
  // `nx sync:check` no longer runs anywhere, on commit or otherwise: the
  // generator plugin it checked is emitted into .conformetry on install rather
  // than committed, so no commit can stage it out of date. Every conformetry
  // command re-checks the emitted plugin against the configuration instead. See
  // configuration/.husky/pre-commit for the retirement note. Were it ever
  // reinstated, it could not be prefixed here: lint-staged spawns commands
  // without a shell, so `NX_DAEMON=false nx ...` would be parsed as the
  // executable name.
  "*": (files: string[]): string[] => [
    `pnpm exec nx affected --target=lint-codebase --target=callidescope --target=synchronize --configuration=check --parallel=${String(ANALYSIS_PARALLELISM)} --outputStyle=static ${getStagedFilesFlags(files)}`,
    "pnpm exec nx run-many --targets=conformetry-validate --outputStyle=static",
  ],
};

export default config;
