# Close both band borders in the branch and parallel families, clear of the branch figure

`meanderaw` drew `branch` hanging from a single rule with the opposite border
left empty, and `parallel` with its strands terminating in mid-air. Both
families now close the band at the **top and the bottom** in every mode,
through the same optional `MotifService.border` hook `boxes` already used, so
that a drawing is identified by the ink between its borders rather than by
which border it happens to carry. In `branch` the figure is **inset by one
lattice row** from each rule beside it, so a rule closes the band without
landing on the ink. The price is paid in one property neither family was gated
on: `parallel` starts branching.

Every number below was measured with `MeanderLatticeService` and
`MeanderTopologyService` reading committed documents off disk — the corpus at
`main` for the "before" figures, the corpus on this branch for the "after"
ones.

## Correction: the first attempt ruled the borders _onto_ the figure

This is the part of the record worth reading first, because it is the mistake
the decision is easy to repeat.

The first implementation drew both rules unconditionally, on the band's own
first and last lattice rows — which is where every `branch` rail already sat.
Two things followed, and only one of them was noticed at the time.

- **Every `branch` mode collapsed to one picture.** A `stagger` rail can only
  ever name a border row, so a rule along both of them swallowed the
  crenellation whole and `plain` and all three `stagger` modes rendered as a
  full-height vertical bar in every column between two rules, differing only
  in total width. The `branches` parameter drew nothing. That is the opposite
  of the identifiability the decision was made for: it removed the collisions
  the open border had caused and created worse ones.
- **`branch` was recorded as having given up being acyclic, and it had not
  needed to.** A rule touching a tooth's end closes a rectangle between every
  adjacent pair of teeth. That was written up here as the price of the
  decision, and the option below that would have kept the family loop-free by
  cutting a lattice edge per rectangle was rejected as a broken stroke — which
  it would have been.

**Insetting the figure one lattice row from every rule beside it fixes both at
once, and is the decision as it now stands.** `comb` and `rung` keep their rail
on row `0`, where a reader already sees the top border, and take one rule on
row `rows`, a clear row below their teeth's free ends. `stagger` is inset at
both ends — its rail alternates between the two rows its teeth end at, so
neither of those may be ruled — and takes both rules, on rows `0` and `rows`.
No rule touches ink in any mode. Nothing is swallowed, so the six modes are six
drawings; nothing closes, so the family is acyclic again; and every mode has
free ends again, which the project README's "Unbounded branching" write-up had
judged to be what makes the output read as a meander rather than as a grille.

What the decision actually gave up in `branch`, then, is being **one connected
piece** and being a **tree**: a rule standing clear of the figure is a
component of its own, so each drawing is a forest of two or three pieces. That
is not a property any charter invariant names either, and it is a much smaller
price than the one recorded first. `parallel`'s half of the trade is unchanged
and was right as written.

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
  row counts. Measured after: 66 documents and 66 interiors, 786 and 786 —
  and 60 documents on 60 distinct lattices once the `branch` figure was inset
  and the family's two-row drawings fell below the structural minimum that
  raised. The collision groups the measurement reported are exactly those two
  sets and nothing else.
- **Leave the borders alone and rename the colliding modes.** Rejected. It
  addresses the vocabulary and not the drawing: the interiors would still be
  identical, so the family would go on being told apart by its frame. It also
  cannot be checked — nothing measures a name — where an interior collision is
  a count anybody can take again.
- **Rule one family's borders and not the other's.** Rejected. The whole reason
  a closed border is worth having is that every family in the corpus is then
  read the same way, and a corpus where two families answer "what is at the
  border?" differently gives a reader no rule to apply.
- **Keep `branch` acyclic by cutting one edge per column pair.** Rejected, and
  the rejection was right about the figure and wrong about the choice. A rule
  landing on a tooth's end closes a rectangle between every adjacent pair of
  teeth, so with the rule _there_ the family could only stay loop-free by
  removing one lattice edge from each rectangle — a gap in the middle of a
  tooth, which reads as a broken stroke rather than as a shape. What the option
  missed is that the rule need not be there. Moving the rule a lattice row off
  the ink, rather than cutting the ink to escape the rule, keeps the family
  loop-free and keeps the crenel and the free ends at once; see the correction
  above. Both halves of this bullet are reasoning rather than measurement about a
  figure nobody drew — the cut one, that is — and nothing would have failed if
  it had been drawn.
- **Give `parallel` up as the family that relaxes nothing.** Rejected as a
  reason to stop. `parallel` relaxing no invariant was a pleasing fact about it
  rather than a requirement placed on it, and the charter asserts relaxations in
  both directions precisely so that a family which starts breaking one has to
  say so.

## Consequences

- **`branch` stays acyclic and stops being one piece, and the corpus contains
  no tree at all.** Each of its 60 documents is a forest — `edges = nodes −
  components`, no loop in any piece — of two components under `comb` and
  `rung` and three under `stagger`: the figure, and the one or two rules
  standing a lattice row clear of it. Its 5-to-29-cycle range held for exactly
  one commit, the one in which the rules landed on the figure. Before the
  change 110 committed documents were trees — `branch`'s 88 and the 22
  one-strand `serpentine` drawings; now none is, because a `branch` drawing is
  no longer connected and a one-strand `serpentine` closes a loop. Nothing
  failed when either of those changed: the loop and component counts are
  measured and published, never gated.
- **`branch`'s row of `RELAXED_INVARIANTS` is unchanged.** It relaxed
  no-branching before and it relaxes no-branching now. What moved is its count —
  1,738 T-junctions across its 88 documents, 2,684 across its 66, and 1,370
  across its 60 — because a rule no longer runs along the row a rail sits on and
  so no longer forks against every tooth in it. What it is distinguished from
  `negative` by is the loops again, with the crossing beside them.
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
- **Four names left the command line, and the corpus lost 61 documents.** The
  `comb` modifier is gone, because with both rules present it could no longer
  change what is drawn; `MINIMUM_STAGGER_BRANCHES` rose from 3 to 4; and
  `plied-strands-1`, `serpentine-strands-1`, and `serpentine-strands-1-flip-one`
  are no longer swept, with `aligned-strands-1` surviving as the one honest name
  for a bundle of one. The corpus went from 9,918 committed drawings to 9,863,
  and its named half from 1,159 combinations to 1,104. Insetting the `branch`
  figure took six more of each: `STRUCTURAL_MINIMUM_ROWS.branch` rose from 2 to
  3, because a `stagger` inset from both rules needs two free lattice rows
  between them and a two-row band gives it one — its teeth collapse to zero
  length and the drawing forks nowhere, which the charter's relaxation
  assertion refuses. `comb` and `rung` still draw at two rows, so 3 is
  `stagger`'s floor rather than the lattice's. The corpus stands at 9,857 and
  its named half at 1,098.
- **`stagger` varies a shape after all, and `--branches` draws its crenel.**
  While both rules ran end to end along the border rows, the rail a `stagger`
  run reinforced was ink already on the page, so `--branches` decided only the
  repeat unit's width — `branches − 1` lattice columns — and nothing about the
  figure inside it. With the rail a row clear of both rules the crenellation is
  drawn: the mode forks `(branches − 2) × repeats − 1` times and leaves six
  more free ends than that, against `comb`'s flat `columns − 2` and
  `columns + 2` at the same width. #682 raised the floor to four because at
  three the unit width collided with `comb`'s own, and that coincidence is all
  that is left of the bound's reason — the degeneracy it was set against is
  gone, so the floor is retained rather than derived and lowering it is a
  decision about which drawings the corpus commits.
- **`branch` keeps free ends in every mode.** Closing every loop closed every
  end, and that was the state for one commit: `plain` and `stagger` left none
  and `rung` left `6 × rows − 4`. The write-up under "Unbounded branching" in
  the project README judged a figure with no free ends to read as a grille
  rather than as a running border, and this decision was recorded as overriding
  that judgement — identifiability being worth more than the reading. It turned
  out not to be a choice between them. A rule inset by one lattice row
  identifies the band without touching the ink, so a tooth stops short of it
  and terminates: 14 free ends with no modifier, 17 to 29 under `stagger`, and
  `6 × rows − 3` under `rung`, at every row count the family commits.
