// ♟️ Constants

import { z } from "zod";

/** The generator field this plugin reads its project scope from. */
export const SCOPE_FIELD_NAME = "scope";

/**
 * Validates the scope a generator carries.
 *
 * Parsed here rather than in the base package's schema because a project tag
 * is Nx vocabulary: the base configuration carries the field through without
 * knowing what is in it, and this is where it acquires meaning.
 */
export const conformetryNxProjectScopeSchema = z.object({
  directories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});
