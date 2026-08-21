# Publish project statistics on the default branch only

Every project's README carries its own statistics block, including its
compressed size. Those blocks are written **only** on the default branch, by the
release workflow, and committed in the commit that already publishes the
workspace aggregate and the changelog. Pull requests enforce limits but never
check report staleness, so a project README on a branch is expected to be out of
date and nothing complains about it.

## Considered options

- **Write during pre-commit and verify staleness on pull requests.** Rejected
  because size metrics read built output, so regenerating a project block would
  put a full build in the commit path, and bypassing hooks is not permitted
  here. That objection is decisive on its own and is the reason for this
  decision.

  Note what this argument does _not_ rest on. The pre-commit hook already runs
  the workspace measurement and stages the root README on every commit, on
  every branch, so this repository has long accepted churn on that block —
  contrary to what the comment in the release configuration implies. Collisions
  between concurrent branches on the aggregate block are therefore a cost
  already being paid, not a reason discovered here. Project blocks would in
  fact collide less, being project-local. The build is the whole objection.
- **Have continuous integration amend the commit and force-push.** Rejected.
  Rewriting a commit invalidates in-flight review and races the author's own
  pushes; every commit here must be signed, so continuous integration would need
  its own signing key in a setup where signing has already blocked releases; and
  automation verifying its own output makes staleness checking circular.
- **Have continuous integration push a normal commit.** Rejected for the same
  signing and circularity reasons, though it is the least bad of the automated
  options because a plain commit is recoverable where a force-push mid-review is
  not.
- **Write on the default branch only.** Chosen.

## Consequences

- **Project READMEs lag by one merge on a branch.** Accepted deliberately:
  nothing reads a project README from a feature branch, since forges and package
  registries both show a published branch. Accuracy on the default branch is the
  only accuracy with an audience.
- **The release workflow gains a build step**, because size metrics need
  compiled output. This lengthens the job that most needs to stay reliable, and
  if that becomes a problem the fix is to reuse artifacts already built on the
  same commit rather than to drop the data.
- **Staleness checking has no consumer in this repository.** The capability
  exists and is supported; it is there for local verification and for downstream
  repositories that do commit generated reports on branches. Wiring it into the
  pull request gate here would fail every pull request by design.
