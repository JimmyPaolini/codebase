/**
 * Where codometer's nearest-ancestor search finds this repository's
 * configuration.
 *
 * Every other tool's configuration is kept in `configuration/`, and this one
 * still is — but `configuration/` is nobody's ancestor. Codometer resolves its
 * configuration by walking upward from the folder it was pointed at, so a run
 * inside `packages/logger` can only reach a file sitting at the workspace
 * root. This is that file, and its whole job is to be found: the configuration
 * itself, including the convention that lets a project be measured without any
 * configuration file of its own, is written in `configuration/`.
 */
export { default } from "./configuration/codometer.config.ts";
