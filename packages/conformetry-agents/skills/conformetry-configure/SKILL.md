---
name: conformetry-configure
description: Add or change a conformetry generator, and write the template it renders. Use when a needed generator does not exist yet; when editing a conformetry configuration file; when writing or changing files under a template directory; when choosing placeholders or naming-case variants; when a generated file came out with an empty value or an odd path segment; or when a conformetry command refuses to run because the emitted generator plugin is out of date.
license: MIT
---

# Configuring conformetry and writing templates

A **generator** pairs a name with a **template** — an ordinary folder of ordinary
files — and the inputs needed to render it. The configuration declares
generators; the template folder is the whole definition of what gets produced.
The same template is then what instances are measured against, so a template is
a standard as much as a starting point.

## The configuration

The configuration file default-exports an array, one entry per generator. Only
two fields are required:

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | How the generator is invoked |
| `templatePath` | yes | Template folder, relative to the workspace root |
| `inputs` | no | Values the template renders with, as JSON Schema fragments |
| `instances` | no | Where this generator's output already lives |
| `aliases` | no | Short alternative names |
| `description` | no | Shown when generators are listed |
| `threshold` | no | Lowest conformance score this generator's instances may have, 0 to 1 |

Unknown keys are **stripped silently** rather than rejected, so a misspelled
field is not an error — it simply does nothing. Check your entry took effect by
listing the generators:

```bash
conformetry templates
```

A generator with neither `inputs` nor `instances` is legal: it renders a fixed
template that nothing validates afterwards.

### Three collisions the configuration refuses to load with

1. **Names and aliases share one namespace.** An alias may not collide with
   another generator's name, or with another alias.
2. **Two generators may not name the same `templatePath`.** Validation could not
   tell which generator a matching instance belongs to.
3. **A name or alias may not be empty or contain a path separator.** Each becomes
   a filename in the emitted Nx plugin.

### Instance groups: where output already lives

`instances` is a list of groups, each with optional `patterns`, `tags`,
`substitutions`, and `threshold`. Groups exist so substitutions — and the
conformance bar — can differ per set of paths.

Under the Nx plugin, `tags` is what changes a group's meaning:

- **A group with tags is a project selector.** It applies to any project
  carrying one of those tags, and its `patterns` are read _inside_ each selected
  project — so `src/modules/*` means the same thing in every project.
- **A group with no tags is a plain workspace glob**, used verbatim.
- **A group with tags and no patterns selects without locating.** That is how a
  generator scopes which projects it may target while validating nothing.

Directory patterns and file patterns behave differently, and the difference
decides which template can win a match. See
[references/languages.md](references/languages.md) for what each language then
compares.

## Inputs

Each input is a JSON Schema fragment. These keys are honored; anything else is
ignored:

| Key | Effect |
| --- | --- |
| `description` | The prompt text |
| `enum` | Turns the prompt into a list, and restricts the value |
| `minLength` / `maxLength` | Length validation |
| `pattern` | Tested as a unicode regular expression |

**The two hosts disagree about whether inputs are required, and the
configuration cannot change that.** The Nx plugin marks every declared input
required. The command-line host marks none required. Write templates so that a
missing value is obvious in the output rather than assuming either behavior.

Four input names carry extra meaning under the Nx plugin and are worth using
deliberately rather than by accident: `project`, `module`, `type`, and
`directory` all steer where output lands. Declaring an input called `project` on
a generator whose groups carry tags additionally turns it into a project picker.

`config`, `generator`, `help`, and `instancePath` are reserved and never treated
as inputs. `name` is deliberately _not_ reserved.

## Writing a template

The folder is the definition. Nothing registers a template's files.

**A template that should produce a folder contains that folder.** Its instance
path is then the folder's _parent_. A template that produces loose files holds
them at its root. Get this wrong and output lands one level off.

### Placeholders

Rendering is mustache, with HTML escaping switched off — so write `{{field}}`
and never `{{{field}}}`. Paths use the same braces as content: a file named
`{{nameKebabCase}}.service.ts` renders to `orders.service.ts`.

Four naming-case variants are always available, derived from the name:

| Placeholder | `search bar` becomes |
| --- | --- |
| `{{nameCamelCase}}` | `searchBar` |
| `{{nameKebabCase}}` | `search-bar` |
| `{{namePascalCase}}` | `SearchBar` |
| `{{nameSnakeCase}}` | `search_bar` |

Explicit inputs and configured substitutions are applied _last_, so they always
beat a derived variant of the same name.

**An unknown placeholder renders as an empty string. It never raises.** A typo
in content leaves a silent hole; a typo in a path leaves an empty path segment.
This is the single most common way a generated file comes out wrong, and nothing
reports it — the run succeeds. After changing a template, generate once and read
the output.

### There is no conditional-file mechanism

No per-file predicate, no extension filtering, no skip list. Every file in the
tree is rendered and written. Mustache sections work _inside_ content, but a
path rendered from an empty placeholder yields an empty segment rather than a
skipped file. Do not go looking for a way to make a file optional; there isn't
one.

### Marking a value as free

A comment containing `TODO` is a placeholder: any comment in the instance
satisfies it. Use it for prose that legitimately varies per instance.

There is **no equivalent for string literals**. A string in a template is
required verbatim, so a placeholder description or message becomes a permanent
requirement for every instance. Prefer leaving such a value out of the template
to pinning wording nobody wants.

## Thresholds

Conformance is scored rather than merely passed, and a threshold is the lowest
score an instance may have. It resolves narrowest-first: an instance group's
`threshold`, then the generator's, then a run-level `--threshold`, then `1`.

**Leave it unset unless you are migrating.** The default of `1` means a perfect
match, which is what makes a template a standard rather than a suggestion. Lower
it deliberately when bringing existing instances onto a new template gradually,
and raise it back as they catch up — a permanently lowered threshold is a
template that no longer describes its instances.

A lowered threshold does not suppress reporting: differences still print for an
instance that cleared its bar.

## After changing the configuration

The Nx generator namespace is emitted from the configuration, and **every
conformetry command refuses to run while it is out of date** rather than working
from stale definitions:

```bash
nx sync
```

Two failures come from this area and both name their own fix:

- A file being out of date with the configuration — run `nx sync`.
- A generator naming a template folder that does not exist — fix `templatePath`,
  or create the folder.

A dependency install only warns rather than failing when emission does not work,
so a mid-edit configuration never breaks everyone's install. That also means a
warning there is real and worth reading.

## Checking your work

Generate an instance, then check it conforms. A freshly generated instance
conforms by construction, so any difference means the template and the
configuration disagree — see the `conformetry-validate` skill for reading the
result, and `conformetry-generate` for the generation step itself.
