// 🏷️ Types

/** Options the `directories` command accepts. */
export interface DirectoriesCommandOptions {
  /**
   * The names `--projects` carried, or `true` for the flag passed without a
   * value.
   *
   * `true` rather than an empty list because the parser never runs for a
   * valueless flag, so the two cases are distinguishable here and nowhere
   * else — and both are refused.
   */
  readonly projects?: string[] | true | undefined;
  /** The tags `--tags` carried, or `true` for the flag passed without a value. */
  readonly tags?: string[] | true | undefined;
}
