import { z } from "zod";

/**
 * Config path used when `--config` is absent.
 *
 * Shared by every command that loads the configuration, so the default is
 * true in one place rather than once per command.
 */
export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

/**
 * Indent width for machine-readable output.
 *
 * Shared by every command with a `--json` mode, so the two listings are
 * parseable the same way.
 */
export const JSON_INDENT = 2;

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({});
