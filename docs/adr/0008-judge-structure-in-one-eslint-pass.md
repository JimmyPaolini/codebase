# Judge structure in one ESLint pass

`eslint-plugin-project-structure`'s `folder-structure` rule enforces this
repository's folder and file placement law from
`configuration/codebase-structure.json`. It listens only on `Program`, so it
fires only on a file ESLint parsed into a syntax tree — which meant markdown and
HTML paths were never judged at all. That is how `openwiki/` stayed an undeclared root
directory, and how a generated `src/index.html` would have gone unnoticed.

A second ESLint configuration briefly covered those two extensions. We removed
it: the rule is now rebound so that one pass judges every path in the workspace.

## Considered options

- **A second configuration and a second target.** Rejected after trying it. It
  worked, but it doubled the surface that has to stay in step, and its `inputs`
  had to be `{workspaceRoot}` globs — with `{projectRoot}` globs a markdown file
  added inside a project never changed the root project's hash, so
  `nx affected --target=lint-codebase` passed green with the violation present.
  Both CI and lint-staged run `nx affected`, so that hole was invisible.
- **Override `languageOptions` on markdown.** Impossible. ESLint resolves
  exactly one `language` per file, so re-parsing markdown as JavaScript is
  rejected outright with `Key "languageOptions": Unexpected key "frontmatter"
  found.`, and leaving it alone leaves the rule silently inert.
- **Rebind the rule to the markdown tree.** Chosen. `markdownStructurePlugin` in
  `configuration/eslint.config.ts` spreads the same rule and binds its `Program`
  handler to mdast's `root` node, which puts the markdown rules and the
  structure rule in one pass. `.html` needs less: the plugin's own
  `projectStructureParser` yields an empty `Program`, and nothing else claims
  the extension, so a block naming that parser is enough. The rule reads only
  `context.filename`, so nothing parses HTML or pretends to.

## Consequences

- **Markdown placement is judged in a block separate from the markdown content
  rules**, so it reaches generated pages too. `openwiki/` is excluded from the
  content rules — its generator emits several H1s per page and its pages must
  not be hand-edited — but its paths are still judged. The `markdown` plugin has
  to be registered in the placement block for that: `language: "markdown/gfm"`
  resolves against the plugins of the config a file ends up with, and an
  excluded page would otherwise fail with
  `Could not find "gfm" in plugin "markdown"`.
- **Reach comes from the root `eslint` target's trailing `**/*.md`**, a
  workspace-wide glob rather than a list of directories on purpose: an
  enumerated list only judges the directories somebody remembered to add, so it
  would not have caught `openwiki/` and would not catch the next one. It also
  cannot be a bare directory, which would pull in that directory's JSON and YAML
  and fail rules never applied to them.
- **Markdown inside a project is judged twice**, here and by that project's own
  `eslint` target. It costs about a second and reports the same answer.
- **Vendored skills under `.agents/` are excluded from the content rules** for
  the same reason `markdownlint` and `cspell` exclude them, but their paths are
  still judged.
- **`projectStructure.cache.json` masks edits.** Delete it, and `.eslintcache/`
  beside it, before testing a change to `configuration/codebase-structure.json`,
  or the edit appears to have no effect and the test proves nothing.
