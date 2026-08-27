# 📗 Documentation limits

A **documentation limit** is how long one documented declaration's JSDoc comment
may run, per declaration kind. It is the only limit with no `metric` path to
write, because declarations are found rather than addressed.

## Run it

```bash
codometer --directory examples/corpus --config examples/documentation/codometer.config.ts --check limits
```

## What is here

```text
documentation/
└── codometer.config.ts    a per-kind comment length budget
```

It is opt-in, and gated by the same `--check limits` flag as every other limit —
there is no separate flag.

Under that configuration the corpus reports **26 documented declarations**, of
which **2 breach**: `CatalogService`, whose eight-line overview is longer than a
class's 4, and `Receipt.blank`, whose seven-line note is longer than a method's
2. Every other declaration is reported too, with its headroom — the report lists
what held as well as what did not.

## What is absent is as informative

A module-level `const`, including one holding an arrow function, is not a
documented declaration and is never measured. So `priceLine` and
`DEFAULT_CURRENCY` never appear, whatever comments they carry.

## Next

[write-check](../write-check/README.md), for turning a breach into a gate.
