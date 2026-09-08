# Address every meander by its lattice

`meanderaw` named a `mosaic` tile by its ink and every other family by the
arguments that asked for it. Every drawing in every family now carries a
**lattice address** — `<rows>r<columns>c-` followed by one hexadecimal character
per interior lattice point, worth `8` north, `4` south, `2` east and `1` west,
spanning one true repeat — read off the rendered document rather than off the
generator, with its canonical symmetry class reported beside it. The encoding
and the canonical name left `MosaicSymmetryService` for a new
`LatticeIdentificationService`; the symmetry group itself did not follow them.

`snake plain` at six rows is `6r5c-63335c635ccc69ccca399a333`, and `snake flip`
is the wider, genuinely different
`6r8c-333356335635cc63cc69cca5cca39a399a333333`, because turning a unit over
doubles the repeat. A `snake` has a hexadecimal name because the lattice was
already the shared substrate — `MeanderLatticeService` reduces any rendered
document to which one-pitch steps carry ink, knowing nothing about families —
and `mosaic` filenames already carried addresses. What was missing was only the
step from a lattice reading to a name.

Every number below was measured by `LatticeIdentificationService` reading the
committed corpus off disk, and each one is the expected value of an assertion in
`testing/address-table.integration.test.ts`,
`lattice-identification.service.integration.test.ts`, or the `🗺️ Lattice
Addresses` table the project README commits.

## Considered options

- **Address every family on the shared lattice, at its own true repeat.**
  Chosen. All **9,863** committed drawings address, and the addresses are what
  let two families be compared at all: **155** combinations of row count, span,
  and canonical class are drawn by more than one family — 92 shared by `mosaic`
  and `negative`, 22 by `mosaic` and `parallel`, 18 by `snake` and `whirl`.
  `parallel serpentine-strands-3-offset-1` at three rows carries `3r2c-56a9`,
  which is the committed `mosaic` `zigzag` tile of that shape, and it earns
  `zigzag` as a structural name.
- **Leave the nine other families named by the arguments that asked for
  them.** Rejected. A name like `snake/6-rows/plain-6-repeats.svg` describes a
  request rather than a drawing, so nothing in the corpus related one drawing to
  another and no measurement could be taken over it. The 283 within-family class
  groups and the 48 declared collisions below are all facts that could not be
  stated at all before there was an address to state them about.
- **Move the encoding out of the mosaic module and take the symmetry group with
  it.** Rejected, though [#671](https://github.com/JimmyPaolini/codebase/issues/671)
  listed `canonicalTile` and the orbit walk among the things that should move.
  `MosaicTilesService.enumerate` deduplicates the enumeration through
  `canonicalTile`, and `mosaic-tile` sits upstream of `lattice-identification`,
  so moving it would put the two modules in an import cycle — which in this
  workspace crashes the Nx plugin worker rather than merely failing a lint rule.
  What was taken instead is the resolution: the encoding and the canonical
  **name** moved, the group and every tile-shaped operation over it stayed, and
  the enumeration folds on `MosaicSymmetryService.edgeKey`, which separates the
  same classes and needs no identifier at all. Every committed `mosaic` filename
  is byte-identical to what it was, which is what says the move changed no
  output.
- **Leave the encoding in the mosaic module and call it a lattice concern
  anyway.** Rejected. It is a claim the code would contradict: a reader
  following `snake`'s name into `mosaic-tile/` learns that `mosaic` is
  privileged after all.
- **Report the canonical class as the name and drop the literal address.**
  Rejected. Folding the name would erase distinctions the corpus actually draws:
  **669** committed drawings sit in a class that covers more than one address
  inside a single family and row count, across **283** such classes — 208 groups
  in `parallel`, 55 in `negative`, 10 each in `boxes` and `branch`. `boxes spin`
  and `boxes spin-flip` at three rows are one class and two different tiles, and
  so are `branch rung-leftward` and `rung-rightward`. Reporting both costs
  almost nothing: for **9,167** of the 9,863 drawings the literal address is
  already the canonical member, so the two columns differ only where the
  difference is the point.
- **Ask the generator for the name instead of reading the document.** Rejected.
  Identification is the reverse of generation, so it takes the finished document
  as its input; a renderer that draws the wrong thing then cannot be handed a
  name it did not earn. It costs a rendering per address and it means everything
  `MeanderLatticeService` refuses — a curve, a diagonal, a second stroke width, a
  coordinate off the grid — is refused here too, unaltered.
- **Address at the family's pitch.** Rejected, and this is the one option a
  measurement killed outright. `boxes spin` at five rows with a pitch of four
  yields four different addresses on consecutive units and cycles back at the
  fifth, so a pitch is not an address. The span is a whole number of pitches
  instead, declared per modifier in `MODIFIER_REPEAT_PITCHES` and held to
  account by a corpus-wide assertion that consecutive units address identically.

## Consequences

- **The address cannot distinguish two drawings that differ only in a
  border-to-interior vertical.** A `MosaicTile` records only interior vertical
  edges — `MosaicTileService.blankEdges` gives it `rows - 2` vertical levels — so
  a two-row band has no addressable vertical edge at all and its address is a
  single row of horizontal bits. `EXPECTED_ADDRESS_COLLISIONS` is where that is
  written down: **48** addresses, one in `branch`, one in `parallel`, and 46 in
  `negative`, whose enumerated half files a drawing under the identifier of a
  source with one level more than the address spells out. It is declared in
  **both** directions, so an entry that stops colliding fails exactly as an
  undeclared collision does and the list cannot rot into a blanket permission.
- **The true repeat exceeds the pitch for four modifiers, not the two the spec
  named.** `spin` and `spin-flip` take `SPIN_CYCLE_LENGTH` pitches, as the spec
  said, and `edge-flip` and `plied` take two — 18 `edge-flip` drawings and 65
  `plied` ones have a minimal period wider than their own pitch, against 10 each
  for the two rotations. The one `plied` drawing that does not is the two-strand
  ply of a two-row band, and a declared span wider than the minimal one still
  addresses it correctly.
- **A sub-family is now earned outside `mosaic`, and that is a discovery rather
  than a reclassification.** `MosaicNamingService.rules` was already pure
  structure over a tile, so it answers for a reading from any family unchanged:
  **121** of the 1,104 swept combinations earn a name — 46 in `branch`, 25 in
  `negative`, 50 in `parallel` — and the other six swept families earn none at
  any row count or modifier. The name is reported in a column beside the family
  rather than in place of it.
- **Two drawings sharing an address may still differ in their dotting.** The
  address encodes edges only, so a lattice point lying on no edge addresses as
  `0` whether or not the family paints a dot there. Admitting a fifth state would
  cost the encoding its hexadecimal spelling, and whether a bare point is painted
  is a family-level fact rather than a lattice one.
- **Nothing in `output/` is renamed by this.** The address lives in the
  committed table and in the service; per-family filename conventions are a
  separate decision, and the 255-byte limit on a path component is why — a
  `swirl flip` at twelve rows addresses to 462 hexadecimal characters.
- **The addressed window is placed in pitches rather than in spans.** A drawing
  is read one pitch in from each end, because both ends carry the band's own
  termination rather than its pattern and those artifacts are one unit wide
  however many units a repeat takes. `boxes spin` at five rows is drawn 31
  lattice columns wide and spans 16 of them: clearing a whole span at each end
  would need 48 columns and leave the drawing with no address at all, where
  clearing a pitch needs 24.
