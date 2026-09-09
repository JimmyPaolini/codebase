# Require a complete configuration from every traced project

A project's own `callidescope.config.ts` is now the complete and only statement
of how that project is traced and judged. Every field is present — `entryPoints`
with all five members, `exclude`, `limits` with both, `write` with both — and
the schema refuses a file that leaves one out, naming the project and the field.
A traced project with no configuration file at all is refused the same way.

Per-field fallback resolution is deleted, and with it the record of whether a
limit was `declared` or `inherited`. A project takes what it takes from the
workspace by spreading `projectDefaults` into its own file, before the loader
ever sees it, so every number a project is judged by is written where the
project is.

This **inverts a rule the workspace configuration used to argue for at length**:
that a project must never spread the workspace's object, and must write only its
overrides. That rule was right about the object it was written for — the
workspace configuration's default export carries fields only a run may set, and
spreading it still earns a refusal. What changed is that a second export exists
to be spread. `projectDefaults` holds exactly the surface a project is entitled
to, so a project spreading it cannot adopt an output destination or an ignore
file by accident, because none of them is in there to adopt.

## Considered options

- **Leave the fields optional and keep per-field fallback.** Rejected: an absent
  field and a field set to the value it would have defaulted to look identical
  in a diff, and only one of them was a decision. Two of them are worse than
  cosmetic — `maximumBreadth` absent and `maximumBreadth: undefined` are "this
  project gates depth and not breadth" and "somebody forgot", and the file could
  not tell them apart; the same held for `write.markdown` and publishing
  nothing. Story after story in the surrounding work reduced to that ambiguity.
- **Require completeness but keep the provenance flag.** Rejected: with every
  file complete, `inherited` is unreachable. A two-valued field with one
  reachable value is worse than no field: every reader who sees `declared` on
  every row learns nothing from the column and eventually stops reading it, and
  the renderer keeps a branch no test can take.
- **Keep the fan-out that wrote a section into every project's README.** Rejected:
  it published to a document from the other end of the repository, so a project
  could not opt out, move its section, or add a diagram without editing the
  workspace file. With every project's `write` complete, the destination is a
  member of the project's own file — and once that is true, the fan-out is a
  second writer aimed at the same file, which is a conflict rather than a
  fallback.
- **Let a project with no file keep inheriting everything.** Rejected: that is
  the case the whole arrangement exists to remove. A reader who opens a project
  and finds nothing has to know which second file wins, and which of its fields
  reach a project at all. It is also the state a new project starts in, so the
  quiet default was the one nobody chose.
- **Require every project's file to be complete, spread `projectDefaults` to get
  there, and delete fallback, provenance, and the fan-out.** Chosen.

## Consequences

- **A traced project with no configuration file ends the run.** Six conformetry
  leaf analyzers — `conformetry-json`, `-jupyter`, `-markdown`, `-python`,
  `-text`, and `-typescript` — gained a file that spreads `projectDefaults`,
  takes the workspace depth explicitly, and declares its own boundary-measured
  `maximumBreadth`: a statement made where a reader looks for it rather than
  inferred from a file that is not there. Adding a project to this workspace now
  means adding its `callidescope.config.ts` in the same change. Those six were
  themselves consolidated into `conformetry-languages` shortly after, by a
  change independent of this one — the six files this decision describes no
  longer exist, and `conformetry-languages` carries the one complete file that
  replaced them.
- **One traced project is exempt, and cannot not be.** `configuration/` holds the
  workspace configuration at its own root. A run reads one file in one role, and
  no second file may sit beside it under a name discovery would find, so that
  directory is judged by the workspace's own limits directly. It is the only
  place in the repository where a number reaches a project from another file.
- **The whole schema is strict, not only the limits.** An unknown field at any
  level is refused rather than stripped. Stripping is the failure mode that
  leaves whoever wrote a field believing it is in force: every retired field
  arrives through that door, and so does every misspelling.
- **A project configuration cannot be written in JSON.** `undefined` is the value
  that says "gate no breadth" and "publish nothing", and JSON cannot spell it.
  The loader still reads `callidescope.config.json` for a workspace
  configuration, where nothing is required to be present.
- **`previewCount` moved onto the markdown destination.** It used to be a member
  of the deleted fan-out declaration and was borrowed from there by every other
  renderer. It is a fact about the document a block lands in — a project README
  wants three stacks and a report file wants all of them — so it belongs to the
  destination. A run that prints to a terminal uses the tool's default, that
  being nobody's document.
- **Committed reports lose a column.** A project's own `### Limits` table drops
  its `Origin` column, the workspace project index prints a bare number where it
  printed `17 inherited`, and `callidescope limits` prints four columns rather
  than five. The `Declared in` column stays: the listing spans every project and
  naming the file each number is written in is the whole of what it is for.
- **`callidescope-examples/examples/inherited-limits` was deleted.** It
  demonstrated a project configured entirely by the run, which is now a refusal,
  so it was a fixture without a subject. An earlier draft of this decision kept
  the directory and rewrote its guide around a project that overrides nothing;
  that is not what shipped. The example is gone, and `gated-leaf` is the one
  that now carries a project declaring its own complete configuration.
