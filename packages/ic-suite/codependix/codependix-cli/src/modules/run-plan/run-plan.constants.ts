// ♟️ Constants

/** What `--check boundaries` asks the run to fail on: an edge breaking a rule. */
export const CHECK_BOUNDARIES = "boundaries";

/** What `--check reports` asks the run to fail on: a stale configured export. */
export const CHECK_REPORTS = "reports";

/**
 * Everything `--check` accepts, in the order an error message lists them.
 *
 * Named here rather than spelled into each message, so the list a mistake is
 * measured against and the list it is told about can never drift apart. The
 * same arrangement `codometer` and `callidescope` both use, and `reports` is
 * deliberately their word spelled the same way: a configured destination has
 * gone stale is one finding across all three tools, and two names for it
 * would make the three reports unreadable together.
 */
export const CHECK_NAMES = [CHECK_BOUNDARIES, CHECK_REPORTS];

/** How a `--check` value is written: one comma-separated set, no spaces needed. */
export const CHECK_SEPARATOR = ",";

/**
 * What a command line naming no mode at all is asked to choose between.
 *
 * Three choices rather than the two `--check`/`--write` used to offer, since
 * `--check` now names which finding it gates. Kept as a prompt rather than
 * defaulted to anything: a run that silently did nothing and exited 0 is the
 * failure this whole flag arrangement exists to prevent.
 */
export const RUN_MODE_CHOICES = [
  CHECK_BOUNDARIES,
  CHECK_REPORTS,
  "write",
] as const;

/** What the prompt calls the thing it is asking for, in its error messages. */
export const RUN_MODE_SUBJECT = "A run mode (--check or --write)";
