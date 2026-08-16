/**
 * Lint-staged configuration — runs checks on staged files during pre-commit.
 *
 * Each key is a glob pattern matching staged files, and its handler returns
 * an array of commands to run. Uses `nx affected` to scope checks to the
 * projects that own the changed files, plus codebase-level checks.
 *
 * Invoked by Husky's pre-commit hook via `npx lint-staged`.
 */

/**
 * How many tasks one `nx affected` run may execute at once.
 *
 * This was pinned to 2 because the run exhausted memory and the operating
 * system killed it. That was blamed on `analyze-code` spawning a nested
 * `nx run` per tool, each with its own scheduler, so `--parallel` bounded the
 * outer process only. `lint-codebase` is an `nx:noop` whose work hangs off
 * `dependsOn`, so one scheduler now owns every task and this number means what
 * it says. See `selectAffected` for the other half of that bug.
 */
const ANALYSIS_PARALLELISM = 8;

/**
 * How `nx affected` is told what changed.
 *
 * Not `--files=<staged paths>`. Passing more than roughly twenty distinct
 * paths kills Nx instantly — SIGKILL, zero output, no error — which lint-staged
 * then reports as the thoroughly misleading "Task failed to spawn: undefined".
 * The threshold drifts with available memory, so it reads as flakiness rather
 * than a limit. Reproduced on unmodified tracked files and on a bare
 * `nx show projects --affected`, so it is neither the target nor the staged
 * content: any commit touching enough files could never pass the hook.
 *
 * `--uncommitted` asks Nx to read the working tree itself, which is the same
 * question without the argument list. It does mean a partially staged file is
 * checked whole; staging here is whole-file, so the distinction is academic.
 */
const AFFECTED_SELECTOR = "--uncommitted";

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
  // One `nx affected` run on the same `lint-codebase` target the Lint Codebase
  // workflow runs, so what passes here passes there.
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
  // `nx sync:check` runs from the Husky hook instead: it needs NX_DAEMON=false,
  // and lint-staged spawns commands without a shell, so an environment prefix
  // here would be parsed as the executable name.
  "*": (): string[] => [
    `pnpm exec nx affected --target=lint-codebase --configuration=check --parallel=${String(ANALYSIS_PARALLELISM)} --outputStyle=static ${AFFECTED_SELECTOR}`,
    "pnpm exec nx run-many --targets=conformetry-validate --outputStyle=static",
  ],
};

export default config;
