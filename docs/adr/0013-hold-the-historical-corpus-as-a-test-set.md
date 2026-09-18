# Hold the historical corpus as a test set, not an oracle

The 1,184 Codes in `HISTORICAL_CORPUS` are drawings this project really
produced, and their family labels are **where each drawing was filed**, not
what it is. A family rule that disagrees with one of those labels has found a
disagreement to adjudicate by looking at the drawing — it has not failed a
test. The corpus is evidence, and evidence can be wrong.

This is not a precaution. It was measured: reading every one of the 9,877
historical drawings back onto the lattice turned up twenty-one Codes the
retired file tree had filed under two different families at once, nine of
which are the mis-filed whirls spec #859 was opened over.

## The evidence

One extraction read every drawing under the retired `output/` tree at the
frozen commit `ab3c4526b^`, addressed each at the span and pitch its own path
declares, and collapsed the result to one entry per Code. It carries every
family name the tree gave that Code, in the order the tree gave them up.

**Nine `whirl` drawings are also filed as `snake`.** At every row count from
four to twelve, `snake/<n>-rows/edge-6-repeats-<n>r<n>c.svg` and
`whirl/<n>-rows/plain-6-repeats-<n>r<n>c.svg` are the same drawing and spell
the same Code. The retired extraction deduplicated by Code and kept the first
occurrence in tree order, and `snake` sorts before `whirl` — so all nine were
filed as `snake`, and `whirl.constants.ts` was left holding only the nine
`flip` variants. That is why the corpus contained no whirl under the name
`whirl`, and why nine single open arcs — one free end on each border rule,
which is the whirl signature — were stored under a name that means a closed
loop.

**Ten `branch` drawings are also filed as `parallel`.** At every row count
from three to twelve, `branch`'s `plain` variant and `parallel`'s
`aligned-strands-1` variant draw the identical two-stroke tile. One more pair
each: `boxes`' 3-row `plain` is also `branch`'s 3-row `rung-northwest` and
`rung-southwest`, and `negative`'s 3-row `plain` is also
`parallel`'s 3-row `serpentine-strands-3-offset-1`.

Nothing here decides which name the ink deserves. `filedUnder` keeps every
name the tree gave, in tree order, and the adjudication is a separate
decision made by looking at the drawings.

## What the extraction proved about the reading

The reading direction had never run outside tests, and six of the ten
historical families dropped the Code from their filenames — so for those, the
drawing was the only source. It read all 9,877 drawings with **zero
failures**, and two independent checks say the readings are right:

- The 8,551 `mosaic` drawings each carry their own Code as their filename.
  Every one of them read back to exactly the Code its name spells out.
- Of the 1,326 labelled drawings, the entries lying beyond the enumerator's
  reach are **exactly the 965** the fourteen hand-maintained constants files
  held, byte for byte — no entry missing and none surplus. Regenerating the
  whole sweep reproduces the committed 31,244-row database unchanged.

## Considered options

- **Treat the historical labels as provenance rather than as ground truth.**
  Chosen. A label records which `output/<family>/` directory a drawing sat
  in. The directory was chosen by the generator that drew it, and a generator
  that draws two families' tiles identically files the same tile twice —
  which is exactly what happened twenty-one times. A label is evidence about
  the file tree, and only indirectly about the ink.
- **Re-derive every historical family from the new rules and drop the old
  labels entirely.** Rejected. The labels are the only record of what a
  person once thought these drawings were, and a rule that silently
  relabelled all 965 would leave nothing to check the rule against. Keeping
  them is what makes a disagreement visible.
- **Trust the labels and make each family rule reproduce them exactly.**
  Rejected — it is the defect spec #859 was opened over. Every aspect-ratio
  rule in the retired classification reproduced this corpus perfectly, which
  is why they survived so long; they failed only against the enumerated
  space, which the corpus never contained. A corpus that any wrong rule can
  satisfy is not an oracle.
- **Keep the extraction as a module.** Rejected. It ran once, against a
  commit that will never change, and its output is committed data under human
  review. Both the script and the drawing parser it needed were deleted in
  the same pull request that added their output: nothing reads a drawing back
  onto the lattice again, and a reader kept "in case" is a reader nobody
  tests.

## Consequences

- A family rule is tested against `HISTORICAL_CORPUS` and every disagreement
  is looked at, not assumed to be the rule's fault.
- The fixture set alone cannot validate a family rule, because the retired
  aspect-ratio rules reproduce it exactly and are still wrong. The enumerated
  space has to be reviewed as well.
- `filedUnder` is an array, so a Code filed under two names keeps both, and a
  contradiction stays visible **in `HISTORICAL_CORPUS`** instead of being
  resolved by whichever name happened to sort first. The database's own
  `family` column still holds one name — `filedUnder[0]`, which is tree
  order — because that column is a single enum-checked value until it becomes
  an open array of earned families. Until then the fixture set is where a
  contradiction can be seen, and the column is not.
- The twenty-one contradictions are open questions, not defects fixed here.
- The nine mis-filed whirls are one meander stored once, not twice, because
  they are literally one drawing filed twice. A second, larger kind of
  duplicate remains untouched: **73 of the 1,184 entries are a cyclic column
  rotation of another entry already in the corpus** — the same band cut at a
  different place — which no unique index over a Code can see. Among them is
  the whirl at four rows by eight columns that spec #859 names, and nine more
  `whirl`/`snake` pairs at four to twelve rows. Choosing one canonical phase
  for a stored Code is what collapses them, and it is deliberately not done
  here: the Codes are committed exactly as the drawings spell them.
