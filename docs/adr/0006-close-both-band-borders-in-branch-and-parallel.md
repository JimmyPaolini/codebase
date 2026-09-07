# Close both band borders in the branch and parallel families

`meanderaw` drew `branch` hanging from a single rule with the opposite border
left empty, and `parallel` with its strands terminating in mid-air. Both
families now draw a full border rule at the **top and the bottom** of the band
in every mode, through the same optional `MotifService.border` hook `boxes`
already used, so that a drawing is identified by the ink between its borders
rather than by which border it happens to carry. The price is paid in two
properties neither family was gated on: `branch` stops being acyclic, and
`parallel` starts branching.

Every number below was measured with `MeanderLatticeService` and
`MeanderTopologyService` reading committed documents off disk — the corpus at
`main` for the "before" figures, the corpus on this branch for the "after"
ones.

## Considered options

An **interior** here is a drawing's ink with the runs along the band's first
and last lattice rows taken out: what is left once both borders are known to
look the same. Two names that share an interior are two names for one pattern,
and the open border was the only thing telling them apart.

- **Rule both borders in both families.** Chosen. It removes the collisions
  outright rather than hiding them. Measured before the change: `branch`'s 88
  committed documents held only **66 distinct interiors** — `plain`,
  `comb-upward`, and `stagger-branches-3` were one pattern under three names at
  each of eleven row counts — and `parallel`'s 819 held **786**, with
  `aligned-strands-1`, `plied-strands-1`, `serpentine-strands-1`, and
  `serpentine-strands-1-flip-one` collapsing into one at each of those eleven
  row counts. Measured after: 66 documents and 66 interiors, 786 and 786. The
  collision groups the measurement reports are exactly those two sets and
  nothing else.
- **Leave the borders alone and rename the colliding modes.** Rejected. It
  addresses the vocabulary and not the drawing: the interiors would still be
  identical, so the family would go on being told apart by its frame. It also
  cannot be checked — nothing measures a name — where an interior collision is
  a count anybody can take again.
- **Rule one family's borders and not the other's.** Rejected. The whole reason
  a closed border is worth having is that every family in the corpus is then
  read the same way, and a corpus where two families answer "what is at the
  border?" differently gives a reader no rule to apply.
- **Keep `branch` acyclic by cutting one edge per column pair.** Rejected. A
  second rule closes a rectangle between every adjacent pair of teeth, so
  the family could only stay loop-free by removing one lattice edge from each of those
  rectangles. That is a gap in the middle of a tooth, which reads as a broken
  stroke rather than as a shape, and it buys back a property no charter
  invariant ever named. This one is reasoning rather than measurement: no such
  figure was drawn, and nothing would have failed if it had been.
- **Give `parallel` up as the family that relaxes nothing.** Rejected as a
  reason to stop. `parallel` relaxing no invariant was a pleasing fact about it
  rather than a requirement placed on it, and the charter asserts relaxations in
  both directions precisely so that a family which starts breaking one has to
  say so.

## Consequences

- **`branch` closes a loop in every column pair, and the corpus contains no
  tree at all.** Its 66 documents carry 5 to 29 cycles each on a single
  component, where every one of them used to be a spanning tree. Before the
  change 110 committed documents were trees — `branch`'s 88 and the 22
  one-strand `serpentine` drawings; now none is, because both routes to a tree
  ran through an open border. Nothing failed when this changed: the loop count
  was measured and published, never gated.
- **`branch`'s row of `RELAXED_INVARIANTS` is unchanged.** It relaxed
  no-branching before and it relaxes no-branching now. What moved is its count —
  1,738 T-junctions across its 88 documents, 2,684 across its 66 — and what it
  is distinguished from `negative` by, which used to be the loops and now is the
  crossing alone.
- **`parallel` relaxes no-branching, under a structural condition rather than a
  modifier name.** A rule meets a strand's rising end with west, east, and south
  ink at one lattice point, so **642 of its 786 drawings fork**. The other 144
  are the `serpentine` drawings whose first and last strips are each one lattice
  row deep: the flat ribbon on such a strip _is_ the rule beside it, so nothing
  rises to meet it. That is a fact about the ply and the rotation rather than
  about the modifier, which is why `CharterCondition` exists at all — a bare row
  would be asserted in both directions and fail on those 144.
  `parallel serpentine-strands-3-offset-1` at three rows is one of them, and the
  repeat unit it draws is the `mosaic` `zigzag` tile `56a9` — the same lattice
  edges under two families' names. The worked example the spec reasons through
  would have been contradicted by a blanket claim that the family branches.
- **The collapse was under-counted when it was predicted.** The spec named
  `plain` and `comb-upward` as the `branch` drawings that would merge and did
  not name `stagger-branches-3`, which merged with them — that third name is
  [#682](https://github.com/JimmyPaolini/codebase/issues/682), found by
  measurement afterwards rather than by reading. It also read `parallel` as
  branching everywhere, where the drawing that landed branches in 675 of the 819
  documents that then existed, and in 642 of the 786 that remain. It read the
  four one-strand `parallel` names as becoming **byte-identical**, and they did
  not: with both borders ruled the four paint the same lattice points and the
  same lattice edges, but the path data still differs in direction and grouping,
  so the files differ. The same is true of the three `branch` names. Prose
  predicting a measurement is worth exactly what the measurement says.
- **Four names left the command line, and the corpus lost 55 documents.** The
  `comb` modifier is gone, because with both rules present it could no longer
  change what is drawn; `MINIMUM_STAGGER_BRANCHES` rose from 3 to 4; and
  `plied-strands-1`, `serpentine-strands-1`, and `serpentine-strands-1-flip-one`
  are no longer swept, with `aligned-strands-1` surviving as the one honest name
  for a bundle of one. The corpus went from 9,918 committed drawings to 9,863,
  and its named half from 1,159 combinations to 1,104.
- **`stagger` now varies a width rather than a shape.** With both borders ruled
  end to end, the rail a `stagger` run reinforces is ink already on the page, so
  what `--branches` decides is the repeat unit's width — `branches − 1` lattice
  columns — and nothing about the figure inside it. Every mode but `rung` draws
  two rules and a tooth in every lattice column, and differs from the others
  only in how wide the unit is. #682 raised the floor to four because at three
  the width collided with `comb`'s own; the modes above four are distinct
  documents but not distinct shapes, and no measurement objects to that.
- **`branch` keeps free ends in one mode of three.** `plain` and `stagger`
  leave none — closing every loop closes every end — and `rung` leaves
  `6 × rows − 4`. The write-up under "Unbounded branching" in the project README
  judged a figure with no free ends to read as a grille rather than as a running
  border, and this decision overrides that judgement for two of the three modes:
  identifiability was worth more than the reading, and the reading was never
  measured by anything.
