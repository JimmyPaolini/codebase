# Judge the credentials a session really uses

Four checks run at the start of every agent session and inject their failure as
additional context, so the agent fixes the problem before writing any code. Two
of them judge credentials, and both were initially judging the wrong ones — a
hook shell's environment is not the session's.

## Considered options

- **Check nothing at session start.** Rejected: a session that begins with
  broken commit signing or a `gh` token lacking `read:project` does not discover
  it until the first commit or the first issue lookup, by which point the agent
  has usually done work it cannot land.
- **Check the hook shell's own environment.** Rejected after it produced false
  results in both directions. A hook runs in a non-interactive shell that never
  sources a shell profile, so `GH_TOKEN` and `GITHUB_TOKEN` are absent even when
  every terminal in the session exports them, and `gh` silently falls back to
  its keyring account — whose token is scoped for the browser login flow and
  carries no `read:project`. The check passed or failed on a credential no
  command in the session would ever send.
- **Resolve the session's real credentials, and never block.** Chosen.

## Consequences

- **The gh check asks the login shell for the token** when neither variable is
  in the environment, fencing the value in markers so a profile that prints a
  banner cannot corrupt it. CI passes the token in explicitly and never asks.
- **`gh auth status` runs with `--active`.** Without it, it tests every account
  in the keyring and fails when any one has a problem — including accounts no gh
  command in the session would ever use.
- **Only CI escalates to `gh auth login --with-token`.** That path deletes
  `~/.config/gh/hosts.yml` and rewrites the git credential helper, which is fine
  on a throwaway runner and destructive on a machine that already holds a
  working keyring account. Locally a bad token is reported, not repaired.
- **The signing smoke test never opens a pinentry, so a hook can fail but never
  hang.** CI signs through a `loopback` wrapper; local agents sign through a
  `cancel` wrapper that uses an already-cached passphrase and errors out in
  milliseconds when there is none. A cancelled pinentry is reported as
  inconclusive rather than as broken signing, because the real commit that
  follows prompts for the passphrase normally.
- **One script serves two harnesses.** They read different JSON shapes, so every
  script pipes its message through `scripts/git/emit-session-hook-context.sh`,
  which emits `hookSpecificOutput.additionalContext` when `CLAUDE_PROJECT_DIR`
  is set and a top-level `additionalContext` otherwise. Remediation text also
  branches on `CI`/`GITHUB_ACTIONS`: cloud agents are told to re-run
  `copilot-setup-steps.yml`, local agents get the `git config` and
  `gh auth login` commands they can run themselves.
- **The skills check reports rather than restores.** Harnesses register skills
  when a session starts, so restoring from the hook would still not expose a
  newly fetched skill to the session already underway.
- **Adding a check means touching three places**: the script under
  `scripts/git/`, the shared emitter, and both harnesses' registrations.
