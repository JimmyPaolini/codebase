// 🏷️ Types

/**
 * Validated delete command options and required environment values.
 */
export interface DeleteLogsOptions {
  readonly actor?: string;
  readonly branch?: string;
  readonly deleteEnd: string;
  readonly deleteStart?: string;
  readonly event?: string;
  readonly githubRepository: string;
  readonly githubToken: string;
  readonly name?: string;
  readonly status?: string;
}
