/**
 * Where codometer's nearest-ancestor search finds this repository's
 * configuration.
 *
 * Every other tool's configuration is kept in `configuration/`, and this one
 * still is — but `configuration/` is nobody's ancestor. Codometer resolves its
 * configuration by walking upward from the folder it was pointed at, so a run
 * measuring the repository itself can only reach a file sitting at the
 * workspace root. This is that file, and its whole job is to be found.
 *
 * It re-exports the **workspace** configuration rather than the shared one the
 * file next door defaults to. Projects spread that shared object; the
 * repository is measured with the exclusions and the README destination that
 * belong to it alone, and no project should inherit either.
 *
 * The `.js` extension is the repository's rule for a relative import and is
 * what the configuration loader resolves to the TypeScript source beside it.
 */
export { workspaceConfiguration as default } from "./configuration/codometer.config.js";
