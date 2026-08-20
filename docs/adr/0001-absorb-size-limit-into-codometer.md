# Absorb size-limit into codometer

The workspace ran two measurement tools with one purpose between them:
codometer measured roughly two hundred metrics and could gate none of them,
while `size-limit` gated bundle sizes and measured nothing else. We folded
size-limit's job into codometer as a general capability — any metric may carry a
**limit**, and a build artifact is just another **target** — so that a ceiling on
lines of code, on interface count, or on a convention counter is as expressible
as one on compressed bytes.

## Considered options

- **Keep both tools.** Rejected: two configuration formats for one question, and
  limits stay impossible on anything but bytes.
- **Extend size-limit with a custom plugin.** Rejected: its plugin surface
  measures a check, so language metrics have nowhere to live, and the
  configuration would still be per-project files in a second format.
- **Absorb it into codometer.** Chosen. The surface actually in use was narrow —
  only the file preset was installed, so the whole behavior was glob, compress,
  compare, and exit — and nineteen of the twenty-one configuration files were
  byte-identical boilerplate that a single computed configuration replaces.

## Consequences

Three of these are not obvious from the resulting code:

- **Git is no longer used for file discovery.** Codometer previously listed
  files through git, which was silently providing tracked-only listing, ignore
  file handling, and exclusion files. All of it is now implemented natively
  against gitignore syntax. This was not incidental cleanup: the tool has to run
  where there is no repository, because it is intended to ship standalone.
- **The compression algorithm is reproduced exactly rather than chosen.** Each
  matched file is compressed independently and the results summed — never
  concatenated, which compresses better and would produce different numbers —
  and the compression level is pinned explicitly because the default differs.
  This is deliberate so that no limit value had to change in the same work that
  changed how measurement happens. A future reader tempted to "improve" this
  should renumber every limit in the same change, or not touch it.
- **Codometer is now large enough to breach its own limit.** That is a real
  possibility rather than a joke, and raising it is a decision to make
  deliberately rather than a formality.
