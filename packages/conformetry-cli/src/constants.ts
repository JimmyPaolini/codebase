import { z } from "zod";

/**
 * Config path used when `--config` is absent.
 *
 * Shared by every command that loads the configuration, so the default is
 * true in one place rather than once per command.
 */
export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({});
