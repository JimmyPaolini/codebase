# 🚰 Lexico Ingestion

**Where the dictionary comes from.** A NestJS command-line application that
scrapes, parses, and loads the sources behind
[Lexico](../lexico/README.md) into the schema defined by
[lexico-entities](../../packages/lexico-entities/README.md).

## Quick Start

```bash
cp .env.default .env      # Database connection
nx run lexico-ingestion:start
```

The default command is the root pipeline, which prompts for any stage flags it
was not given and then runs the selected stages in order.

```bash
nx run lexico-ingestion:start -- --dictionary --literature
```

| Stage flag | Ingests |
| ---------- | ------- |
| `--dictionary` | Dictionary entries, forms, and inflections |
| `--library` | The library of works |
| `--library-sources` | The upstream sources each work came from |
| `--literature` | Lines and tokens of each text |
| `--wikipedia` | Wiktionary pages |

## Individual stages

Every stage is also its own command, addressable as a `start` configuration:

```bash
nx run lexico-ingestion:start:dictionary -- --startLemma=a --endLemma=c
nx run lexico-ingestion:start:wiktionary
nx run lexico-ingestion:start:clear
```

| Command | Source |
| ------- | ------ |
| `dictionary` | Dictionary entries, resumable with `--startLemma` / `--endLemma` |
| `wiktionary` | Wiktionary page dumps |
| `perseus` | The Perseus Digital Library |
| `latin-library` | The Latin Library |
| `corpus-scriptorum-ecclesiasticorum-latinorum` | CSEL, the ecclesiastical Latin corpus |
| `epigraphik-datenbank-clauss-slaby` | EDCS, the Latin inscription database |
| `library` | Library and work metadata |
| `literature` | Lines and tokens for loaded texts |
| `clear` | Empties ingested tables so a run can start clean |

The lemma range on `dictionary` is what makes a long scrape restartable: a run
that stops partway is resumed by pointing `--startLemma` at where it left off
rather than starting over.

## How it works

Each source has its own module under `src/modules/`, holding the fetcher, the
parser for that source's markup, and the mapping into entities. HTML is parsed
with [cheerio](https://cheerio.js.org) and wiki markup through mdast, so a
change to one site's layout is contained to one module.

Nothing here defines the schema. Entities and migrations come from
[`@codebase/lexico-entities`](../../packages/lexico-entities/README.md), so the
shape ingestion writes and the shape the application reads cannot drift.

## Start

```bash
nx run lexico-ingestion:start
```

## Test

```bash
nx run lexico-ingestion:vitest
```

## Development

```bash
nx run lexico-ingestion:typecheck
nx run lexico-ingestion:lint-codebase --configuration=write
```

Run migrations before a first ingestion:

```bash
nx run lexico-entities:migration:run
```

## Related

- 🐺 [lexico](../lexico/README.md) — the web application
- 📖 [lexico-entities](../../packages/lexico-entities/README.md) — the schema this writes to
- 🎨 [lexico-components](../../packages/lexico-components/README.md) — the interface

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-command-project](../../configuration/conformetry-templates/nestjs-command-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `applications/lexico-ingestion`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 576 |
| Files | 107 |
| Calls traced | 614 |
| Call stacks | 34 |
| Deepest stack | 19 |
| Stacks through recursion | 3 |
| Unfollowable calls | 103 |

### Call stacks (depth)

**1. `LexicoIngestionCommand.run`** — depth ≥ 19 · decorated-method

```text
🚀 LexicoIngestionCommand.run(…): Promise<void> [applications/lexico-ingestion/src/modules/lexico-ingestion/lexico-ingestion.command.ts:219]
   ↳ Executes the selected stage sequence after prompting for any unspecified toggles.
  └─> LexicoIngestionCommand.executeStages(options: LexicoIngestionCommandOptions): Promise<void> [applications/lexico-ingestion/src/modules/lexico-ingestion/lexico-ingestion.command.ts:54]
     ↳ Processes one workflow step for root ingestion pipeline execution.
    └─> DictionaryCommand.ingestAll(startLemma?: string, endLemma?: string): Promise<void> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:319]
       ↳ Iterates cached `data/wiktionary/*.json` pages within an optional lemma range and ingests each file into persisted…
      └─> DictionaryCommand.processFile(file: string, current: number, total: number): Promise<void> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:222]
         ↳ Processes one workflow step for dictionary ingestion.
        └─> DictionaryCommand.ingestLexeme(…): Promise<void> (cycle) [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:353]
           ↳ Ingests one lemma by parsing its Wiktionary HTML into lexemes, saving relations, and recursively resolving…
          └─> DictionaryCommand.processTranslationReferences(saved: Lexeme): Promise<void> (cycle) [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:282]
             ↳ Processes one workflow step for dictionary ingestion.
            └─> LexemesService.parseLexemes(wiktionaryPage: WiktionaryPage): Promise<Lexeme[]> [applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:305]
               ↳ Parses one Wiktionary page into lexemes by iterating `p:has(strong.Latn.headword)` sections and enriching each accepted…
              └─> LexemesService.parseLexemeFromElement(…): Promise<Lexeme | null> [applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:144]
                 ↳ Parses and normalizes inputs for lexeme parsing and persistence.
                └─> LexemesService.enrichLexeme(…): Promise<void> [applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:71]
                   ↳ Handles an internal workflow step for lexeme parsing and persistence.
                  └─> FormsService.buildFormsForPartOfSpeech(pos: PartOfSpeech, rawForms: unknown, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms.service.ts:127]
                     ↳ Builds Form entities from the raw parsed forms object for a given POS.
                    └─> FormsBuilderOtherService.buildFormsForPartOfSpeech(pos: PartOfSpeech, rawForms: unknown, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:482]
                       ↳ Builds Form entities for a given part-of-speech category.
                      └─> FormsBuilderOtherService.buildVerbFormsFromRaw(rawForms: unknown, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:393]
                         ↳ Builds structured data used during form entity building.
                        └─> FormsBuilderOtherService.buildFiniteMoodForms(moodData: Record<string, unknown>, mood: FormMood, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:160]
                           ↳ Builds structured data used during form entity building.
                          └─> FormsBuilderOtherService.buildFiniteTenseForms(…): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:237]
                             ↳ Builds structured data used during form entity building.
                            └─> FormsBuilderOtherService.buildFiniteNumberForms(…): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:186]
                               ↳ Builds structured data used during form entity building.
                              └─> FormsBuilderOtherService.buildFinitePersonForms(…): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:214]
                                 ↳ Builds structured data used during form entity building.
                                └─> FormsBuilderVerbService.buildFinitePersonForms(args: BuildFinitePersonFormsArguments): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:121]
                                   ↳ Builds finite verb forms for specific persons based on the provided arguments, including lexeme, mood, number, tense,…
                                  └─> FormsBuilderVerbService.buildFiniteVerbForm(…): Form [applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:55]
                                     ↳ Builds a finite verb form for a specific person based on the provided arguments, including lexeme, mood, number, tense,…
                                    └─> FormsTransientWordsService.setTransientWords(form: Form, words: string[]): void [applications/lexico-ingestion/src/modules/forms/forms-transient-words.service.ts:34]
                                       ↳ Associates a list of transient words with a given Form entity.
```

**2. `DictionaryCommand.run`** — depth ≥ 18 · decorated-method

```text
🚀 DictionaryCommand.run(_arguments: string[], options: DictionaryCommandOptions): Promise<void> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:472]
   ↳ Runs full dictionary ingestion for the selected lemma range, then applies manual entries.
  └─> DictionaryCommand.ingestAll(startLemma?: string, endLemma?: string): Promise<void> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:319]
     ↳ Iterates cached `data/wiktionary/*.json` pages within an optional lemma range and ingests each file into persisted…
    └─> DictionaryCommand.processFile(file: string, current: number, total: number): Promise<void> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:222]
       ↳ Processes one workflow step for dictionary ingestion.
      └─> DictionaryCommand.ingestLexeme(…): Promise<void> (cycle) [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:353]
         ↳ Ingests one lemma by parsing its Wiktionary HTML into lexemes, saving relations, and recursively resolving…
        └─> DictionaryCommand.processTranslationReferences(saved: Lexeme): Promise<void> (cycle) [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:282]
           ↳ Processes one workflow step for dictionary ingestion.
          └─> LexemesService.parseLexemes(wiktionaryPage: WiktionaryPage): Promise<Lexeme[]> [applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:305]
             ↳ Parses one Wiktionary page into lexemes by iterating `p:has(strong.Latn.headword)` sections and enriching each accepted…
            └─> LexemesService.parseLexemeFromElement(…): Promise<Lexeme | null> [applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:144]
               ↳ Parses and normalizes inputs for lexeme parsing and persistence.
              └─> LexemesService.enrichLexeme(…): Promise<void> [applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:71]
                 ↳ Handles an internal workflow step for lexeme parsing and persistence.
                └─> FormsService.buildFormsForPartOfSpeech(pos: PartOfSpeech, rawForms: unknown, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms.service.ts:127]
                   ↳ Builds Form entities from the raw parsed forms object for a given POS.
                  └─> FormsBuilderOtherService.buildFormsForPartOfSpeech(pos: PartOfSpeech, rawForms: unknown, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:482]
                     ↳ Builds Form entities for a given part-of-speech category.
                    └─> FormsBuilderOtherService.buildVerbFormsFromRaw(rawForms: unknown, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:393]
                       ↳ Builds structured data used during form entity building.
                      └─> FormsBuilderOtherService.buildFiniteMoodForms(moodData: Record<string, unknown>, mood: FormMood, lexeme: Lexeme): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:160]
                         ↳ Builds structured data used during form entity building.
                        └─> FormsBuilderOtherService.buildFiniteTenseForms(…): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:237]
                           ↳ Builds structured data used during form entity building.
                          └─> FormsBuilderOtherService.buildFiniteNumberForms(…): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:186]
                             ↳ Builds structured data used during form entity building.
                            └─> FormsBuilderOtherService.buildFinitePersonForms(…): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:214]
                               ↳ Builds structured data used during form entity building.
                              └─> FormsBuilderVerbService.buildFinitePersonForms(args: BuildFinitePersonFormsArguments): Form[] [applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:121]
                                 ↳ Builds finite verb forms for specific persons based on the provided arguments, including lexeme, mood, number, tense,…
                                └─> FormsBuilderVerbService.buildFiniteVerbForm(…): Form [applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:55]
                                   ↳ Builds a finite verb form for a specific person based on the provided arguments, including lexeme, mood, number, tense,…
                                  └─> FormsTransientWordsService.setTransientWords(form: Form, words: string[]): void [applications/lexico-ingestion/src/modules/forms/forms-transient-words.service.ts:34]
                                     ↳ Associates a list of transient words with a given Form entity.
```

**3. `LibraryCommand.run`** — depth ≥ 15 · decorated-method

```text
🚀 LibraryCommand.run(_arguments: string[], options: LibraryCommandOptions): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:466]
   ↳ Orchestrates provider execution with optional author/text scoping and progress logging.
  └─> LibraryCommand.processProvider(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:157]
     ↳ Processes one workflow step for library provider orchestration.
    └─> PerseusLibraryProvider.ingest(options?: { author?: string; text?: string; }): Promise<Author[]> [applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:371]
       ↳ Fetch authors, works, and output markdown files to the data directory.
      └─> PerseusLibraryProvider.processPerseusFile(…): Promise<void> [applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:175]
         ↳ Processes one workflow step for Perseus XML ingestion.
        └─> PerseusLibraryProvider.processSourceXmlFile(…): Promise<void> [applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:219]
           ↳ Processes one workflow step for Perseus XML ingestion.
          └─> PerseusLibraryProvider.writeSourceTextForAuthor(…): Promise<void> [applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:311]
             ↳ Persists generated output for Perseus XML ingestion.
            └─> PerseusLibraryProvider.writeSourceMarkdownFiles(…): Promise<void> [applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:263]
               ↳ Persists generated output for Perseus XML ingestion.
              └─> PerseusLibraryTextExtractionProvider.extractTextNodes(…): void (cycle) [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:206]
                 ↳ Builds markdown file payloads from nested Perseus `textpart` elements.
                └─> PerseusLibraryTextExtractionProvider.processTextPartChildren(…): void (cycle) [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:150]
                   ↳ Recurses into child text parts and writes direct child paragraphs.
                  └─> PerseusLibraryTextExtractionProvider.extractChildTextParts(…): void (cycle) [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:57]
                     ↳ Visits nested Perseus `textpart` children and extracts eligible sections.
                    └─> PerseusLibraryTextExtractionProvider.each(…)(_index: number, child: AnyNode): void (cycle) [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:66]
                      └─> PerseusLibraryTextExtractionProvider.processLeafTextPart(…): void [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:110]
                         ↳ Handles leaf nodes that write one markdown text file.
                        └─> PerseusLibraryTextExtractionProvider.collectParagraphsFromElements(elements: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): string[] [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:26]
                           ↳ Collects normalized paragraph text from Perseus XML elements.
                          └─> PerseusLibraryTextExtractionProvider.each(…)(_index: number, paragraphElement: AnyNode): void [applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:32]
                            └─> formatLineNumber(line: string): string [applications/lexico-ingestion/src/modules/library/library.utilities.ts:18]
                               ↳ Format line numbers consistently.
```

<details>
<summary>31 more call stacks</summary>

**4. `WiktionaryCommand.run`** — depth ≥ 8 · decorated-method

```text
🚀 WiktionaryCommand.run(): Promise<void> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:302]
   ↳ Runs the Wiktionary ingestion pipeline.
  └─> WiktionaryCommand.ingestWiktionary(): Promise<void> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:287]
     ↳ Scrapes every configured Latin category from Wiktionary, stores each article's HTML as a JSON file under…
    └─> WiktionaryCommand.ingestCategory(category?: Category, startPath?: string): Promise<void> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:139]
       ↳ Ingests category in the Wiktionary ingestion pipeline.
      └─> WiktionaryCommand.processWiktionaryCategoryLink(a: Element, $: cheerio.CheerioAPI, category: string): Promise<void> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:233]
         ↳ Processes wiktionary category link during Wiktionary ingestion.
        └─> WiktionaryCommand.ingestWord(word: string, urlPath: string, category: string): Promise<void> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:176]
           ↳ Ingests word in the Wiktionary ingestion pipeline.
          └─> WiktionaryCommand.parseLatinSection(…): Promise<{ $: CheerioAPI; section: Cheerio<AnyNode>; } | null> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:212]
             ↳ Parses latin section during Wiktionary ingestion.
            └─> WiktionaryCommand.fetchWithRetry(url: string, retries?: number): Promise<Response> [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:82]
               ↳ Fetch with retry for Wiktionary ingestion.
              └─> WiktionaryCommand.anonymous(resolve: (value: unknown) => void): void [applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:102]
```

**5. `LatinLibraryCommand.worker`** — depth ≥ 8 · orphan-root

```text
🚀 LatinLibraryCommand.worker(): Promise<void> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:419]
  └─> LatinLibraryCommand.processQueueUrl(urlString: string, host: string, enqueue: (url: string) => void): Promise<void> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:345]
     ↳ Processes one workflow step for Latin Library source crawling.
    └─> LatinLibraryCommand.parseHtmlForLinks(html: string, baseUrl: string, enqueue: (url: string) => void): void [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:272]
       ↳ Parses and normalizes inputs for Latin Library source crawling.
      └─> LatinLibraryCommand.each(…)(this: Element, _index: number, a: Element): void [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:279]
        └─> LatinLibraryCommand.processLink(href: string, baseUrl: string, enqueue: (url: string) => void): void [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:324]
           ↳ Processes one workflow step for Latin Library source crawling.
          └─> LatinLibraryCommand.shouldSkipLink(href: string): boolean [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:370]
             ↳ Handles an internal workflow step for Latin Library source crawling.
            └─> LatinLibraryCommand.isIgnoredLinkFileName(href: string): boolean [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:190]
               ↳ Returns whether the current input should proceed in Latin Library source crawling.
              └─> LatinLibraryCommand.some(…)(f: string): boolean [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:200]
```

**6. `LibraryCommand.parseAuthor`** — depth 7 · decorated-method

```text
🚀 LibraryCommand.parseAuthor(author?: string, provider?: string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/library/library.command.ts:368]
   ↳ Resolves the optional `--author` filter from CLI input or interactive selection.
  └─> LibraryCommand.getAuthorChoices(provider?: string): Promise<{ title: string; value: string; }[]> [applications/lexico-ingestion/src/modules/library/library.command.ts:79]
     ↳ Resolves derived values needed by library provider orchestration.
    └─> LibraryCommand.scanLibrary(…): Promise<{ authorSlug: string; fullPath: string; pathParts: string[]; provider: string; textSlug: string; title: string; }[]> [applications/lexico-ingestion/src/modules/library/library.command.ts:227]
       ↳ Handles an internal workflow step for library provider orchestration.
      └─> LibraryCommand.scanLibraryProvider(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:297]
         ↳ Handles an internal workflow step for library provider orchestration.
        └─> LibraryCommand.scanLibraryAuthor(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:271]
           ↳ Handles an internal workflow step for library provider orchestration.
          └─> LibraryCommand.walkLibraryDirectory(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:326]
             ↳ Processes one workflow step for library provider orchestration.
            └─> LibraryCommand.pushTextEntry(…): void [applications/lexico-ingestion/src/modules/library/library.command.ts:191]
               ↳ Handles an internal workflow step for library provider orchestration.
```

**7. `LibraryCommand.parseText`** — depth 7 · decorated-method

```text
🚀 LibraryCommand.parseText(…): Promise<string | undefined> [applications/lexico-ingestion/src/modules/library/library.command.ts:431]
   ↳ Resolves the optional `--text` filter from CLI input or interactive selection.
  └─> LibraryCommand.getTextChoices(…): Promise<{ title: string; value: string; }[]> [applications/lexico-ingestion/src/modules/library/library.command.ts:101]
     ↳ Resolves derived values needed by library provider orchestration.
    └─> LibraryCommand.scanLibrary(…): Promise<{ authorSlug: string; fullPath: string; pathParts: string[]; provider: string; textSlug: string; title: string; }[]> [applications/lexico-ingestion/src/modules/library/library.command.ts:227]
       ↳ Handles an internal workflow step for library provider orchestration.
      └─> LibraryCommand.scanLibraryProvider(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:297]
         ↳ Handles an internal workflow step for library provider orchestration.
        └─> LibraryCommand.scanLibraryAuthor(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:271]
           ↳ Handles an internal workflow step for library provider orchestration.
          └─> LibraryCommand.walkLibraryDirectory(…): Promise<void> [applications/lexico-ingestion/src/modules/library/library.command.ts:326]
             ↳ Processes one workflow step for library provider orchestration.
            └─> LibraryCommand.pushTextEntry(…): void [applications/lexico-ingestion/src/modules/library/library.command.ts:191]
               ↳ Handles an internal workflow step for library provider orchestration.
```

**8. `LatinLibraryCommand.run`** — depth ≥ 6 · decorated-method

```text
🚀 LatinLibraryCommand.run(): Promise<void> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:381]
   ↳ Crawls The Latin Library and caches discovered HTML pages locally.
  └─> LatinLibraryCommand.getFinalAuthorUrls(host: string, authorUrls: string[]): Promise<string[]> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:149]
     ↳ Resolves derived values needed by Latin Library source crawling.
    └─> LatinLibraryCommand.processCategoryHref(href: string, host: string, finalAuthorUrls: string[]): Promise<void> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:290]
       ↳ Processes one workflow step for Latin Library source crawling.
      └─> LatinLibraryCommand.fetchAndCachePage(urlString: string, host: string): Promise<string> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:86]
         ↳ Loads source data required by Latin Library source crawling.
        └─> LatinLibraryCommand.downloadAndSaveLatinLibraryFile(parsedUrl: URL, targetPath: string): Promise<string> [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:46]
           ↳ Handles an internal workflow step for Latin Library source crawling.
          └─> LatinLibraryCommand.anonymous(resolve: (value: unknown) => void): void [applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:60]
```

**9. `LiteratureCommand.run`** — depth ≥ 6 · decorated-method

```text
🚀 LiteratureCommand.run(_arguments: string[], options: LiteratureCommandOptions): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:257]
   ↳ Runs literature ingestion for the selected provider/author/text scope.
  └─> LiteratureCommand.parseProvider(provider?: string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:188]
     ↳ Resolves the optional `--provider` filter from CLI input or interactive selection.
    └─> LiteratureCommand.getProviderChoices(): Promise<{ title: string; value: string; }[]> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:91]
       ↳ Gets provider choices used by literature ingestion.
      └─> LiteratureService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:507]
         ↳ Scans the local library directory and returns discovered text entries.
        └─> LiteratureLibraryScanService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:84]
           ↳ Walks the library data directory and collects text file metadata.
          └─> LiteratureLibraryScanService.walkLibraryDirectory(…): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:41]
             ↳ Recursively walks one provider directory and collects markdown entries.
```

**10. `LiteratureService.ingestText`** — depth 6 · orphan-root

```text
🚀 LiteratureService.ingestText(args: IngestTextArguments): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:270]
   ↳ Ingests text in the literature ingestion pipeline.
  └─> LiteratureService.ingestLines(text: Text, ast: Root): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:241]
     ↳ Ingests lines in the literature ingestion pipeline.
    └─> LiteratureService.extractTokensFromLine(…): _QueryDeepPartialEntity<Token>[] [applications/lexico-ingestion/src/modules/literature/literature.service.ts:152]
       ↳ Extracts tokens from line from literature ingestion input.
      └─> LiteratureService.map(…)(…): { author: { id: string; }; data: string; index: number; isPunctuation: boolean; line: { id: string; }; text: { id: string; }; word: { id: string; } | null; } [applications/lexico-ingestion/src/modules/literature/literature.service.ts:158]
        └─> LiteratureWordNormalizationService.escapeCapitals(word: string): string [applications/lexico-ingestion/src/modules/literature/literature-word-normalization.service.ts:27]
           ↳ Escapes capitals as an underscore and the lowercase letter, matching how the dictionary stores words whose case is…
          └─> LiteratureWordNormalizationService.replaceAll(…)(character: string): string [applications/lexico-ingestion/src/modules/literature/literature-word-normalization.service.ts:30]
```

**11. `EpigraphikDatenbankClaussSlabyCommand.run`** — depth 5 · decorated-method

```text
🚀 EpigraphikDatenbankClaussSlabyCommand.run(): Promise<void> [applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:137]
   ↳ Runs the ingestion of epigraphs by downloading chunks to the filesystem
  └─> EpigraphikDatenbankClaussSlabyCommand.downloadChunkIfMissing(start: number): Promise<boolean> [applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:75]
     ↳ Handles an internal workflow step for EDCS chunk ingestion.
    └─> EpigraphikDatenbankClaussSlabyCommand.downloadChunkData(start: number, chunkFile: string): Promise<boolean> [applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:50]
       ↳ Handles an internal workflow step for EDCS chunk ingestion.
      └─> EpigraphikDatenbankClaussSlabyCommand.saveChunkData(start: number, chunkFile: string): Promise<boolean> [applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:97]
         ↳ Persists generated output for EDCS chunk ingestion.
        └─> EpigraphikDatenbankClaussSlabyCommand.anonymous(resolve: (value: unknown) => void): void [applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:128]
```

**12. `LiteratureCommand.parseAuthor`** — depth 5 · decorated-method

```text
🚀 LiteratureCommand.parseAuthor(author?: string, provider?: string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:153]
   ↳ Resolves the optional `--author` filter from CLI input or interactive selection.
  └─> LiteratureCommand.getAuthorChoices(provider?: string): Promise<{ title: string; value: string; }[]> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:75]
     ↳ Gets author choices used by literature ingestion.
    └─> LiteratureService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:507]
       ↳ Scans the local library directory and returns discovered text entries.
      └─> LiteratureLibraryScanService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:84]
         ↳ Walks the library data directory and collects text file metadata.
        └─> LiteratureLibraryScanService.walkLibraryDirectory(…): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:41]
           ↳ Recursively walks one provider directory and collects markdown entries.
```

**13. `LiteratureCommand.parseProvider`** — depth 5 · decorated-method

```text
🚀 LiteratureCommand.parseProvider(provider?: string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:188]
   ↳ Resolves the optional `--provider` filter from CLI input or interactive selection.
  └─> LiteratureCommand.getProviderChoices(): Promise<{ title: string; value: string; }[]> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:91]
     ↳ Gets provider choices used by literature ingestion.
    └─> LiteratureService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:507]
       ↳ Scans the local library directory and returns discovered text entries.
      └─> LiteratureLibraryScanService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:84]
         ↳ Walks the library data directory and collects text file metadata.
        └─> LiteratureLibraryScanService.walkLibraryDirectory(…): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:41]
           ↳ Recursively walks one provider directory and collects markdown entries.
```

**14. `LiteratureCommand.parseText`** — depth 5 · decorated-method

```text
🚀 LiteratureCommand.parseText(…): Promise<string | undefined> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:218]
   ↳ Resolves the optional `--text` filter from CLI input or interactive selection.
  └─> LiteratureCommand.getTextChoices(…): Promise<{ title: string; value: string; }[]> [applications/lexico-ingestion/src/modules/literature/literature.command.ts:104]
     ↳ Gets text choices used by literature ingestion.
    └─> LiteratureService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:507]
       ↳ Scans the local library directory and returns discovered text entries.
      └─> LiteratureLibraryScanService.scanLibrary(): Promise<LibraryEntry[]> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:84]
         ↳ Walks the library data directory and collects text file metadata.
        └─> LiteratureLibraryScanService.walkLibraryDirectory(…): Promise<void> [applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:41]
           ↳ Recursively walks one provider directory and collects markdown entries.
```

**15. `PartOfSpeechFormsService.parseGenericForms`** — depth ≥ 5 · orphan-root

```text
🚀 PartOfSpeechFormsService.parseGenericForms(args: { $: cheerio.CheerioAPI; elt: AnyNode; lexeme: Lexeme; }): unknown [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:358]
   ↳ Parses non-verb inflection table forms into nested identifiers.
  └─> PartOfSpeechFormsService.findGenericIdentifiers(…): string[] [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:58]
     ↳ Finds generic identifiers for part-of-speech parsing workflows.
    └─> PartOfSpeechFormsService.collectTableIdentifiers(index: number, index_: number, table_: string[][]): Set<string> [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:35]
       ↳ Collects table identifiers required by part-of-speech parsing.
      └─> PartOfSpeechFormsService.scanTableAxis(…): { finalIndex: number; identifiers: Set<string>; } [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:299]
         ↳ Scans table axis for part-of-speech parsing context.
        └─> PartOfSpeechFormsService.isGenericFormCell(cell: string): boolean [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:127]
           ↳ Checks whether generic form cell in part-of-speech parsing logic.
```

**16. `PartOfSpeechFormsService.parseVerbForms`** — depth ≥ 5 · orphan-root

```text
🚀 PartOfSpeechFormsService.parseVerbForms(args: { $: cheerio.CheerioAPI; elt: AnyNode; }): unknown [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:404]
   ↳ Parses verb inflection table forms into nested identifiers.
  └─> PartOfSpeechFormsService.processVerbFormRow(…): void [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:225]
     ↳ Processes verb form row during part-of-speech parsing.
    └─> PartOfSpeechFormsService.findVerbIdentifiers(index: number, index_: number, table_: string[][]): string[] [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:83]
       ↳ Finds verb identifiers for part-of-speech parsing workflows.
      └─> PartOfSpeechFormsService.scanVerbHeader(…): { finalIndex: number; identifiers: Set<string>; } [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:317]
         ↳ Scans verb header for part-of-speech parsing context.
        └─> PartOfSpeechFormsService.isVerbFormCell(cell: string): boolean [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:146]
           ↳ Checks whether verb form cell in part-of-speech parsing logic.
```

**17. `CorpusScriptorumEcclesiasticorumLatinorumCommand.run`** — depth 4 · decorated-method

```text
🚀 CorpusScriptorumEcclesiasticorumLatinorumCommand.run(): Promise<void> [applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:127]
   ↳ Downloads all eligible CSEL Latin XML source files into the local cache.
  └─> CorpusScriptorumEcclesiasticorumLatinorumCommand.downloadSourceXmlFileIfMissing(xmlPath: string): Promise<void> [applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:47]
     ↳ Downloads one XML file unless it is already present in the local source cache.
    └─> CorpusScriptorumEcclesiasticorumLatinorumCommand.fetchAndWriteXmlFile(fileUrl: string, targetPath: string): Promise<void> [applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:76]
       ↳ Loads source data required by CSEL source ingestion.
      └─> CorpusScriptorumEcclesiasticorumLatinorumCommand.anonymous(resolve: (value: unknown) => void): void [applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:88]
```

**18. `PerseusCommand.run`** — depth 4 · decorated-method

```text
🚀 PerseusCommand.run(): Promise<void> [applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:133]
   ↳ Discovers eligible Perseus XML files and stores missing files in the local cache.
  └─> PerseusCommand.downloadSourceXmlFileIfMissing(xmlPath: string): Promise<void> [applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:58]
     ↳ Download source xml file if missing for Perseus source ingestion.
    └─> PerseusCommand.fetchAndWriteXmlFile(fileUrl: string, targetPath: string): Promise<void> [applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:81]
       ↳ Fetch and write xml file for Perseus source ingestion.
      └─> PerseusCommand.anonymous(resolve: (value: unknown) => void): void [applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:92]
```

**19. `PartOfSpeechService.ingestAdjectiveInflection`** — depth ≥ 4 · orphan-root

```text
🚀 PartOfSpeechService.ingestAdjectiveInflection($: cheerio.CheerioAPI, elt: AnyNode): Inflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:187]
   ↳ Ingests adjective inflection in the part-of-speech parsing pipeline.
  └─> PartOfSpeechService.buildAdjectiveInflection(declension: string): AdjectiveInflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:142]
     ↳ Builds adjective inflection for part-of-speech parsing.
    └─> PartOfSpeechService.findTypedValue(…): ValueType | undefined [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:129]
       ↳ Returns the first matching typed value from the provided candidate list.
      └─> PartOfSpeechService.find(…)(value: ValueType): value is ValueType [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:133]
```

**20. `PartOfSpeechService.ingestNounInflection`** — depth ≥ 4 · orphan-root

```text
🚀 PartOfSpeechService.ingestNounInflection($: cheerio.CheerioAPI, elt: AnyNode): Inflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:249]
   ↳ Ingests noun inflection in the part-of-speech parsing pipeline.
  └─> PartOfSpeechService.buildNounInflection(declension: string, gender: string): NounInflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:161]
     ↳ Builds noun inflection for part-of-speech parsing.
    └─> PartOfSpeechService.findTypedValue(…): ValueType | undefined [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:129]
       ↳ Returns the first matching typed value from the provided candidate list.
      └─> PartOfSpeechService.find(…)(value: ValueType): value is ValueType [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:133]
```

**21. `LiteratureService.buildLineEntityFromParagraph`** — depth 4 · orphan-root

```text
🚀 LiteratureService.buildLineEntityFromParagraph(paragraph: Paragraph, index: number, text: Text): QueryDeepPartialEntity<Line> [applications/lexico-ingestion/src/modules/literature/literature.service.ts:91]
   ↳ Builds line entity from paragraph for literature ingestion.
  └─> LiteratureService.parseLabelFromStrongNode(strongNode: Strong, lineNodes: PhrasingContent[]): ParsedLabelResult [applications/lexico-ingestion/src/modules/literature/literature.service.ts:355]
     ↳ Parses label from strong node during literature ingestion.
    └─> LiteratureService.parseStandardLabel(labelMatch: RegExpExecArray, lineNodes: PhrasingContent[]): ParsedLabelResult [applications/lexico-ingestion/src/modules/literature/literature.service.ts:391]
       ↳ Parses standard label during literature ingestion.
      └─> NumeralsService.toDecimal(roman: string): number [applications/lexico-ingestion/src/modules/numerals/numerals.service.ts:25]
         ↳ Parses a Roman numeral string into its decimal integer value.
```

**22. `DictionaryCommand.parseEndLemma`** — depth 3 · decorated-method

```text
🚀 DictionaryCommand.parseEndLemma(endLemma?: string, startLemma?: null | string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:399]
   ↳ Resolves the optional end-lemma boundary, validating it against available cache files.
  └─> DictionaryCommand.getLemmaChoices(): { title: string; value: string; }[] [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:75]
     ↳ Resolves derived values needed by dictionary ingestion.
    └─> DictionaryCommand.map(…)(file: string): { title: string; value: string; } [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:82]
```

**23. `DictionaryCommand.parseStartLemma`** — depth 3 · decorated-method

```text
🚀 DictionaryCommand.parseStartLemma(startLemma?: string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:437]
   ↳ Resolves the optional start-lemma boundary, validating it against available cache files.
  └─> DictionaryCommand.getLemmaChoices(): { title: string; value: string; }[] [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:75]
     ↳ Resolves derived values needed by dictionary ingestion.
    └─> DictionaryCommand.map(…)(file: string): { title: string; value: string; } [applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:82]
```

**24. `LibraryCommand.parseProvider`** — depth 3 · decorated-method

```text
🚀 LibraryCommand.parseProvider(provider?: string): Promise<string | undefined> [applications/lexico-ingestion/src/modules/library/library.command.ts:401]
   ↳ Resolves the optional `--provider` filter from CLI input or interactive selection.
  └─> LibraryCommand.getProviderChoices(): { title: string; value: string; }[] [applications/lexico-ingestion/src/modules/library/library.command.ts:93]
     ↳ Resolves derived values needed by library provider orchestration.
    └─> LibraryCommand.map(…)(p: LibrarySourceProvider): string [applications/lexico-ingestion/src/modules/library/library.command.ts:94]
```

**25. `PartOfSpeechService.ingestPrepositionInflection`** — depth ≥ 3 · orphan-root

```text
🚀 PartOfSpeechService.ingestPrepositionInflection($: cheerio.CheerioAPI, elt: AnyNode): Inflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:293]
   ↳ Ingests preposition inflection in the part-of-speech parsing pipeline.
  └─> PartOfSpeechService.findTypedValue(…): ValueType | undefined [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:129]
     ↳ Returns the first matching typed value from the provided candidate list.
    └─> PartOfSpeechService.find(…)(value: ValueType): value is ValueType [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:133]
```

**26. `PartOfSpeechService.ingestPronounInflection`** — depth ≥ 3 · orphan-root

```text
🚀 PartOfSpeechService.ingestPronounInflection($: cheerio.CheerioAPI, elt: AnyNode): Inflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:318]
   ↳ Ingests pronoun inflection in the part-of-speech parsing pipeline.
  └─> PartOfSpeechService.findTypedValue(…): ValueType | undefined [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:129]
     ↳ Returns the first matching typed value from the provided candidate list.
    └─> PartOfSpeechService.find(…)(value: ValueType): value is ValueType [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:133]
```

**27. `PartOfSpeechService.ingestVerbInflection`** — depth ≥ 3 · orphan-root

```text
🚀 PartOfSpeechService.ingestVerbInflection($: cheerio.CheerioAPI, elt: AnyNode): Inflection [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:350]
   ↳ Ingests verb inflection in the part-of-speech parsing pipeline.
  └─> PartOfSpeechService.findTypedValue(…): ValueType | undefined [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:129]
     ↳ Returns the first matching typed value from the provided candidate list.
    └─> PartOfSpeechService.find(…)(value: ValueType): value is ValueType [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:133]
```

**28. `ClearCommand.run`** — depth 2 · decorated-method

```text
🚀 ClearCommand.run(_passedParameters: string[], options: ClearCommandOptions): Promise<void> [applications/lexico-ingestion/src/modules/clear/clear.command.ts:138]
   ↳ Runs the clear pipeline for the options provided. If no options are specified, it prompts the user.
  └─> ClearCommand.parsePromptResponse(response: unknown): ClearPromptResponse [applications/lexico-ingestion/src/modules/clear/clear.command.ts:88]
     ↳ Parses prompt output into strongly typed clear options.
```

**29. `WordsService.escapeCapitals`** — depth 2 · orphan-root

```text
🚀 WordsService.escapeCapitals(word: string): string [applications/lexico-ingestion/src/modules/words/words.service.ts:67]
   ↳ Escape capitals for word indexing.
  └─> WordsService.replaceAll(…)(character: string): string [applications/lexico-ingestion/src/modules/words/words.service.ts:70]
```

**30. `normalizeStringArray`** — depth 2 · orphan-root

```text
🚀 normalizeStringArray(…): string[] [applications/lexico-ingestion/src/modules/forms/forms.constants.ts:21]
  └─> isNormalizableStringArray(…): boolean [applications/lexico-ingestion/src/modules/forms/forms.constants.ts:17]
```

**31. `FormsService.setTransientWords`** — depth 2 · orphan-root

```text
🚀 FormsService.setTransientWords(form: Form, words: string[]): void [applications/lexico-ingestion/src/modules/forms/forms.service.ts:181]
   ↳ Sets transient word strings for a Form instance.
  └─> FormsTransientWordsService.setTransientWords(form: Form, words: string[]): void [applications/lexico-ingestion/src/modules/forms/forms-transient-words.service.ts:34]
     ↳ Associates a list of transient words with a given Form entity.
```

**32. `compactStringValues`** — depth 2 · orphan-root

```text
🚀 compactStringValues(…): string[] [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.constants.ts:17]
  └─> isCompactStringArray(…): boolean [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.constants.ts:13]
```

**33. `PartOfSpeechService.ingestAdverbForms`** — depth 2 · orphan-root

```text
🚀 PartOfSpeechService.ingestAdverbForms(principalParts: PrincipalPart[]): unknown [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:221]
   ↳ Ingests adverb forms in the part-of-speech parsing pipeline.
  └─> PartOfSpeechService.getTextOrEmpty(part: PrincipalPart | undefined): string[] [applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:182]
     ↳ Gets text or empty used by part-of-speech parsing.
```

**34. `LatinLibraryProvider.cleanupAuthorMetadata`** — depth 2 · orphan-root

```text
🚀 LatinLibraryProvider.cleanupAuthorMetadata(author: Author): void [applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:91]
   ↳ Handles an internal workflow step for Latin Library provider ingestion.
  └─> LatinLibraryProvider.forEach(…)(child: Text): void [applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:97]
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `LexemesService.enrichLexeme` | 8 | `applications/lexico-ingestion:modules/etymology`, `applications/lexico-ingestion:modules/forms`, `applications/lexico-ingestion:modules/part-of-speech`, `applications/lexico-ingestion:modules/principal-parts`, `applications/lexico-ingestion:modules/pronunciation`, `applications/lexico-ingestion:modules/translations` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:71` |
| `LexemesService.saveLexemeRelations` | 6 | `applications/lexico-ingestion:modules/forms`, `applications/lexico-ingestion:modules/principal-parts`, `applications/lexico-ingestion:modules/pronunciation`, `applications/lexico-ingestion:modules/words` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:216` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `PronunciationEcclesiasticalService.processEcclesiasticalCharacter` | 8 | `PronunciationEcclesiasticalService.classifyEcclesiasticalC`, `PronunciationEcclesiasticalService.classifyEcclesiasticalG`, `PronunciationEcclesiasticalService.classifyEcclesiasticalH`, `PronunciationEcclesiasticalService.classifyEcclesiasticalI`, `PronunciationEcclesiasticalService.classifyEcclesiasticalS`, `PronunciationEcclesiasticalService.classifyEcclesiasticalT`, `PronunciationEcclesiasticalService.classifyEcclesiasticalX`, `PronunciationEcclesiasticalService.lookupMultiCharacterPhoneme` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:305` |
| `LatinLibraryProvider.ingest` | 8 | `LatinLibraryProvider.readSourceCacheFile`, `LatinLibraryProvider.buildRootAuthors`, `LatinLibraryProvider.expandCategoryAuthors`, `LatinLibraryProvider.sort(…)`, `LatinLibraryProvider.filter(…)`, `LatinLibraryProvider.processAuthorPage`, `LatinLibraryProvider.writeAuthorTexts`, `LatinLibraryProvider.forEach(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:407` |
| `LexemesService.enrichLexeme` | 7 | `PrincipalPartsService.parsePrincipalParts`, `PartOfSpeechService.ingestInflection`, `TranslationsService.parseTranslations`, `EtymologyService.parse`, `PronunciationService.parse`, `PartOfSpeechService.parseForms`, `FormsService.buildFormsForPartOfSpeech` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:71` |

<details>
<summary>259 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ManualService.ingestManual` | 7 | `ManualService.deleteManual`, `ManualService.createManual`, `buildHicTemplate`, `buildIlleTemplate`, `buildOmnisTemplate`, `ManualService.ingestPraenomenAbbreviations`, `ManualService.ingestRomanNumerals` | `applications/lexico-ingestion/src/modules/manual/manual.service.ts:190` |
| `FormsService.ingestLexemeForms` | 6 | `FormsService.findExistingFormsByLexemeId`, `FormsService.preserveMatchingExistingFormIdentity`, `FormsService.map(…)`, `FormsService.saveFormsForLexeme`, `FormsService.buildFormsByNormalizedWordMap`, `WordsService.upsertWordsAndJunctions` | `applications/lexico-ingestion/src/modules/forms/forms.service.ts:151` |
| `PronunciationClassicalService.processClassicalCharacter` | 6 | `PronunciationClassicalService.classifyClassicalH`, `PronunciationClassicalService.classifyClassicalI`, `PronunciationClassicalService.classifyClassicalJ`, `PronunciationClassicalService.classifyClassicalN`, `PronunciationClassicalService.lookupClassicalDevocalizeCharacter`, `PronunciationClassicalService.lookupMultiCharacterPhoneme` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-classical.service.ts:140` |
| `LexemesService.saveLexemeRelations` | 6 | `LexemesService.saveInflection`, `PrincipalPartsService.ingestLexemePrincipalParts`, `PronunciationService.ingestLexemePronunciations`, `LexemesService.saveTranslations`, `FormsService.ingestLexemeForms`, `WordsService.ingestLexemeWords` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:216` |
| `LatinLibraryProvider.processTextLink` | 6 | `LatinLibraryBuilder.isSkippedHref`, `LatinLibraryBuilder.isTextFileHref`, `LatinLibraryBuilder.isExternalOrSelfLink`, `LatinLibraryBuilder.findRawBookHeading`, `LatinLibraryBuilder.buildTextEntityForLink`, `LatinLibraryProvider.addTextToBook` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:211` |
| `LatinLibraryProvider.writeWorkText` | 6 | `LatinLibraryProvider.getMetadataString`, `LatinLibraryProvider.readSourceCacheFile`, `LatinLibraryBuilder.parseWorkParagraphs`, `hasValidTextContent`, `LatinLibraryBuilder.buildWorkMarkdownContent`, `LatinLibraryProvider.saveWorkTextMarkdown` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:368` |
| `LiteratureService.ingestLines` | 6 | `LiteratureService.getWordsCache`, `LiteratureService.filter(…)`, `LiteratureService.map(…)`, `LiteratureService.upsertAndFetchLines`, `LiteratureService.extractTokensFromLine`, `LiteratureService.upsertTokens` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:241` |
| `LiteratureCommand.run` | 6 | `LiteratureService.scanLibrary`, `LiteratureCommand.parseProvider`, `LiteratureCommand.parseAuthor`, `LiteratureCommand.parseText`, `LiteratureCommand.selectTextsToIngest`, `LiteratureService.ingestAllAuthors` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:257` |
| `WordsService.ingestLexemeWords` | 5 | `WordsService.getLexemeWords`, `WordsService.filter(…)`, `WordsService.map(…)`, `WordsService.map(…)`, `WordsService.map(…)` | `applications/lexico-ingestion/src/modules/words/words.service.ts:127` |
| `WordsService.upsertWordsAndJunctions` | 5 | `WordsService.map(…)`, `WordsService.map(…)`, `WordsService.map(…)`, `WordsService.insertWordFormChunks`, `WordsService.buildWordFormValues` | `applications/lexico-ingestion/src/modules/words/words.service.ts:175` |
| `FormsBuilderOtherService.buildVerbFormsFromRaw` | 5 | `FormsBuilderGuardsService.isRecord`, `FormsBuilderGuardsService.isFormMood`, `FormsBuilderOtherService.buildFiniteMoodForms`, `FormsBuilderOtherService.buildVerbNonFiniteForms`, `FormsBuilderOtherService.buildVerbNounForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:393` |
| `DictionaryCommand.processTranslationReferences` | 5 | `TranslationsService.extractTranslationReferences`, `LexemesService.existsByLemma`, `DictionaryCommand.ingestLexeme`, `TranslationsService.findTranslationsWithReferences`, `DictionaryCommand.ingestTranslationReference` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:282` |
| `LatinLibraryCommand.run` | 5 | `LatinLibraryCommand.fetchAndCachePage`, `LatinLibraryCommand.getAuthorUrls`, `LatinLibraryCommand.getFinalAuthorUrls`, `LatinLibraryCommand.enqueueAuthorUrls`, `LatinLibraryCommand.from(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:381` |
| `LibraryCommand.getTextChoices` | 5 | `LibraryCommand.scanLibrary`, `LibraryCommand.filter(…)`, `LibraryCommand.filter(…)`, `LibraryCommand.map(…)`, `LibraryCommand.map(…)` | `applications/lexico-ingestion/src/modules/library/library.command.ts:101` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.processSourceXmlFile` | 5 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.parseSourceXmlFile`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.getOrCreateAuthor`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.writeSourceTextForAuthor`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.anonymous`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.logSourceProgress` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:238` |
| `PerseusLibraryProvider.processSourceXmlFile` | 5 | `PerseusLibraryProvider.loadSourceXmlFile`, `PerseusLibraryProvider.isFilteredOut`, `PerseusLibraryProvider.extractPerseusMetadata`, `PerseusLibraryProvider.getOrCreatePerseusAuthor`, `PerseusLibraryProvider.writeSourceTextForAuthor` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:219` |
| `LiteratureCommand.getTextChoices` | 5 | `LiteratureService.scanLibrary`, `LiteratureCommand.filter(…)`, `LiteratureCommand.filter(…)`, `LiteratureCommand.map(…)`, `LiteratureCommand.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:104` |
| `LexicoIngestionCommand.executeStages` | 5 | `WiktionaryCommand.run`, `DictionaryCommand.ingestAll`, `LexicoIngestionCommand.runLibrarySourcesStage`, `LibraryCommand.run`, `LiteratureCommand.run` | `applications/lexico-ingestion/src/modules/lexico-ingestion/lexico-ingestion.command.ts:54` |
| `CorpusScriptorumEcclesiasticorumLatinorumCommand.run` | 4 | `CorpusScriptorumEcclesiasticorumLatinorumCommand.fetchTree`, `CorpusScriptorumEcclesiasticorumLatinorumCommand.map(…)`, `CorpusScriptorumEcclesiasticorumLatinorumCommand.filter(…)`, `CorpusScriptorumEcclesiasticorumLatinorumCommand.downloadSourceXmlFileIfMissing` | `applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:127` |
| `FormsBuilderOtherService.buildAdjectivalNumberForms` | 4 | `FormsBuilderGuardsService.isFormCase`, `FormsBuilderGuardsService.isFormNumber`, `FormsBuilderGuardsService.isStringArray`, `FormsBuilderOtherService.createAdjectivalForm` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:110` |
| `FormsBuilderOtherService.buildFinitePersonForms` | 4 | `FormsBuilderGuardsService.isFormNumber`, `FormsBuilderGuardsService.isFormTense`, `FormsBuilderGuardsService.isFormVoice`, `FormsBuilderVerbService.buildFinitePersonForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:214` |
| `FormsBuilderOtherService.buildNominalNumberForms` | 4 | `FormsBuilderGuardsService.isFormCase`, `FormsBuilderGuardsService.isFormNumber`, `FormsBuilderGuardsService.isStringArray`, `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:329` |
| `FormsBuilderOtherService.buildFormsForPartOfSpeech` | 4 | `FormsBuilderOtherService.buildAdjectivalFormsFromRaw`, `FormsBuilderOtherService.buildAdverbFormsFromRaw`, `FormsBuilderOtherService.buildNominalFormsFromRaw`, `FormsBuilderOtherService.buildVerbFormsFromRaw` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:482` |
| `PartOfSpeechFormsService.findGenericIdentifiers` | 4 | `PartOfSpeechFormsService.collectTableIdentifiers`, `PartOfSpeechFormsService.find(…)`, `PartOfSpeechFormsService.find(…)`, `PartOfSpeechFormsService.find(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:58` |
| `PartOfSpeechFormsService.findVerbIdentifiers` | 4 | `PartOfSpeechFormsService.scanVerbHeader(…)`, `PartOfSpeechFormsService.scanVerbHeader`, `PartOfSpeechFormsService.scanVerbHeader(…)`, `PartOfSpeechFormsService.map(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:83` |
| `PartOfSpeechFormsService.parseGenericForms` | 4 | `PartOfSpeechFormsService.parseFormTable`, `PartOfSpeechFormsService.map(…)`, `PartOfSpeechFormsService.findGenericIdentifiers`, `PartOfSpeechFormsService.sortIdentifiers` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:358` |
| `PronunciationService.parse` | 4 | `PronunciationService.buildDefaultPronunciation`, `PronunciationService.getClassicalPhonemes`, `PronunciationService.getEcclesiasticalPronunciations`, `PronunciationClassifierService.applyWiktionaryPronunciations` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation.service.ts:181` |
| `TranslationsService.parseTranslations` | 4 | `TranslationsService.capitalizeFirstLetter`, `TranslationsService.map(…)`, `Translation.constructor`, `TranslationsService.filter(…)` | `applications/lexico-ingestion/src/modules/translations/translations.service.ts:96` |
| `LexemesService.parseLexemeFromElement` | 4 | `PartOfSpeechService.getPartOfSpeech`, `PartOfSpeechService.getFirstPrincipalPartName`, `LexemesService.buildLexeme`, `LexemesService.enrichLexeme` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:144` |
| `ManualService.ingestRomanNumerals` | 4 | `NumeralsService.toRoman`, `buildRomanNumeralTemplate`, `Translation.constructor`, `ManualService.createManual` | `applications/lexico-ingestion/src/modules/manual/manual.service.ts:117` |
| `DictionaryCommand.processTranslationMatch` | 4 | `LexemesService.findLexemesByLemmaWithTranslations`, `DictionaryCommand.normalize`, `DictionaryCommand.find(…)`, `DictionaryCommand.map(…)` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:247` |
| `DictionaryCommand.ingestLexeme` | 4 | `DictionaryCommand.getPageForLexeme`, `LexemesService.parseLexemes`, `LexemesService.saveParsedLexeme`, `DictionaryCommand.processTranslationReferences` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:353` |
| `DictionaryCommand.run` | 4 | `DictionaryCommand.parseStartLemma`, `DictionaryCommand.parseEndLemma`, `DictionaryCommand.ingestAll`, `ManualService.ingestManual` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:472` |
| `LatinLibraryCommand.processQueueUrl` | 4 | `LatinLibraryCommand.fetchAndCachePage`, `LatinLibraryCommand.isParsableHtmlExtension`, `LatinLibraryCommand.getBaseUrl`, `LatinLibraryCommand.parseHtmlForLinks` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:345` |
| `LibraryCommand.getAuthorChoices` | 4 | `LibraryCommand.scanLibrary`, `LibraryCommand.filter(…)`, `LibraryCommand.map(…)`, `LibraryCommand.map(…)` | `applications/lexico-ingestion/src/modules/library/library.command.ts:79` |
| `LibraryCommand.processProvider` | 4 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.ingest`, `EpigraphikDatenbankClaussSlabyLibraryProvider.ingest`, `LatinLibraryProvider.ingest`, `PerseusLibraryProvider.ingest` | `applications/lexico-ingestion/src/modules/library/library.command.ts:157` |
| `EpigraphikDatenbankClaussSlabyLibraryProvider.ingest` | 4 | `EpigraphikDatenbankClaussSlabyLibraryProvider.createSourceAuthor`, `EpigraphikDatenbankClaussSlabyLibraryProvider.readSourceChunkFiles`, `EpigraphikDatenbankClaussSlabyLibraryProvider.processSourceChunkPhase`, `EpigraphikDatenbankClaussSlabyLibraryProvider.saveEdcsProvincePhase` | `applications/lexico-ingestion/src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts:305` |
| `LatinLibraryProvider.processAuthorPage` | 4 | `LatinLibraryProvider.getMetadataString`, `LatinLibraryProvider.readSourceCacheFile`, `LatinLibraryBuilder.extractAuthorPageMetadata`, `LatinLibraryProvider.collectAuthorTexts` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:180` |
| `LiteratureService.ingestText` | 4 | `LiteratureService.parseFrontmatter`, `LiteratureService.getMetadataRecord`, `LiteratureService.saveTextToDatabase`, `LiteratureService.ingestLines` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:270` |
| `LiteratureCommand.getAuthorChoices` | 4 | `LiteratureService.scanLibrary`, `LiteratureCommand.filter(…)`, `LiteratureCommand.map(…)`, `LiteratureCommand.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:75` |
| `LiteratureCommand.selectTextsToIngest` | 4 | `LiteratureCommand.filter(…)`, `LiteratureCommand.filter(…)`, `LiteratureCommand.filter(…)`, `LiteratureCommand.deduplicateByProvider` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:128` |
| `LexicoIngestionCommand.runLibrarySourcesStage` | 4 | `PerseusCommand.run`, `LatinLibraryCommand.run`, `CorpusScriptorumEcclesiasticorumLatinorumCommand.run`, `EpigraphikDatenbankClaussSlabyCommand.run` | `applications/lexico-ingestion/src/modules/lexico-ingestion/lexico-ingestion.command.ts:149` |
| `ClearCommand.run` | 3 | `ClearCommand.parsePromptResponse`, `ClearCommand.clearLiterature`, `ClearCommand.clearDictionary` | `applications/lexico-ingestion/src/modules/clear/clear.command.ts:138` |
| `FormsBuilderVerbService.collectParticipleFormsForTense` | 3 | `FormsBuilderGuardsService.isFormNonFiniteTense`, `FormsBuilderGuardsService.isRecord`, `FormsBuilderGuardsService.isFormGender` | `applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:77` |
| `FormsBuilderVerbService.buildFinitePersonForms` | 3 | `FormsBuilderGuardsService.isFormPerson`, `FormsBuilderGuardsService.isStringArray`, `FormsBuilderVerbService.buildFiniteVerbForm` | `applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:121` |
| `FormsBuilderVerbService.buildParticipleFormsFromRaw` | 3 | `FormsBuilderGuardsService.isFormNonFiniteTense`, `FormsBuilderVerbService.collectParticipleFormsForTense`, `FormsBuilderVerbService.applyTenseToParticipleForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:149` |
| `FormsBuilderOtherService.buildAdjectivalCaseForms` | 3 | `FormsBuilderGuardsService.isFormCase`, `FormsBuilderGuardsService.isRecord`, `FormsBuilderOtherService.buildAdjectivalNumberForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:60` |
| `FormsBuilderOtherService.buildAdjectivalFormsFromRaw` | 3 | `FormsBuilderGuardsService.isRecord`, `FormsBuilderGuardsService.isFormGender`, `FormsBuilderOtherService.buildAdjectivalCaseForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:89` |
| `FormsBuilderOtherService.buildAdverbFormsFromRaw` | 3 | `FormsBuilderGuardsService.isRecord`, `FormsBuilderGuardsService.isStringArray`, `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:144` |
| `FormsBuilderOtherService.buildFiniteMoodForms` | 3 | `FormsBuilderGuardsService.isFormVoice`, `FormsBuilderGuardsService.isRecord`, `FormsBuilderOtherService.buildFiniteTenseForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:160` |
| `FormsBuilderOtherService.buildFiniteNumberForms` | 3 | `FormsBuilderGuardsService.isFormNumber`, `FormsBuilderGuardsService.isRecord`, `FormsBuilderOtherService.buildFinitePersonForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:186` |
| `FormsBuilderOtherService.buildFiniteTenseForms` | 3 | `FormsBuilderGuardsService.isFormTense`, `FormsBuilderGuardsService.isRecord`, `FormsBuilderOtherService.buildFiniteNumberForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:237` |
| `FormsBuilderOtherService.buildGerundForms` | 3 | `FormsBuilderGuardsService.isGerundCase`, `FormsBuilderGuardsService.isStringArray`, `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:263` |
| `FormsBuilderOtherService.buildInfinitiveForms` | 3 | `FormsBuilderGuardsService.isFormNonFiniteTense`, `FormsBuilderGuardsService.isStringArray`, `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:284` |
| `FormsBuilderOtherService.buildNominalFormsFromRaw` | 3 | `FormsBuilderGuardsService.isRecord`, `FormsBuilderGuardsService.isFormCase`, `FormsBuilderOtherService.buildNominalNumberForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:306` |
| `FormsBuilderOtherService.buildSupineForms` | 3 | `FormsBuilderGuardsService.isSupineCase`, `FormsBuilderGuardsService.isStringArray`, `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:372` |
| `FormsBuilderOtherService.buildVerbNonFiniteForms` | 3 | `FormsBuilderGuardsService.isRecord`, `FormsBuilderOtherService.buildInfinitiveForms`, `FormsBuilderOtherService.buildParticipleFormsFromRaw` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:418` |
| `FormsBuilderOtherService.buildVerbNounForms` | 3 | `FormsBuilderGuardsService.isRecord`, `FormsBuilderOtherService.buildGerundForms`, `FormsBuilderOtherService.buildSupineForms` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:438` |
| `PartOfSpeechFormsService.collectTableIdentifiers` | 3 | `PartOfSpeechFormsService.scanTableAxis(…)`, `PartOfSpeechFormsService.scanTableAxis`, `PartOfSpeechFormsService.scanTableAxis(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:35` |
| `PartOfSpeechFormsService.parseFormTable` | 3 | `PartOfSpeechFormsService.filter(…)`, `PartOfSpeechFormsService.map(…)`, `PartOfSpeechFormsService.map(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:169` |
| `PartOfSpeechFormsService.parseVerbForms` | 3 | `PartOfSpeechFormsService.parseFormTable`, `PartOfSpeechFormsService.processVerbFormRow`, `PartOfSpeechFormsService.sortIdentifiers` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:404` |
| `LexemesService.saveParsedLexeme` | 3 | `LexemesService.upsertLexeme`, `LexemesService.fetchSavedLexeme`, `LexemesService.saveLexemeRelations` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:333` |
| `buildHicTemplate` | 3 | `buildGenderedPrincipalParts`, `Translation.constructor`, `buildAdjectivalForms` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:66` |
| `buildIlleTemplate` | 3 | `buildGenderedPrincipalParts`, `Translation.constructor`, `buildAdjectivalForms` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:116` |
| `buildOmnisTemplate` | 3 | `buildGenderedPrincipalParts`, `Translation.constructor`, `buildAdjectivalForms` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:169` |
| `ManualService.buildPraenomenLexeme` | 3 | `buildPraenomenAbbreviationTemplate`, `ManualService.buildPraenomenTranslations`, `ManualService.resolvePraenomenGender` | `applications/lexico-ingestion/src/modules/manual/manual.service.ts:52` |
| `DictionaryCommand.ingestAll` | 3 | `DictionaryCommand.filter(…)`, `DictionaryCommand.getLemmaFileRange`, `DictionaryCommand.processFile` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:319` |
| `DictionaryCommand.parseEndLemma` | 3 | `DictionaryCommand.filter(…)`, `DictionaryCommand.getLemmaChoices`, `DictionaryCommand.some(…)` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:399` |
| `LatinLibraryCommand.shouldSkipLink` | 3 | `LatinLibraryCommand.isIgnoredLinkFileName`, `LatinLibraryCommand.isIgnoredProtocol`, `LatinLibraryCommand.isInvalidExtension` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:370` |
| `LibraryCommand.parseIngestOptions` | 3 | `LibraryCommand.parseProvider`, `LibraryCommand.parseAuthor`, `LibraryCommand.parseText` | `applications/lexico-ingestion/src/modules/library/library.command.ts:134` |
| `LibraryCommand.run` | 3 | `LibraryCommand.parseIngestOptions`, `LibraryCommand.buildIngestParameters`, `LibraryCommand.processProvider` | `applications/lexico-ingestion/src/modules/library/library.command.ts:466` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.writeSourceTextForAuthor` | 3 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.createCselTextEntity`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.extractParagraphs`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.buildCselTextContent` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:341` |
| `LatinLibraryBuilder.extractLinesFromParagraph` | 3 | `cleanBoilerplate`, `LatinLibraryBuilder.parseParagraphHtml`, `LatinLibraryBuilder.extractParagraphLines` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:63` |
| `LatinLibraryBuilder.extractParagraphLines` | 3 | `cleanBoilerplate`, `isEnglishBoilerplate`, `formatLineNumber` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:87` |
| `LatinLibraryProvider.expandCategoryAuthors` | 3 | `LatinLibraryProvider.getMetadataString`, `LatinLibraryProvider.readSourceCacheFile`, `LatinLibraryProvider.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:128` |
| `PerseusLibraryTextExtractionProvider.processLeafTextPart` | 3 | `PerseusLibraryTextExtractionProvider.collectParagraphsFromElements`, `formatLineNumber`, `hasValidTextContent` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:110` |
| `PerseusLibraryTextExtractionProvider.processTextPartChildren` | 3 | `PerseusLibraryTextExtractionProvider.extractChildTextParts`, `PerseusLibraryTextExtractionProvider.collectParagraphsFromElements`, `hasValidTextContent` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:150` |
| `PerseusLibraryProvider.writeSourceMarkdownFiles` | 3 | `PerseusLibraryTextExtractionProvider.extractTextNodes`, `PerseusLibraryProvider.writeTextFiles`, `PerseusLibraryProvider.anonymous` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:263` |
| `LiteratureCommand.getProviderChoices` | 3 | `LiteratureService.scanLibrary`, `LiteratureCommand.map(…)`, `LiteratureCommand.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:91` |
| `WiktionaryCommand.ingestCategory` | 3 | `WiktionaryCommand.fetchCategoryPage`, `WiktionaryCommand.processWiktionaryCategoryLink`, `WiktionaryCommand.handleCategoryError` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:139` |
| `normalizeStringArray` | 2 | `isNormalizableStringArray`, `filter(…)` | `applications/lexico-ingestion/src/modules/forms/forms.constants.ts:21` |
| `FormsService.findIndex(…)` | 2 | `FormsService.filter(…)`, `FormsService.every(…)` | `applications/lexico-ingestion/src/modules/forms/forms.service.ts:86` |
| `EtymologyService.parse` | 2 | `EtymologyService.filter(…)`, `Translation.constructor` | `applications/lexico-ingestion/src/modules/etymology/etymology.service.ts:31` |
| `compactStringValues` | 2 | `isCompactStringArray`, `filter(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.constants.ts:17` |
| `PartOfSpeechFormsService.processVerbFormRow` | 2 | `PartOfSpeechFormsService.findVerbIdentifiers`, `PartOfSpeechFormsService.parseVerbWordCell` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:225` |
| `PartOfSpeechFormsService.resolveVerbSumEntry` | 2 | `PartOfSpeechFormsService.lookupSumEsseFuiEntry`, `PartOfSpeechFormsService.map(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:251` |
| `PartOfSpeechService.ingestAdjectiveInflection` | 2 | `PartOfSpeechService.filter(…)`, `PartOfSpeechService.buildAdjectiveInflection` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:187` |
| `PartOfSpeechService.ingestNounInflection` | 2 | `PartOfSpeechService.filter(…)`, `PartOfSpeechService.buildNounInflection` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:249` |
| `PrincipalPartsService.parsePrincipalParts` | 2 | `PrincipalPartsService.map(…)`, `PrincipalPartsService.classifyPrincipalPart` | `applications/lexico-ingestion/src/modules/principal-parts/principal-parts.service.ts:84` |
| `PronunciationEcclesiasticalService.isEcclesiasticalVocalI` | 2 | `PronunciationEcclesiasticalService.isInitialVocalI`, `PronunciationEcclesiasticalService.isInterVocalicI` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:41` |
| `PronunciationEcclesiasticalService.classifyEcclesiasticalI` | 2 | `PronunciationEcclesiasticalService.isEcclesiasticalVocalI`, `PronunciationPhonemesService.getStringPhoneme` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:188` |
| `PronunciationEcclesiasticalService.classifyEcclesiasticalS` | 2 | `PronunciationEcclesiasticalService.isBetweenVowels`, `PronunciationEcclesiasticalService.isScConsonant` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:207` |
| `PronunciationEcclesiasticalService.classifyEcclesiasticalX` | 2 | `PronunciationEcclesiasticalService.isBetweenVowels`, `PronunciationEcclesiasticalService.isScConsonant` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:242` |
| `PronunciationClassifierService.applyWiktionaryPronunciations` | 2 | `PronunciationClassifierService.filter(…)`, `PronunciationClassifierService.updateVariantPronunciation` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-classifier.service.ts:87` |
| `PronunciationService.getEcclesiasticalPronunciations` | 2 | `PronunciationService.buildPronunciations`, `PronunciationService.getEcclesiasticalPhonemes` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation.service.ts:150` |
| `LexemesService.parseLexemes` | 2 | `LexemesService.normalize`, `LexemesService.parseLexemeFromElement` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:305` |
| `ManualService.ingestPraenomenAbbreviations` | 2 | `ManualService.createManual`, `ManualService.buildPraenomenLexeme` | `applications/lexico-ingestion/src/modules/manual/manual.service.ts:102` |
| `ManualService.createManual` | 2 | `ManualService.deleteManual`, `WordsService.ingestLexemeWords` | `applications/lexico-ingestion/src/modules/manual/manual.service.ts:160` |
| `DictionaryCommand.getLemmaChoices` | 2 | `DictionaryCommand.map(…)`, `DictionaryCommand.filter(…)` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:75` |
| `DictionaryCommand.getLemmaFileRange` | 2 | `DictionaryCommand.findIndex(…)`, `DictionaryCommand.findIndex(…)` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:91` |
| `DictionaryCommand.ingestTranslationReference` | 2 | `DictionaryCommand.processTranslationMatch`, `TranslationsService.saveTranslations` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:166` |
| `DictionaryCommand.loadWiktionaryPageForWord` | 2 | `DictionaryCommand.getWiktionaryFilePathForWord`, `DictionaryCommand.readWiktionaryPageFromFile` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:194` |
| `DictionaryCommand.processFile` | 2 | `DictionaryCommand.readWiktionaryPageFromFile`, `DictionaryCommand.ingestLexeme` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:222` |
| `DictionaryCommand.parseStartLemma` | 2 | `DictionaryCommand.getLemmaChoices`, `DictionaryCommand.some(…)` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:437` |
| `LatinLibraryCommand.fetchAndCachePage` | 2 | `LatinLibraryCommand.getRelativePath`, `LatinLibraryCommand.downloadAndSaveLatinLibraryFile` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:86` |
| `LatinLibraryCommand.processCategoryHref` | 2 | `LatinLibraryCommand.fetchAndCachePage`, `LatinLibraryCommand.each(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:290` |
| `LatinLibraryCommand.processLink` | 2 | `LatinLibraryCommand.shouldSkipLink`, `LatinLibraryCommand.isSkipPath` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:324` |
| `LibraryCommand.getProviderChoices` | 2 | `LibraryCommand.map(…)`, `LibraryCommand.map(…)` | `applications/lexico-ingestion/src/modules/library/library.command.ts:93` |
| `LibraryCommand.scanLibrary` | 2 | `LibraryCommand.scanLibraryProvider`, `LibraryCommand.isMissingDirectoryError` | `applications/lexico-ingestion/src/modules/library/library.command.ts:227` |
| `LibraryCommand.parseProvider` | 2 | `LibraryCommand.getProviderChoices`, `LibraryCommand.some(…)` | `applications/lexico-ingestion/src/modules/library/library.command.ts:401` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.collectSourceXmlPaths` | 2 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.map(…)`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.filter(…)` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:70` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.resolveSourceXmlMetadata` | 2 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.getMetadata`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.checkTextFilter` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:301` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.ingest` | 2 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.collectSourceXmlPaths`, `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.processSourceXmlFile` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:385` |
| `EpigraphikDatenbankClaussSlabyLibraryProvider.saveEdcsProvince` | 2 | `EpigraphikDatenbankClaussSlabyLibraryProvider.getOrCreateBookText`, `EpigraphikDatenbankClaussSlabyLibraryProvider.saveEdcsChunkFile` | `applications/lexico-ingestion/src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts:217` |
| `LatinLibraryBuilder.buildCategoryAuthor` | 2 | `LatinLibraryBuilder.some(…)`, `LatinLibraryBuilder.makeAuthor` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:152` |
| `LatinLibraryProvider.collectAuthorTexts` | 2 | `LatinLibraryProvider.processTextLink`, `LatinLibraryProvider.addFallbackText` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:111` |
| `LatinLibraryProvider.processWork` | 2 | `LatinLibraryBuilder.getTextSlug`, `LatinLibraryProvider.writeWorkText` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:248` |
| `LatinLibraryProvider.writeAuthorTexts` | 2 | `LatinLibraryProvider.flatMap(…)`, `LatinLibraryProvider.processWork` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:336` |
| `PerseusLibraryTextExtractionProvider.each(…)` | 2 | `PerseusLibraryTextExtractionProvider.getTextPartDescriptor`, `PerseusLibraryTextExtractionProvider.extractTextNodes` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:66` |
| `PerseusLibraryTextExtractionProvider.extractTextNodes` | 2 | `PerseusLibraryTextExtractionProvider.processTextPartChildren`, `PerseusLibraryTextExtractionProvider.processLeafTextPart` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:206` |
| `PerseusLibraryProvider.collectSourceXmlPaths` | 2 | `PerseusLibraryProvider.map(…)`, `PerseusLibraryProvider.filter(…)` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:53` |
| `PerseusLibraryProvider.writeSourceTextForAuthor` | 2 | `PerseusLibraryProvider.addPerseusTextEntity`, `PerseusLibraryProvider.writeSourceMarkdownFiles` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:311` |
| `PerseusLibraryProvider.ingest` | 2 | `PerseusLibraryProvider.collectSourceXmlPaths`, `PerseusLibraryProvider.processPerseusFile` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:371` |
| `LiteratureLibraryScanService.scanLibrary` | 2 | `LiteratureLibraryScanService.walkLibraryDirectory`, `LiteratureLibraryScanService.isMissingDirectoryError` | `applications/lexico-ingestion/src/modules/literature/literature-library-scan.service.ts:84` |
| `LiteratureTextIngestionService.ingestTextWithLogging` | 2 | `LiteratureTextIngestionService.resolveParentText`, `LiteratureTextIngestionService.buildHierarchyPrefix` | `applications/lexico-ingestion/src/modules/literature/literature-text-ingestion.service.ts:57` |
| `LiteratureService.map(…)` | 2 | `LiteratureWordNormalizationService.escapeCapitals`, `LiteratureWordNormalizationService.normalize` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:158` |
| `LiteratureService.ingestAuthorGroup` | 2 | `LiteratureService.ensureParentTexts`, `LiteratureService.ingestTextChunks` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:211` |
| `LiteratureService.parseFrontmatter` | 2 | `LiteratureService.find(…)`, `LiteratureService.isRecord` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:338` |
| `LiteratureService.parseLabelFromStrongNode` | 2 | `LiteratureService.parseStandardLabel`, `LiteratureService.parseNonStandardLabel` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:355` |
| `LiteratureCommand.parseAuthor` | 2 | `LiteratureCommand.getAuthorChoices`, `LiteratureCommand.some(…)` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:153` |
| `LiteratureCommand.parseProvider` | 2 | `LiteratureCommand.getProviderChoices`, `LiteratureCommand.some(…)` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:188` |
| `LiteratureCommand.parseText` | 2 | `LiteratureCommand.getTextChoices`, `LiteratureCommand.some(…)` | `applications/lexico-ingestion/src/modules/literature/literature.command.ts:218` |
| `PerseusCommand.downloadSourceXmlFileIfMissing` | 2 | `PerseusCommand.fetchAndWriteXmlFile`, `PerseusCommand.appendSourceDownloadErrorLog` | `applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:58` |
| `PerseusCommand.fetchSourceXmlPaths` | 2 | `PerseusCommand.map(…)`, `PerseusCommand.filter(…)` | `applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:100` |
| `PerseusCommand.run` | 2 | `PerseusCommand.fetchSourceXmlPaths`, `PerseusCommand.downloadSourceXmlFileIfMissing` | `applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:133` |
| `WiktionaryCommand.ingestWord` | 2 | `WiktionaryCommand.parseLatinSection`, `WiktionaryCommand.saveWiktionaryEntry` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:176` |
| `WiktionaryCommand.processWiktionaryCategoryLink` | 2 | `WiktionaryCommand.ingestWord`, `WiktionaryCommand.anonymous` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:233` |
| `WiktionaryCommand.ingestWiktionary` | 2 | `WiktionaryCommand.filter(…)`, `WiktionaryCommand.ingestCategory` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:287` |
| `LexicoIngestionCommand.run` | 2 | `LexicoIngestionCommand.promptForMissingOptions`, `LexicoIngestionCommand.executeStages` | `applications/lexico-ingestion/src/modules/lexico-ingestion/lexico-ingestion.command.ts:219` |
| `CorpusScriptorumEcclesiasticorumLatinorumCommand.downloadSourceXmlFileIfMissing` | 1 | `CorpusScriptorumEcclesiasticorumLatinorumCommand.fetchAndWriteXmlFile` | `applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:47` |
| `CorpusScriptorumEcclesiasticorumLatinorumCommand.fetchAndWriteXmlFile` | 1 | `CorpusScriptorumEcclesiasticorumLatinorumCommand.anonymous` | `applications/lexico-ingestion/src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts:76` |
| `WordsService.escapeCapitals` | 1 | `WordsService.replaceAll(…)` | `applications/lexico-ingestion/src/modules/words/words.service.ts:67` |
| `WordsService.getLexemeWords` | 1 | `WordsService.forEach(…)` | `applications/lexico-ingestion/src/modules/words/words.service.ts:118` |
| `WordsService.map(…)` | 1 | `WordsService.normalize` | `applications/lexico-ingestion/src/modules/words/words.service.ts:136` |
| `FormsBuilderVerbService.buildFiniteVerbForm` | 1 | `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-verb.service.ts:55` |
| `FormsBuilderOtherService.buildParticipleFormsFromRaw` | 1 | `FormsBuilderVerbService.buildParticipleFormsFromRaw` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:360` |
| `FormsBuilderOtherService.createAdjectivalForm` | 1 | `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms-builder-other.service.ts:458` |
| `FormsService.preserveMatchingExistingFormIdentity` | 1 | `FormsService.findIndex(…)` | `applications/lexico-ingestion/src/modules/forms/forms.service.ts:81` |
| `FormsService.buildFormsForPartOfSpeech` | 1 | `FormsBuilderOtherService.buildFormsForPartOfSpeech` | `applications/lexico-ingestion/src/modules/forms/forms.service.ts:127` |
| `FormsService.setTransientWords` | 1 | `FormsTransientWordsService.setTransientWords` | `applications/lexico-ingestion/src/modules/forms/forms.service.ts:181` |
| `PartOfSpeechFormsService.parseVerbWordCell` | 1 | `PartOfSpeechFormsService.resolveVerbSumEntry` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:207` |
| `PartOfSpeechFormsService.scanTableAxis` | 1 | `PartOfSpeechFormsService.isGenericFormCell` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:299` |
| `PartOfSpeechFormsService.scanVerbHeader` | 1 | `PartOfSpeechFormsService.isVerbFormCell` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:317` |
| `PartOfSpeechFormsService.sortIdentifiers` | 1 | `PartOfSpeechFormsService.isRecord` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech-forms.service.ts:336` |
| `PartOfSpeechService.findTypedValue` | 1 | `PartOfSpeechService.find(…)` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:129` |
| `PartOfSpeechService.buildAdjectiveInflection` | 1 | `PartOfSpeechService.findTypedValue` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:142` |
| `PartOfSpeechService.buildNounInflection` | 1 | `PartOfSpeechService.findTypedValue` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:161` |
| `PartOfSpeechService.ingestAdverbForms` | 1 | `PartOfSpeechService.getTextOrEmpty` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:221` |
| `PartOfSpeechService.ingestPrepositionInflection` | 1 | `PartOfSpeechService.findTypedValue` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:293` |
| `PartOfSpeechService.ingestPronounInflection` | 1 | `PartOfSpeechService.findTypedValue` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:318` |
| `PartOfSpeechService.ingestVerbInflection` | 1 | `PartOfSpeechService.findTypedValue` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:350` |
| `PartOfSpeechService.getPartOfSpeech` | 1 | `PartOfSpeechService.isPartOfSpeech` | `applications/lexico-ingestion/src/modules/part-of-speech/part-of-speech.service.ts:393` |
| `PrincipalPartsService.ingestLexemePrincipalParts` | 1 | `PrincipalPartsService.find(…)` | `applications/lexico-ingestion/src/modules/principal-parts/principal-parts.service.ts:65` |
| `PronunciationEcclesiasticalService.classifyEcclesiasticalC` | 1 | `PronunciationEcclesiasticalService.isPalatalizedCConsonant` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:120` |
| `PronunciationEcclesiasticalService.classifyEcclesiasticalG` | 1 | `PronunciationEcclesiasticalService.isPalatalizedGConsonant` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:143` |
| `PronunciationEcclesiasticalService.lookupMultiCharacterPhoneme` | 1 | `PronunciationPhonemesService.getStringPhoneme` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-ecclesiastical.service.ts:264` |
| `PronunciationClassifierService.updateVariantPronunciation` | 1 | `PronunciationClassifierService.parsePhonics` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-classifier.service.ts:63` |
| `PronunciationClassifierService.processClassicalCharacter` | 1 | `PronunciationClassicalService.processClassicalCharacter` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-classifier.service.ts:119` |
| `PronunciationClassifierService.processEcclesiasticalCharacter` | 1 | `PronunciationEcclesiasticalService.processEcclesiasticalCharacter` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation-classifier.service.ts:130` |
| `PronunciationService.buildPronunciations` | 1 | `PronunciationService.build` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation.service.ts:59` |
| `PronunciationService.getClassicalPhonemes` | 1 | `PronunciationClassifierService.processClassicalCharacter` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation.service.ts:90` |
| `PronunciationService.getEcclesiasticalPhonemes` | 1 | `PronunciationClassifierService.processEcclesiasticalCharacter` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation.service.ts:124` |
| `PronunciationService.ingestLexemePronunciations` | 1 | `PronunciationService.find(…)` | `applications/lexico-ingestion/src/modules/pronunciation/pronunciation.service.ts:159` |
| `TranslationsService.map(…)` | 1 | `TranslationsService.normalize` | `applications/lexico-ingestion/src/modules/translations/translations.service.ts:125` |
| `TranslationsService.prepareTranslationsForSave` | 1 | `TranslationsService.find(…)` | `applications/lexico-ingestion/src/modules/translations/translations.service.ts:140` |
| `LexemesService.buildLexeme` | 1 | `LexemesService.normalize` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:56` |
| `LexemesService.saveTranslations` | 1 | `TranslationsService.prepareTranslationsForSave` | `applications/lexico-ingestion/src/modules/lexemes/lexemes.service.ts:246` |
| `NumeralsService.toRoman` | 1 | `NumeralsService.convertDigit` | `applications/lexico-ingestion/src/modules/numerals/numerals.service.ts:44` |
| `buildAdjectivalForms` | 1 | `flatMap(…)` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:17` |
| `flatMap(…)` | 1 | `flatMap(…)` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:20` |
| `flatMap(…)` | 1 | `flatMap(…)` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:21` |
| `flatMap(…)` | 1 | `createAdjectivalForm` | `applications/lexico-ingestion/src/modules/manual/manual.utilities.ts:22` |
| `ManualService.buildPraenomenTranslations` | 1 | `Translation.constructor` | `applications/lexico-ingestion/src/modules/manual/manual.service.ts:75` |
| `DictionaryCommand.escapeCapitals` | 1 | `DictionaryCommand.replaceAll(…)` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:65` |
| `DictionaryCommand.getPageForLexeme` | 1 | `DictionaryCommand.loadWiktionaryPageForWord` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:114` |
| `DictionaryCommand.getWiktionaryFilePathForWord` | 1 | `DictionaryCommand.escapeCapitals` | `applications/lexico-ingestion/src/modules/dictionary/dictionary.command.ts:130` |
| `EpigraphikDatenbankClaussSlabyCommand.downloadChunkData` | 1 | `EpigraphikDatenbankClaussSlabyCommand.saveChunkData` | `applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:50` |
| `EpigraphikDatenbankClaussSlabyCommand.downloadChunkIfMissing` | 1 | `EpigraphikDatenbankClaussSlabyCommand.downloadChunkData` | `applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:75` |
| `EpigraphikDatenbankClaussSlabyCommand.saveChunkData` | 1 | `EpigraphikDatenbankClaussSlabyCommand.anonymous` | `applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:97` |
| `EpigraphikDatenbankClaussSlabyCommand.run` | 1 | `EpigraphikDatenbankClaussSlabyCommand.downloadChunkIfMissing` | `applications/lexico-ingestion/src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts:137` |
| `LatinLibraryCommand.downloadAndSaveLatinLibraryFile` | 1 | `LatinLibraryCommand.anonymous` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:46` |
| `LatinLibraryCommand.getAuthorUrls` | 1 | `LatinLibraryCommand.each(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:114` |
| `LatinLibraryCommand.getFinalAuthorUrls` | 1 | `LatinLibraryCommand.processCategoryHref` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:149` |
| `LatinLibraryCommand.isIgnoredLinkFileName` | 1 | `LatinLibraryCommand.some(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:190` |
| `LatinLibraryCommand.isInvalidExtension` | 1 | `LatinLibraryCommand.some(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:219` |
| `LatinLibraryCommand.isSkipPath` | 1 | `LatinLibraryCommand.some(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:247` |
| `LatinLibraryCommand.parseHtmlForLinks` | 1 | `LatinLibraryCommand.each(…)` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:272` |
| `LatinLibraryCommand.each(…)` | 1 | `LatinLibraryCommand.processLink` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:279` |
| `LatinLibraryCommand.worker` | 1 | `LatinLibraryCommand.processQueueUrl` | `applications/lexico-ingestion/src/modules/latin-library/latin-library.command.ts:419` |
| `LibraryCommand.buildIngestParameters` | 1 | `LibraryCommand.filter(…)` | `applications/lexico-ingestion/src/modules/library/library.command.ts:59` |
| `LibraryCommand.scanLibraryAuthor` | 1 | `LibraryCommand.walkLibraryDirectory` | `applications/lexico-ingestion/src/modules/library/library.command.ts:271` |
| `LibraryCommand.scanLibraryProvider` | 1 | `LibraryCommand.scanLibraryAuthor` | `applications/lexico-ingestion/src/modules/library/library.command.ts:297` |
| `LibraryCommand.walkLibraryDirectory` | 1 | `LibraryCommand.pushTextEntry` | `applications/lexico-ingestion/src/modules/library/library.command.ts:326` |
| `LibraryCommand.parseAuthor` | 1 | `LibraryCommand.getAuthorChoices` | `applications/lexico-ingestion/src/modules/library/library.command.ts:368` |
| `LibraryCommand.parseText` | 1 | `LibraryCommand.getTextChoices` | `applications/lexico-ingestion/src/modules/library/library.command.ts:431` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.buildCselTextContent` | 1 | `hasValidTextContent` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:26` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.extractParagraphs` | 1 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:110` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.each(…)` | 1 | `formatLineNumber` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:114` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.getMetadata` | 1 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.map(…)` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:142` |
| `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.parseSourceXmlFile` | 1 | `CorpusScriptorumEcclesiasticorumLatinorumLibraryProvider.resolveSourceXmlMetadata` | `applications/lexico-ingestion/src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts:204` |
| `EpigraphikDatenbankClaussSlabyLibraryProvider.processSourceChunkFile` | 1 | `EpigraphikDatenbankClaussSlabyLibraryProvider.processEdcsRecord` | `applications/lexico-ingestion/src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts:100` |
| `EpigraphikDatenbankClaussSlabyLibraryProvider.processSourceChunkPhase` | 1 | `EpigraphikDatenbankClaussSlabyLibraryProvider.processSourceChunkFile` | `applications/lexico-ingestion/src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts:133` |
| `EpigraphikDatenbankClaussSlabyLibraryProvider.readSourceChunkFiles` | 1 | `EpigraphikDatenbankClaussSlabyLibraryProvider.filter(…)` | `applications/lexico-ingestion/src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts:155` |
| `EpigraphikDatenbankClaussSlabyLibraryProvider.saveEdcsProvincePhase` | 1 | `EpigraphikDatenbankClaussSlabyLibraryProvider.saveEdcsProvince` | `applications/lexico-ingestion/src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts:268` |
| `LatinLibraryBuilder.extractAuthorDates` | 1 | `LatinLibraryBuilder.computeYear` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:42` |
| `LatinLibraryBuilder.parseParagraphHtml` | 1 | `LatinLibraryBuilder.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:126` |
| `LatinLibraryBuilder.buildRootAuthors` | 1 | `LatinLibraryBuilder.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:177` |
| `LatinLibraryBuilder.each(…)` | 1 | `LatinLibraryBuilder.makeAuthor` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:183` |
| `LatinLibraryBuilder.buildWorkFrontmatter` | 1 | `LatinLibraryBuilder.getMetadataString` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:220` |
| `LatinLibraryBuilder.buildWorkMarkdownContent` | 1 | `LatinLibraryBuilder.buildWorkFrontmatter` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:245` |
| `LatinLibraryBuilder.extractAuthorPageMetadata` | 1 | `LatinLibraryBuilder.extractAuthorDates` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:270` |
| `LatinLibraryBuilder.getTextSlug` | 1 | `LatinLibraryBuilder.getMetadataString` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:320` |
| `LatinLibraryBuilder.isSkippedHref` | 1 | `LatinLibraryBuilder.some(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:342` |
| `LatinLibraryBuilder.parseWorkParagraphs` | 1 | `LatinLibraryBuilder.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:386` |
| `LatinLibraryBuilder.each(…)` | 1 | `LatinLibraryBuilder.extractLinesFromParagraph` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.builder.ts:393` |
| `LatinLibraryProvider.addFallbackText` | 1 | `LatinLibraryProvider.getMetadataString` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:35` |
| `LatinLibraryProvider.buildCategoryAuthor` | 1 | `LatinLibraryBuilder.buildCategoryAuthor` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:74` |
| `LatinLibraryProvider.buildRootAuthors` | 1 | `LatinLibraryBuilder.buildRootAuthors` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:84` |
| `LatinLibraryProvider.cleanupAuthorMetadata` | 1 | `LatinLibraryProvider.forEach(…)` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:91` |
| `LatinLibraryProvider.each(…)` | 1 | `LatinLibraryProvider.buildCategoryAuthor` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:156` |
| `LatinLibraryProvider.sort(…)` | 1 | `LatinLibraryProvider.getMetadataString` | `applications/lexico-ingestion/src/modules/library/providers/latin-library.provider.ts:416` |
| `PerseusLibraryTextExtractionProvider.collectParagraphsFromElements` | 1 | `PerseusLibraryTextExtractionProvider.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:26` |
| `PerseusLibraryTextExtractionProvider.each(…)` | 1 | `formatLineNumber` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:32` |
| `PerseusLibraryTextExtractionProvider.extractChildTextParts` | 1 | `PerseusLibraryTextExtractionProvider.each(…)` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:57` |
| `PerseusLibraryTextExtractionProvider.getTextPartDescriptor` | 1 | `PerseusLibraryTextExtractionProvider.shouldSkipTextPart` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:86` |
| `PerseusLibraryTextExtractionProvider.shouldSkipTextPart` | 1 | `PerseusLibraryTextExtractionProvider.some(…)` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library-text-extraction.provider.ts:186` |
| `PerseusLibraryProvider.extractPerseusMetadata` | 1 | `PerseusLibraryProvider.map(…)` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:81` |
| `PerseusLibraryProvider.loadSourceXmlFile` | 1 | `PerseusLibraryProvider.then(…)` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:158` |
| `PerseusLibraryProvider.processPerseusFile` | 1 | `PerseusLibraryProvider.processSourceXmlFile` | `applications/lexico-ingestion/src/modules/library/providers/perseus-library.provider.ts:175` |
| `LiteratureWordNormalizationService.escapeCapitals` | 1 | `LiteratureWordNormalizationService.replaceAll(…)` | `applications/lexico-ingestion/src/modules/literature/literature-word-normalization.service.ts:27` |
| `LiteratureService.buildLineEntityFromParagraph` | 1 | `LiteratureService.parseLabelFromStrongNode` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:91` |
| `LiteratureService.extractTokensFromLine` | 1 | `LiteratureService.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:152` |
| `LiteratureService.getWordsCache` | 1 | `LiteratureService.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:195` |
| `LiteratureService.ingestTextChunks` | 1 | `LiteratureTextIngestionService.ingestTextWithLogging` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:298` |
| `LiteratureService.parseNonStandardLabel` | 1 | `NumeralsService.toDecimal` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:369` |
| `LiteratureService.parseStandardLabel` | 1 | `NumeralsService.toDecimal` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:391` |
| `LiteratureService.saveTextToDatabase` | 1 | `LiteratureService.isRecord` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:409` |
| `LiteratureService.upsertAndFetchLines` | 1 | `LiteratureService.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:445` |
| `LiteratureService.upsertTokens` | 1 | `LiteratureService.map(…)` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:468` |
| `LiteratureService.ingestAllAuthors` | 1 | `LiteratureService.ingestAuthorGroup` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:489` |
| `LiteratureService.scanLibrary` | 1 | `LiteratureLibraryScanService.scanLibrary` | `applications/lexico-ingestion/src/modules/literature/literature.service.ts:507` |
| `PerseusCommand.fetchAndWriteXmlFile` | 1 | `PerseusCommand.anonymous` | `applications/lexico-ingestion/src/modules/perseus/perseus.command.ts:81` |
| `WiktionaryCommand.escapeCapitals` | 1 | `WiktionaryCommand.replaceAll(…)` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:58` |
| `WiktionaryCommand.fetchCategoryPage` | 1 | `WiktionaryCommand.fetchWithRetry` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:67` |
| `WiktionaryCommand.fetchWithRetry` | 1 | `WiktionaryCommand.anonymous` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:82` |
| `WiktionaryCommand.parseLatinSection` | 1 | `WiktionaryCommand.fetchWithRetry` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:212` |
| `WiktionaryCommand.saveWiktionaryEntry` | 1 | `WiktionaryCommand.escapeCapitals` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:265` |
| `WiktionaryCommand.run` | 1 | `WiktionaryCommand.ingestWiktionary` | `applications/lexico-ingestion/src/modules/wiktionary/wiktionary.command.ts:302` |
| `LexicoIngestionCommand.promptForMissingOptions` | 1 | `LexicoIngestionCommand.promptOption` | `applications/lexico-ingestion/src/modules/lexico-ingestion/lexico-ingestion.command.ts:96` |

</details>

### Possibly misplaced

| Callable | Declared in | Called from | Callers |
| --- | --- | --- | --- |
| `NumeralsService.toDecimal` | `applications/lexico-ingestion:modules/numerals` | `applications/lexico-ingestion:modules/literature` | 2/2 |
<!-- CALL_STACKS_END -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/JimmyPaolini/codebase/tree/main/packages/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx" -->
```mermaid
graph LR
  lexico_entities["lexico-entities"]
  lexico_ingestion["lexico-ingestion"]
  logger["logger"]
  lexico_ingestion --> lexico_entities
  lexico_ingestion --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class lexico_ingestion subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  ClearModule
  ConfigModule([ConfigModule])
  CorpusScriptorumEcclesiasticorumLatinorumModule
  DatabaseModule
  DictionaryModule
  DiscoveryModule
  EpigraphikDatenbankClaussSlabyModule
  EtymologyModule
  FormsModule
  LatinLibraryModule
  LexemesModule
  LexicoIngestionModule
  LibraryModule
  LiteratureModule
  LoggerModule([LoggerModule])
  MainModule
  ManualModule
  NumeralsModule
  PartOfSpeechModule
  PerseusModule
  PrincipalPartsModule
  PronunciationModule
  TranslationsModule
  TypeOrmModule
  WiktionaryModule
  WordsModule
  ClearModule --> DatabaseModule
  ClearModule --> TypeOrmModule
  DatabaseModule --> TypeOrmModule
  DictionaryModule --> FormsModule
  DictionaryModule --> LexemesModule
  DictionaryModule --> ManualModule
  DictionaryModule --> PrincipalPartsModule
  DictionaryModule --> PronunciationModule
  DictionaryModule --> TranslationsModule
  DictionaryModule --> WordsModule
  FormsModule --> TypeOrmModule
  FormsModule --> WordsModule
  LexemesModule --> EtymologyModule
  LexemesModule --> FormsModule
  LexemesModule --> PartOfSpeechModule
  LexemesModule --> PrincipalPartsModule
  LexemesModule --> PronunciationModule
  LexemesModule --> TranslationsModule
  LexemesModule --> TypeOrmModule
  LexemesModule --> WordsModule
  LexicoIngestionModule --> ClearModule
  LexicoIngestionModule --> CorpusScriptorumEcclesiasticorumLatinorumModule
  LexicoIngestionModule --> DatabaseModule
  LexicoIngestionModule --> DictionaryModule
  LexicoIngestionModule --> EpigraphikDatenbankClaussSlabyModule
  LexicoIngestionModule --> LatinLibraryModule
  LexicoIngestionModule --> LibraryModule
  LexicoIngestionModule --> LiteratureModule
  LexicoIngestionModule --> ManualModule
  LexicoIngestionModule --> PerseusModule
  LexicoIngestionModule --> WiktionaryModule
  LexicoIngestionModule --> WordsModule
  LiteratureModule --> DatabaseModule
  LiteratureModule --> NumeralsModule
  LiteratureModule --> TypeOrmModule
  MainModule --> DiscoveryModule
  MainModule --> LexicoIngestionModule
  ManualModule --> NumeralsModule
  ManualModule --> TypeOrmModule
  ManualModule --> WordsModule
  PrincipalPartsModule --> TypeOrmModule
  PronunciationModule --> TypeOrmModule
  TranslationsModule --> TypeOrmModule
  WiktionaryModule --> TypeOrmModule
  WordsModule --> TypeOrmModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_constants_ts["src/constants.ts"]
  file_src_main_end_to_end_test_ts["src/main.end-to-end.test.ts"]
  file_src_main_module_ts["src/main.module.ts"]
  file_src_main_ts["src/main.ts"]
  file_src_main_unit_test_ts["src/main.unit.test.ts"]
  file_src_modules_clear_clear_command_ts["src/modules/clear/clear.command.ts"]
  file_src_modules_clear_clear_command_unit_test_ts["src/modules/clear/clear.command.unit.test.ts"]
  file_src_modules_clear_clear_constants_ts["src/modules/clear/clear.constants.ts"]
  file_src_modules_clear_clear_module_ts["src/modules/clear/clear.module.ts"]
  file_src_modules_clear_clear_types_ts["src/modules/clear/clear.types.ts"]
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts["src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.ts"]
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_unit_test_ts["src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.command.unit.test.ts"]
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_constants_ts["src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.constants.ts"]
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_module_ts["src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.module.ts"]
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_types_ts["src/modules/corpus-scriptorum-ecclesiasticorum-latinorum/corpus-scriptorum-ecclesiasticorum-latinorum.types.ts"]
  file_src_modules_dictionary_dictionary_command_ts["src/modules/dictionary/dictionary.command.ts"]
  file_src_modules_dictionary_dictionary_command_unit_test_ts["src/modules/dictionary/dictionary.command.unit.test.ts"]
  file_src_modules_dictionary_dictionary_constants_ts["src/modules/dictionary/dictionary.constants.ts"]
  file_src_modules_dictionary_dictionary_module_ts["src/modules/dictionary/dictionary.module.ts"]
  file_src_modules_dictionary_dictionary_types_ts["src/modules/dictionary/dictionary.types.ts"]
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts["src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.ts"]
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_unit_test_ts["src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.command.unit.test.ts"]
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_constants_ts["src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.constants.ts"]
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_module_ts["src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.module.ts"]
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_types_ts["src/modules/epigraphik-datenbank-clauss-slaby/epigraphik-datenbank-clauss-slaby.types.ts"]
  file_src_modules_etymology_etymology_constants_ts["src/modules/etymology/etymology.constants.ts"]
  file_src_modules_etymology_etymology_module_ts["src/modules/etymology/etymology.module.ts"]
  file_src_modules_etymology_etymology_service_ts["src/modules/etymology/etymology.service.ts"]
  file_src_modules_etymology_etymology_service_unit_test_ts["src/modules/etymology/etymology.service.unit.test.ts"]
  file_src_modules_etymology_etymology_types_ts["src/modules/etymology/etymology.types.ts"]
  file_src_modules_forms_forms_builder_guards_service_ts["src/modules/forms/forms-builder-guards.service.ts"]
  file_src_modules_forms_forms_builder_guards_service_unit_test_ts["src/modules/forms/forms-builder-guards.service.unit.test.ts"]
  file_src_modules_forms_forms_builder_other_service_ts["src/modules/forms/forms-builder-other.service.ts"]
  file_src_modules_forms_forms_builder_other_service_unit_test_ts["src/modules/forms/forms-builder-other.service.unit.test.ts"]
  file_src_modules_forms_forms_builder_verb_service_ts["src/modules/forms/forms-builder-verb.service.ts"]
  file_src_modules_forms_forms_builder_verb_service_unit_test_ts["src/modules/forms/forms-builder-verb.service.unit.test.ts"]
  file_src_modules_forms_forms_transient_words_service_ts["src/modules/forms/forms-transient-words.service.ts"]
  file_src_modules_forms_forms_transient_words_service_unit_test_ts["src/modules/forms/forms-transient-words.service.unit.test.ts"]
  file_src_modules_forms_forms_constants_ts["src/modules/forms/forms.constants.ts"]
  file_src_modules_forms_forms_constants_unit_test_ts["src/modules/forms/forms.constants.unit.test.ts"]
  file_src_modules_forms_forms_module_ts["src/modules/forms/forms.module.ts"]
  file_src_modules_forms_forms_service_ts["src/modules/forms/forms.service.ts"]
  file_src_modules_forms_forms_service_unit_test_ts["src/modules/forms/forms.service.unit.test.ts"]
  file_src_modules_forms_forms_types_ts["src/modules/forms/forms.types.ts"]
  file_src_modules_latin_library_latin_library_command_ts["src/modules/latin-library/latin-library.command.ts"]
  file_src_modules_latin_library_latin_library_command_unit_test_ts["src/modules/latin-library/latin-library.command.unit.test.ts"]
  file_src_modules_latin_library_latin_library_constants_ts["src/modules/latin-library/latin-library.constants.ts"]
  file_src_modules_latin_library_latin_library_module_ts["src/modules/latin-library/latin-library.module.ts"]
  file_src_modules_latin_library_latin_library_types_ts["src/modules/latin-library/latin-library.types.ts"]
  file_src_modules_lexemes_lexemes_constants_ts["src/modules/lexemes/lexemes.constants.ts"]
  file_src_modules_lexemes_lexemes_module_ts["src/modules/lexemes/lexemes.module.ts"]
  file_src_modules_lexemes_lexemes_service_ts["src/modules/lexemes/lexemes.service.ts"]
  file_src_modules_lexemes_lexemes_service_unit_test_ts["src/modules/lexemes/lexemes.service.unit.test.ts"]
  file_src_modules_lexemes_lexemes_types_ts["src/modules/lexemes/lexemes.types.ts"]
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts["src/modules/lexico-ingestion/lexico-ingestion.command.ts"]
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts["src/modules/lexico-ingestion/lexico-ingestion.command.unit.test.ts"]
  file_src_modules_lexico_ingestion_lexico_ingestion_constants_ts["src/modules/lexico-ingestion/lexico-ingestion.constants.ts"]
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts["src/modules/lexico-ingestion/lexico-ingestion.module.ts"]
  file_src_modules_lexico_ingestion_lexico_ingestion_types_ts["src/modules/lexico-ingestion/lexico-ingestion.types.ts"]
  file_src_modules_library_library_command_ts["src/modules/library/library.command.ts"]
  file_src_modules_library_library_command_unit_test_ts["src/modules/library/library.command.unit.test.ts"]
  file_src_modules_library_library_constants_ts["src/modules/library/library.constants.ts"]
  file_src_modules_library_library_module_ts["src/modules/library/library.module.ts"]
  file_src_modules_library_library_types_ts["src/modules/library/library.types.ts"]
  file_src_modules_library_library_utilities_ts["src/modules/library/library.utilities.ts"]
  file_src_modules_library_library_utilities_unit_test_ts["src/modules/library/library.utilities.unit.test.ts"]
  file_src_modules_library_providers_corpus_scriptorum_ecclesiasticorum_latinorum_library_provider_ts["src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.ts"]
  file_src_modules_library_providers_corpus_scriptorum_ecclesiasticorum_latinorum_library_provider_unit_test_ts["src/modules/library/providers/corpus-scriptorum-ecclesiasticorum-latinorum-library.provider.unit.test.ts"]
  file_src_modules_library_providers_epigraphik_datenbank_clauss_slaby_library_provider_ts["src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.ts"]
  file_src_modules_library_providers_epigraphik_datenbank_clauss_slaby_library_provider_unit_test_ts["src/modules/library/providers/epigraphik-datenbank-clauss-slaby-library.provider.unit.test.ts"]
  file_src_modules_library_providers_latin_library_builder_ts["src/modules/library/providers/latin-library.builder.ts"]
  file_src_modules_library_providers_latin_library_builder_unit_test_ts["src/modules/library/providers/latin-library.builder.unit.test.ts"]
  file_src_modules_library_providers_latin_library_provider_ts["src/modules/library/providers/latin-library.provider.ts"]
  file_src_modules_library_providers_latin_library_provider_unit_test_ts["src/modules/library/providers/latin-library.provider.unit.test.ts"]
  file_src_modules_library_providers_perseus_library_text_extraction_provider_ts["src/modules/library/providers/perseus-library-text-extraction.provider.ts"]
  file_src_modules_library_providers_perseus_library_text_extraction_provider_unit_test_ts["src/modules/library/providers/perseus-library-text-extraction.provider.unit.test.ts"]
  file_src_modules_library_providers_perseus_library_provider_ts["src/modules/library/providers/perseus-library.provider.ts"]
  file_src_modules_library_providers_perseus_library_provider_unit_test_ts["src/modules/library/providers/perseus-library.provider.unit.test.ts"]
  file_src_modules_literature_literature_library_scan_service_ts["src/modules/literature/literature-library-scan.service.ts"]
  file_src_modules_literature_literature_library_scan_service_unit_test_ts["src/modules/literature/literature-library-scan.service.unit.test.ts"]
  file_src_modules_literature_literature_text_ingestion_service_ts["src/modules/literature/literature-text-ingestion.service.ts"]
  file_src_modules_literature_literature_text_ingestion_service_unit_test_ts["src/modules/literature/literature-text-ingestion.service.unit.test.ts"]
  file_src_modules_literature_literature_word_normalization_service_ts["src/modules/literature/literature-word-normalization.service.ts"]
  file_src_modules_literature_literature_word_normalization_service_unit_test_ts["src/modules/literature/literature-word-normalization.service.unit.test.ts"]
  file_src_modules_literature_literature_command_ts["src/modules/literature/literature.command.ts"]
  file_src_modules_literature_literature_command_unit_test_ts["src/modules/literature/literature.command.unit.test.ts"]
  file_src_modules_literature_literature_constants_ts["src/modules/literature/literature.constants.ts"]
  file_src_modules_literature_literature_module_ts["src/modules/literature/literature.module.ts"]
  file_src_modules_literature_literature_service_ts["src/modules/literature/literature.service.ts"]
  file_src_modules_literature_literature_service_unit_test_ts["src/modules/literature/literature.service.unit.test.ts"]
  file_src_modules_literature_literature_types_ts["src/modules/literature/literature.types.ts"]
  file_src_modules_manual_manual_constants_ts["src/modules/manual/manual.constants.ts"]
  file_src_modules_manual_manual_module_ts["src/modules/manual/manual.module.ts"]
  file_src_modules_manual_manual_service_ts["src/modules/manual/manual.service.ts"]
  file_src_modules_manual_manual_service_unit_test_ts["src/modules/manual/manual.service.unit.test.ts"]
  file_src_modules_manual_manual_types_ts["src/modules/manual/manual.types.ts"]
  file_src_modules_manual_manual_utilities_ts["src/modules/manual/manual.utilities.ts"]
  file_src_modules_numerals_numerals_constants_ts["src/modules/numerals/numerals.constants.ts"]
  file_src_modules_numerals_numerals_module_ts["src/modules/numerals/numerals.module.ts"]
  file_src_modules_numerals_numerals_service_ts["src/modules/numerals/numerals.service.ts"]
  file_src_modules_numerals_numerals_service_unit_test_ts["src/modules/numerals/numerals.service.unit.test.ts"]
  file_src_modules_numerals_numerals_types_ts["src/modules/numerals/numerals.types.ts"]
  file_src_modules_part_of_speech_part_of_speech_forms_service_ts["src/modules/part-of-speech/part-of-speech-forms.service.ts"]
  file_src_modules_part_of_speech_part_of_speech_forms_service_unit_test_ts["src/modules/part-of-speech/part-of-speech-forms.service.unit.test.ts"]
  file_src_modules_part_of_speech_part_of_speech_constants_ts["src/modules/part-of-speech/part-of-speech.constants.ts"]
  file_src_modules_part_of_speech_part_of_speech_module_ts["src/modules/part-of-speech/part-of-speech.module.ts"]
  file_src_modules_part_of_speech_part_of_speech_service_ts["src/modules/part-of-speech/part-of-speech.service.ts"]
  file_src_modules_part_of_speech_part_of_speech_service_unit_test_ts["src/modules/part-of-speech/part-of-speech.service.unit.test.ts"]
  file_src_modules_part_of_speech_part_of_speech_types_ts["src/modules/part-of-speech/part-of-speech.types.ts"]
  file_src_modules_perseus_perseus_command_ts["src/modules/perseus/perseus.command.ts"]
  file_src_modules_perseus_perseus_command_unit_test_ts["src/modules/perseus/perseus.command.unit.test.ts"]
  file_src_modules_perseus_perseus_constants_ts["src/modules/perseus/perseus.constants.ts"]
  file_src_modules_perseus_perseus_module_ts["src/modules/perseus/perseus.module.ts"]
  file_src_modules_perseus_perseus_types_ts["src/modules/perseus/perseus.types.ts"]
  file_src_modules_principal_parts_principal_parts_constants_ts["src/modules/principal-parts/principal-parts.constants.ts"]
  file_src_modules_principal_parts_principal_parts_module_ts["src/modules/principal-parts/principal-parts.module.ts"]
  file_src_modules_principal_parts_principal_parts_service_ts["src/modules/principal-parts/principal-parts.service.ts"]
  file_src_modules_principal_parts_principal_parts_service_unit_test_ts["src/modules/principal-parts/principal-parts.service.unit.test.ts"]
  file_src_modules_principal_parts_principal_parts_types_ts["src/modules/principal-parts/principal-parts.types.ts"]
  file_src_modules_pronunciation_pronunciation_classical_service_ts["src/modules/pronunciation/pronunciation-classical.service.ts"]
  file_src_modules_pronunciation_pronunciation_classical_service_unit_test_ts["src/modules/pronunciation/pronunciation-classical.service.unit.test.ts"]
  file_src_modules_pronunciation_pronunciation_classifier_service_ts["src/modules/pronunciation/pronunciation-classifier.service.ts"]
  file_src_modules_pronunciation_pronunciation_classifier_service_unit_test_ts["src/modules/pronunciation/pronunciation-classifier.service.unit.test.ts"]
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts["src/modules/pronunciation/pronunciation-ecclesiastical.service.ts"]
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_unit_test_ts["src/modules/pronunciation/pronunciation-ecclesiastical.service.unit.test.ts"]
  file_src_modules_pronunciation_pronunciation_phonemes_service_ts["src/modules/pronunciation/pronunciation-phonemes.service.ts"]
  file_src_modules_pronunciation_pronunciation_phonemes_service_unit_test_ts["src/modules/pronunciation/pronunciation-phonemes.service.unit.test.ts"]
  file_src_modules_pronunciation_pronunciation_constants_ts["src/modules/pronunciation/pronunciation.constants.ts"]
  file_src_modules_pronunciation_pronunciation_module_ts["src/modules/pronunciation/pronunciation.module.ts"]
  file_src_modules_pronunciation_pronunciation_service_ts["src/modules/pronunciation/pronunciation.service.ts"]
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts["src/modules/pronunciation/pronunciation.service.unit.test.ts"]
  file_src_modules_pronunciation_pronunciation_types_ts["src/modules/pronunciation/pronunciation.types.ts"]
  file_src_modules_translations_translations_constants_ts["src/modules/translations/translations.constants.ts"]
  file_src_modules_translations_translations_module_ts["src/modules/translations/translations.module.ts"]
  file_src_modules_translations_translations_service_ts["src/modules/translations/translations.service.ts"]
  file_src_modules_translations_translations_service_unit_test_ts["src/modules/translations/translations.service.unit.test.ts"]
  file_src_modules_translations_translations_types_ts["src/modules/translations/translations.types.ts"]
  file_src_modules_wiktionary_wiktionary_command_ts["src/modules/wiktionary/wiktionary.command.ts"]
  file_src_modules_wiktionary_wiktionary_command_unit_test_ts["src/modules/wiktionary/wiktionary.command.unit.test.ts"]
  file_src_modules_wiktionary_wiktionary_constants_ts["src/modules/wiktionary/wiktionary.constants.ts"]
  file_src_modules_wiktionary_wiktionary_module_ts["src/modules/wiktionary/wiktionary.module.ts"]
  file_src_modules_wiktionary_wiktionary_types_ts["src/modules/wiktionary/wiktionary.types.ts"]
  file_src_modules_words_words_constants_ts["src/modules/words/words.constants.ts"]
  file_src_modules_words_words_module_ts["src/modules/words/words.module.ts"]
  file_src_modules_words_words_service_ts["src/modules/words/words.service.ts"]
  file_src_modules_words_words_service_unit_test_ts["src/modules/words/words.service.unit.test.ts"]
  file_src_modules_words_words_types_ts["src/modules/words/words.types.ts"]
  file_src_repl_ts["src/repl.ts"]
  file_src_repl_unit_test_ts["src/repl.unit.test.ts"]
  file_testing_command_harness_ts["testing/command-harness.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_main_end_to_end_test_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_module_ts
  file_src_main_ts --> file_src_main_module_ts
  file_src_modules_clear_clear_command_ts --> file_src_modules_clear_clear_types_ts
  file_src_modules_clear_clear_command_unit_test_ts --> file_src_modules_clear_clear_command_ts
  file_src_modules_clear_clear_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_clear_clear_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_clear_clear_module_ts --> file_src_modules_clear_clear_command_ts
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_constants_ts
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_types_ts
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_unit_test_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_module_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts
  file_src_modules_dictionary_dictionary_command_ts --> file_src_modules_dictionary_dictionary_types_ts
  file_src_modules_dictionary_dictionary_command_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_dictionary_dictionary_command_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_types_ts
  file_src_modules_dictionary_dictionary_command_ts --> file_src_modules_manual_manual_service_ts
  file_src_modules_dictionary_dictionary_command_ts --> file_src_modules_translations_translations_service_ts
  file_src_modules_dictionary_dictionary_command_unit_test_ts --> file_src_modules_dictionary_dictionary_command_ts
  file_src_modules_dictionary_dictionary_command_unit_test_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_dictionary_dictionary_command_unit_test_ts --> file_src_modules_manual_manual_service_ts
  file_src_modules_dictionary_dictionary_command_unit_test_ts --> file_src_modules_translations_translations_service_ts
  file_src_modules_dictionary_dictionary_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_dictionary_dictionary_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_dictionary_dictionary_command_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_forms_forms_module_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_lexemes_lexemes_module_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_manual_manual_module_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_principal_parts_principal_parts_module_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_pronunciation_pronunciation_module_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_translations_translations_module_ts
  file_src_modules_dictionary_dictionary_module_ts --> file_src_modules_words_words_module_ts
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_constants_ts
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_types_ts
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_unit_test_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_module_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts
  file_src_modules_etymology_etymology_module_ts --> file_src_modules_etymology_etymology_service_ts
  file_src_modules_etymology_etymology_service_unit_test_ts --> file_src_modules_etymology_etymology_service_ts
  file_src_modules_forms_forms_builder_guards_service_ts --> file_src_modules_forms_forms_constants_ts
  file_src_modules_forms_forms_builder_guards_service_ts --> file_src_modules_forms_forms_types_ts
  file_src_modules_forms_forms_builder_guards_service_unit_test_ts --> file_src_modules_forms_forms_builder_guards_service_ts
  file_src_modules_forms_forms_builder_other_service_ts --> file_src_modules_forms_forms_builder_guards_service_ts
  file_src_modules_forms_forms_builder_other_service_ts --> file_src_modules_forms_forms_builder_verb_service_ts
  file_src_modules_forms_forms_builder_other_service_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_builder_other_service_ts --> file_src_modules_forms_forms_constants_ts
  file_src_modules_forms_forms_builder_other_service_ts --> file_src_modules_forms_forms_types_ts
  file_src_modules_forms_forms_builder_other_service_unit_test_ts --> file_src_modules_forms_forms_builder_guards_service_ts
  file_src_modules_forms_forms_builder_other_service_unit_test_ts --> file_src_modules_forms_forms_builder_other_service_ts
  file_src_modules_forms_forms_builder_other_service_unit_test_ts --> file_src_modules_forms_forms_builder_verb_service_ts
  file_src_modules_forms_forms_builder_other_service_unit_test_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_builder_verb_service_ts --> file_src_modules_forms_forms_builder_guards_service_ts
  file_src_modules_forms_forms_builder_verb_service_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_builder_verb_service_ts --> file_src_modules_forms_forms_types_ts
  file_src_modules_forms_forms_builder_verb_service_unit_test_ts --> file_src_modules_forms_forms_builder_guards_service_ts
  file_src_modules_forms_forms_builder_verb_service_unit_test_ts --> file_src_modules_forms_forms_builder_verb_service_ts
  file_src_modules_forms_forms_builder_verb_service_unit_test_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_transient_words_service_unit_test_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_module_ts --> file_src_modules_forms_forms_builder_guards_service_ts
  file_src_modules_forms_forms_module_ts --> file_src_modules_forms_forms_builder_other_service_ts
  file_src_modules_forms_forms_module_ts --> file_src_modules_forms_forms_builder_verb_service_ts
  file_src_modules_forms_forms_module_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_module_ts --> file_src_modules_forms_forms_service_ts
  file_src_modules_forms_forms_module_ts --> file_src_modules_words_words_module_ts
  file_src_modules_forms_forms_service_ts --> file_src_modules_forms_forms_builder_other_service_ts
  file_src_modules_forms_forms_service_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_service_ts --> file_src_modules_words_words_service_ts
  file_src_modules_forms_forms_service_unit_test_ts --> file_src_modules_forms_forms_builder_other_service_ts
  file_src_modules_forms_forms_service_unit_test_ts --> file_src_modules_forms_forms_transient_words_service_ts
  file_src_modules_forms_forms_service_unit_test_ts --> file_src_modules_forms_forms_service_ts
  file_src_modules_forms_forms_service_unit_test_ts --> file_src_modules_words_words_service_ts
  file_src_modules_forms_forms_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_latin_library_latin_library_command_unit_test_ts --> file_src_modules_latin_library_latin_library_command_ts
  file_src_modules_latin_library_latin_library_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_latin_library_latin_library_module_ts --> file_src_modules_latin_library_latin_library_command_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_etymology_etymology_module_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_forms_forms_module_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_part_of_speech_part_of_speech_module_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_principal_parts_principal_parts_module_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_pronunciation_pronunciation_module_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_translations_translations_module_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_words_words_module_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_etymology_etymology_service_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_forms_forms_service_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_lexemes_lexemes_constants_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_constants_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_types_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_part_of_speech_part_of_speech_service_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_principal_parts_principal_parts_service_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_pronunciation_pronunciation_service_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_translations_translations_service_ts
  file_src_modules_lexemes_lexemes_service_ts --> file_src_modules_words_words_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_etymology_etymology_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_forms_forms_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_types_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_part_of_speech_part_of_speech_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_principal_parts_principal_parts_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_translations_translations_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_words_words_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_dictionary_dictionary_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_latin_library_latin_library_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_types_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_library_library_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_literature_literature_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_perseus_perseus_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_ts --> file_src_modules_wiktionary_wiktionary_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_dictionary_dictionary_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_latin_library_latin_library_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_types_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_library_library_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_literature_literature_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_perseus_perseus_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_src_modules_wiktionary_wiktionary_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_clear_clear_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_corpus_scriptorum_ecclesiasticorum_latinorum_corpus_scriptorum_ecclesiasticorum_latinorum_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_dictionary_dictionary_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_epigraphik_datenbank_clauss_slaby_epigraphik_datenbank_clauss_slaby_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_latin_library_latin_library_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_command_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_library_library_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_literature_literature_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_manual_manual_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_perseus_perseus_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_wiktionary_wiktionary_module_ts
  file_src_modules_lexico_ingestion_lexico_ingestion_module_ts --> file_src_modules_words_words_module_ts
  file_src_modules_library_library_command_ts --> file_src_modules_library_library_constants_ts
  file_src_modules_library_library_command_ts --> file_src_modules_library_library_types_ts
  file_src_modules_library_library_command_unit_test_ts --> file_src_modules_library_library_command_ts
  file_src_modules_library_library_command_unit_test_ts --> file_src_modules_library_library_constants_ts
  file_src_modules_library_library_command_unit_test_ts --> file_src_modules_library_library_types_ts
  file_src_modules_library_library_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_library_library_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_library_command_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_library_constants_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_library_types_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_providers_corpus_scriptorum_ecclesiasticorum_latinorum_library_provider_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_providers_epigraphik_datenbank_clauss_slaby_library_provider_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_providers_latin_library_builder_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_providers_latin_library_provider_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_providers_perseus_library_text_extraction_provider_ts
  file_src_modules_library_library_module_ts --> file_src_modules_library_providers_perseus_library_provider_ts
  file_src_modules_library_library_utilities_unit_test_ts --> file_src_modules_library_library_utilities_ts
  file_src_modules_library_providers_corpus_scriptorum_ecclesiasticorum_latinorum_library_provider_ts --> file_src_modules_library_library_utilities_ts
  file_src_modules_library_providers_corpus_scriptorum_ecclesiasticorum_latinorum_library_provider_unit_test_ts --> file_src_modules_library_providers_corpus_scriptorum_ecclesiasticorum_latinorum_library_provider_ts
  file_src_modules_library_providers_epigraphik_datenbank_clauss_slaby_library_provider_unit_test_ts --> file_src_modules_library_providers_epigraphik_datenbank_clauss_slaby_library_provider_ts
  file_src_modules_library_providers_latin_library_builder_ts --> file_src_modules_library_library_utilities_ts
  file_src_modules_library_providers_latin_library_builder_ts --> file_src_modules_literature_literature_constants_ts
  file_src_modules_library_providers_latin_library_builder_unit_test_ts --> file_src_modules_library_providers_latin_library_builder_ts
  file_src_modules_library_providers_latin_library_provider_ts --> file_src_modules_library_library_utilities_ts
  file_src_modules_library_providers_latin_library_provider_ts --> file_src_modules_library_providers_latin_library_builder_ts
  file_src_modules_library_providers_latin_library_provider_unit_test_ts --> file_src_modules_library_providers_latin_library_builder_ts
  file_src_modules_library_providers_latin_library_provider_unit_test_ts --> file_src_modules_library_providers_latin_library_provider_ts
  file_src_modules_library_providers_perseus_library_text_extraction_provider_ts --> file_src_modules_library_library_utilities_ts
  file_src_modules_library_providers_perseus_library_text_extraction_provider_unit_test_ts --> file_src_modules_library_providers_perseus_library_text_extraction_provider_ts
  file_src_modules_library_providers_perseus_library_provider_ts --> file_src_modules_library_providers_perseus_library_text_extraction_provider_ts
  file_src_modules_library_providers_perseus_library_provider_unit_test_ts --> file_src_modules_library_providers_perseus_library_text_extraction_provider_ts
  file_src_modules_library_providers_perseus_library_provider_unit_test_ts --> file_src_modules_library_providers_perseus_library_provider_ts
  file_src_modules_literature_literature_library_scan_service_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_library_scan_service_unit_test_ts --> file_src_modules_literature_literature_library_scan_service_ts
  file_src_modules_literature_literature_text_ingestion_service_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_text_ingestion_service_unit_test_ts --> file_src_modules_literature_literature_text_ingestion_service_ts
  file_src_modules_literature_literature_text_ingestion_service_unit_test_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_word_normalization_service_ts --> file_src_modules_literature_literature_constants_ts
  file_src_modules_literature_literature_word_normalization_service_unit_test_ts --> file_src_modules_literature_literature_word_normalization_service_ts
  file_src_modules_literature_literature_command_ts --> file_src_modules_literature_literature_service_ts
  file_src_modules_literature_literature_command_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_command_unit_test_ts --> file_src_modules_literature_literature_command_ts
  file_src_modules_literature_literature_command_unit_test_ts --> file_src_modules_literature_literature_service_ts
  file_src_modules_literature_literature_command_unit_test_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_literature_literature_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_literature_literature_module_ts --> file_src_modules_literature_literature_library_scan_service_ts
  file_src_modules_literature_literature_module_ts --> file_src_modules_literature_literature_text_ingestion_service_ts
  file_src_modules_literature_literature_module_ts --> file_src_modules_literature_literature_word_normalization_service_ts
  file_src_modules_literature_literature_module_ts --> file_src_modules_literature_literature_command_ts
  file_src_modules_literature_literature_module_ts --> file_src_modules_literature_literature_service_ts
  file_src_modules_literature_literature_module_ts --> file_src_modules_numerals_numerals_module_ts
  file_src_modules_literature_literature_service_ts --> file_src_modules_literature_literature_library_scan_service_ts
  file_src_modules_literature_literature_service_ts --> file_src_modules_literature_literature_text_ingestion_service_ts
  file_src_modules_literature_literature_service_ts --> file_src_modules_literature_literature_word_normalization_service_ts
  file_src_modules_literature_literature_service_ts --> file_src_modules_literature_literature_constants_ts
  file_src_modules_literature_literature_service_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_service_ts --> file_src_modules_numerals_numerals_service_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_src_modules_literature_literature_library_scan_service_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_src_modules_literature_literature_text_ingestion_service_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_src_modules_literature_literature_word_normalization_service_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_src_modules_literature_literature_service_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_src_modules_literature_literature_types_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_src_modules_numerals_numerals_service_ts
  file_src_modules_literature_literature_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_manual_manual_constants_ts --> file_src_modules_manual_manual_types_ts
  file_src_modules_manual_manual_module_ts --> file_src_modules_manual_manual_service_ts
  file_src_modules_manual_manual_module_ts --> file_src_modules_numerals_numerals_module_ts
  file_src_modules_manual_manual_module_ts --> file_src_modules_words_words_module_ts
  file_src_modules_manual_manual_service_ts --> file_src_modules_manual_manual_constants_ts
  file_src_modules_manual_manual_service_ts --> file_src_modules_manual_manual_types_ts
  file_src_modules_manual_manual_service_ts --> file_src_modules_manual_manual_utilities_ts
  file_src_modules_manual_manual_service_ts --> file_src_modules_numerals_numerals_service_ts
  file_src_modules_manual_manual_service_ts --> file_src_modules_words_words_service_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_src_modules_manual_manual_constants_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_src_modules_manual_manual_service_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_src_modules_manual_manual_types_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_src_modules_manual_manual_utilities_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_src_modules_numerals_numerals_service_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_src_modules_words_words_service_ts
  file_src_modules_manual_manual_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_numerals_numerals_module_ts --> file_src_modules_numerals_numerals_service_ts
  file_src_modules_numerals_numerals_service_ts --> file_src_modules_numerals_numerals_constants_ts
  file_src_modules_numerals_numerals_service_unit_test_ts --> file_src_modules_numerals_numerals_service_ts
  file_src_modules_part_of_speech_part_of_speech_forms_service_ts --> file_src_modules_part_of_speech_part_of_speech_constants_ts
  file_src_modules_part_of_speech_part_of_speech_forms_service_unit_test_ts --> file_src_modules_part_of_speech_part_of_speech_forms_service_ts
  file_src_modules_part_of_speech_part_of_speech_forms_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_part_of_speech_part_of_speech_module_ts --> file_src_modules_part_of_speech_part_of_speech_forms_service_ts
  file_src_modules_part_of_speech_part_of_speech_module_ts --> file_src_modules_part_of_speech_part_of_speech_service_ts
  file_src_modules_part_of_speech_part_of_speech_service_ts --> file_src_modules_part_of_speech_part_of_speech_forms_service_ts
  file_src_modules_part_of_speech_part_of_speech_service_ts --> file_src_modules_part_of_speech_part_of_speech_constants_ts
  file_src_modules_part_of_speech_part_of_speech_service_unit_test_ts --> file_src_modules_part_of_speech_part_of_speech_forms_service_ts
  file_src_modules_part_of_speech_part_of_speech_service_unit_test_ts --> file_src_modules_part_of_speech_part_of_speech_module_ts
  file_src_modules_part_of_speech_part_of_speech_service_unit_test_ts --> file_src_modules_part_of_speech_part_of_speech_service_ts
  file_src_modules_perseus_perseus_command_ts --> file_src_modules_perseus_perseus_constants_ts
  file_src_modules_perseus_perseus_command_ts --> file_src_modules_perseus_perseus_types_ts
  file_src_modules_perseus_perseus_command_unit_test_ts --> file_src_modules_perseus_perseus_command_ts
  file_src_modules_perseus_perseus_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_perseus_perseus_module_ts --> file_src_modules_perseus_perseus_command_ts
  file_src_modules_principal_parts_principal_parts_module_ts --> file_src_modules_principal_parts_principal_parts_service_ts
  file_src_modules_principal_parts_principal_parts_service_unit_test_ts --> file_src_modules_principal_parts_principal_parts_service_ts
  file_src_modules_principal_parts_principal_parts_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_pronunciation_pronunciation_classical_service_ts --> file_src_modules_pronunciation_pronunciation_constants_ts
  file_src_modules_pronunciation_pronunciation_classical_service_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_classical_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_classical_service_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_ts --> file_src_modules_pronunciation_pronunciation_classical_service_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_ts --> file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_classical_service_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_classifier_service_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts
  file_src_modules_pronunciation_pronunciation_classifier_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts --> file_src_modules_pronunciation_pronunciation_phonemes_service_ts
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts --> file_src_modules_pronunciation_pronunciation_constants_ts
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_phonemes_service_ts
  file_src_modules_pronunciation_pronunciation_ecclesiastical_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_phonemes_service_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_phonemes_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_phonemes_service_ts
  file_src_modules_pronunciation_pronunciation_constants_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_module_ts --> file_src_modules_pronunciation_pronunciation_classical_service_ts
  file_src_modules_pronunciation_pronunciation_module_ts --> file_src_modules_pronunciation_pronunciation_classifier_service_ts
  file_src_modules_pronunciation_pronunciation_module_ts --> file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts
  file_src_modules_pronunciation_pronunciation_module_ts --> file_src_modules_pronunciation_pronunciation_phonemes_service_ts
  file_src_modules_pronunciation_pronunciation_module_ts --> file_src_modules_pronunciation_pronunciation_service_ts
  file_src_modules_pronunciation_pronunciation_service_ts --> file_src_modules_pronunciation_pronunciation_classifier_service_ts
  file_src_modules_pronunciation_pronunciation_service_ts --> file_src_modules_pronunciation_pronunciation_constants_ts
  file_src_modules_pronunciation_pronunciation_service_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_classical_service_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_classifier_service_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_ecclesiastical_service_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_phonemes_service_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_service_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_src_modules_pronunciation_pronunciation_types_ts
  file_src_modules_pronunciation_pronunciation_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_translations_translations_module_ts --> file_src_modules_translations_translations_service_ts
  file_src_modules_translations_translations_service_ts --> file_src_modules_translations_translations_constants_ts
  file_src_modules_translations_translations_service_unit_test_ts --> file_src_modules_translations_translations_service_ts
  file_src_modules_translations_translations_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_wiktionary_wiktionary_command_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_types_ts
  file_src_modules_wiktionary_wiktionary_command_ts --> file_src_modules_wiktionary_wiktionary_constants_ts
  file_src_modules_wiktionary_wiktionary_command_ts --> file_src_modules_wiktionary_wiktionary_types_ts
  file_src_modules_wiktionary_wiktionary_command_unit_test_ts --> file_src_modules_wiktionary_wiktionary_command_ts
  file_src_modules_wiktionary_wiktionary_command_unit_test_ts --> file_testing_command_harness_ts
  file_src_modules_wiktionary_wiktionary_module_ts --> file_src_modules_wiktionary_wiktionary_command_ts
  file_src_modules_wiktionary_wiktionary_types_ts --> file_src_modules_wiktionary_wiktionary_constants_ts
  file_src_modules_words_words_module_ts --> file_src_modules_words_words_service_ts
  file_src_modules_words_words_service_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_constants_ts
  file_src_modules_words_words_service_unit_test_ts --> file_src_modules_lexico_ingestion_lexico_ingestion_constants_ts
  file_src_modules_words_words_service_unit_test_ts --> file_src_modules_words_words_service_ts
  file_src_modules_words_words_service_unit_test_ts --> file_testing_mocks_ts
  file_src_repl_ts --> file_src_main_module_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-33622-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-138.17_MB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-219-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-155-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-97.05_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-155-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-32-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-7-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-107-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-357-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-3-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-44-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-28-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-61-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-1235-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-515-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-1208-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-542-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-2466-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-790-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-166-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-605-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-1017-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-10-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-195-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-41-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-133-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-108-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-34-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-171-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-21-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-23-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-10-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-20-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-20-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-43-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-1-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1226-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-1865400-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1226-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-8-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-15-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-925006-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-130-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-189-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-3-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-16-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-501-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-17-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-104-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-3-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-4-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
