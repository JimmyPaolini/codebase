# ConformetryCli

NestJS command-line application scaffold generated with `conformetry:nestjs-command-project`.

`@conformetry/cli` is the command-line host for conformetry generation
and validation workflows.

- It is one host among others: it expands globs, prompts for missing inputs,
  and hands candidates to the generic packages. `@conformetry/nx`
  is a second host doing the same job through Nx.
- It owns no generation or validation logic. That lives in
  `@conformetry/generation` and
  `@conformetry/validation`, which know nothing about either host.
- Nothing depends on this package. Consumers wanting to embed conformetry
  should depend on the generic packages directly.

## Start

```bash
nx run conformetry-cli:start
```

## Test

```bash
nx run conformetry-cli:test
```
