# 📗 Documentation limits

A **documentation limit** is how long a comment may run. Two of them exist, and
each is enabled on its own: `documentation` measures a documented declaration's
JSDoc comment per declaration kind, and `yaml.comments` measures a YAML comment
block. They are the only limits with no `metric` path to write, because comments
are found rather than addressed.

## Run it

```bash
codometer --directory examples/corpus --config examples/documentation/codometer.config.ts --check limits
```

## What is here

```text
documentation/
├── codometer.config.ts       a per-kind JSDoc comment length budget
├── comments.config.ts        one budget across every `#` language
└── yaml-comments.config.ts   a per-block YAML comment length budget
```

It is opt-in, and gated by the same `--check limits` flag as every other limit —
there is no separate flag.

Under that configuration the corpus reports **26 documented declarations**, of
which **2 breach**: `CatalogService`, whose eight-line overview is longer than a
class's 4, and `Receipt.blank`, whose seven-line note is longer than a method's
2. Every other declaration is reported too, with its headroom — the report lists
what held as well as what did not.

## YAML comment blocks

```bash
codometer --directory examples/corpus --config examples/documentation/yaml-comments.config.ts --check limits
```

That configuration sets `yaml.comments` and no `documentation` block, so not one
JSDoc comment is measured — the two are enabled separately on purpose.

A **block** is the run of `#` lines a reader takes as one thought. A blank line
ends one, and a comment trailing a value is never part of the block above it.
Comments come from the tokenizer rather than the text, so a `#` inside a quoted
scalar stays a character in a string.

The corpus holds exactly **one** block — the note above `pipeline.yaml`'s
anchor — and that configuration declares two budgets for it. The block is
reported **once per declared maximum**, and the two disagree:

```text
  ok      yaml/pipeline.yaml:2   1/1 lines
  BREACH  yaml/pipeline.yaml:2  12/5 words
```

That is why the maxima are separate fields rather than one `maximum` steered by
a `unit`: a block can sit inside one budget and outside another, and a shape
that made them alternatives could not say so. Declaring none measures nothing.

Both kinds reach the report through one channel and render the same way; `kind`
is what says which was measured.

## Every language, one budget

```bash
codometer --directory examples/corpus --config examples/documentation/comments.config.ts --check limits
```

`comments` at the top level is the repository-wide budget; a language's own
block is merged field by field over it. That configuration holds every
language to three words and loosens shell to eight:

```text
  BREACH  css/theme.css:1          12/3 words
  BREACH  hcl/network.tf:1         12/3 words
  BREACH  python/inventory.py:7    10/3 words
  BREACH  shell/release.sh:2       11/8 words
  ok      shell/release.sh:8        6/8 words
  BREACH  sql/reporting.sql:1       7/3 words
  BREACH  toml/service.toml:1       5/3 words
  BREACH  yaml/pipeline.yaml:2     12/3 words
```

They arrive in measurement order — CSS, HCL, Python, shell, SQL, TOML, YAML —
not sorted. `typescript` is in that order too, right before YAML, and reports
nothing: the corpus's TypeScript and JavaScript sources carry only JSDoc
comments, and `typescript` skips exactly those.

Two things are visible there. The shell override changes only the field it
names, and both sides of it are reported. And `release.sh`'s first block starts
on line **2**, not line 1: a `#!` shebang is never a comment, and without that
rule every shell script opening with one would measure a block whose first word
is `!/usr/bin/env`.

Python, YAML, CSS, and TypeScript/JavaScript's non-JSDoc comments are read by a
real parser or tokenizer — `tokenize` in the Python subprocess, the `yaml`
package's CST, postcss's own parse, the TypeScript compiler's scanner — so none
of the four mistakes a comment marker inside a string literal for a comment.
Shell, TOML, SQL, and HCL use a line scanner instead (SQL through the same
patterns `SqlService` already strips comments with) that cannot tell the two
apart, exactly as those analyzers' own `comments` counters already cannot. HCL
is the only language read for all three of its comment markers at once — `#`,
`//`, and `/* */`.

Every budget here is **per block**. Add a `file` block to measure every comment
in one file together instead — the two are reported side by side, because a
file holding forty well-sized comments is a different thing from one holding a
single essay.

## What is absent is as informative

A module-level `const`, including one holding an arrow function, is not a
documented declaration and is never measured. So `priceLine` and
`DEFAULT_CURRENCY` never appear, whatever comments they carry.

## Next

[write-check](../write-check/README.md), for turning a breach into a gate.
