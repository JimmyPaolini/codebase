import path from "node:path";

const projectRootPath =
  "/Users/jimmypaolini/Development/Personal/codebase.worktrees/resolve-merge-conflicts-963/packages/ic-suite/callidescope/callidescope-cli";

// What did findInstances return?
// If pattern was "packages/ic-suite/callidescope/callidescope-cli/." (which path.posix.join resolves to "packages/ic-suite/callidescope/callidescope-cli")
// Then fs.globSync on that pattern returns it.
// And instancePath is "packages/ic-suite/callidescope" and nameStem is "callidescope-cli".
// wait! What if pattern is "."?
// resolveGroup does path.posix.join("packages/ic-suite/callidescope/callidescope-cli", ".")
// That returns "packages/ic-suite/callidescope/callidescope-cli".

// Let's print path.relative
console.log(
  path.relative(
    projectRootPath,
    path.join(
      "/Users/jimmypaolini/Development/Personal/codebase.worktrees/resolve-merge-conflicts-963/packages/ic-suite/callidescope",
      "callidescope-cli",
    ),
  ),
);
