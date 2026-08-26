import path from "node:path";

import { TypescriptService } from "@codependix/imports";
import { Injectable } from "@nestjs/common";

import { resolveFixture } from "../../constants";

import {
  BROKEN_FIXTURE,
  NON_EDGE_CASES,
  RESOLUTION_FIXTURE,
  TYPESCRIPT_FIXTURES_SEGMENT,
} from "./typescript-imports.constants";

import type { ExampleDocument } from "../examples/examples.types";
import type {
  FixtureProgramOutcome,
  NonEdgeCase,
} from "./typescript-imports.types";
import type {
  TypescriptImportGraph,
  TypescriptProject,
} from "@codependix/imports";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Builds the TypeScript file-level import graph examples.
 *
 * Every specifier goes through `ts.resolveModuleName`, called with the exact
 * compiler options and host the project's own `tsconfig.json` produced — the
 * compiler's own module resolution rather than a path heuristic. That is what
 * makes a NodeNext `.js` specifier land on the `.ts` file it names, a
 * `tsconfig.json` path alias resolve the way `tsc` resolves it, and an
 * `extends` chain to a shared base config be followed.
 *
 * The deliberate non-cases matter as much: only `ts.isImportDeclaration` with
 * a string-literal specifier counts, so a re-export, a dynamic `import()`, and
 * a `require` all produce nothing. Those are the ones a reader guesses wrong,
 * and a resolver change could silently reverse any of them — which is why they
 * are rendered rather than described.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptImportsService {
  // 🏗 Dependency Injection

  constructor(private readonly typescriptService: TypescriptService) {}

  // 🔐 Private Fields

  /**
   * Graphs already built, keyed by the project root they were built from.
   *
   * `ts.createProgram` parses the whole default library before it resolves a
   * single specifier, and every example and every test asks for the same two
   * fixture projects repeatedly. Nothing under `fixtures/` changes while the
   * process runs, so the second request is answered from here — which is what
   * keeps a shared CI runner from spending that parse a dozen times over.
   */
  private readonly graphsByRoot = new Map<string, TypescriptImportGraph>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders the non-edge cases as a table the guide can quote. */
  private renderNonEdgeCases(): string {
    const rows = NON_EDGE_CASES.map(
      (nonEdgeCase: NonEdgeCase) =>
        `| \`${nonEdgeCase.file}\` | \`${nonEdgeCase.statement}\` | ${nonEdgeCase.reason} |`,
    );

    return [
      "| File | Statement | Why no edge |",
      "| ---- | --------- | ----------- |",
      ...rows,
    ].join("\n");
  }

  // 🌎 Public Methods

  /** Builds every TypeScript import-graph example document. */
  build(): ExampleDocument[] {
    const graph = this.buildFixtureGraph(RESOLUTION_FIXTURE);

    return [
      {
        id: "06-typescript-resolution",
        jsonExports: [],
        sections: [
          {
            body: this.renderFixture(RESOLUTION_FIXTURE),
            heading: "The resolved graph",
            note: "`src/index.ts` reaches `src/catalog.ts` through a NodeNext `.js` specifier, and `src/catalog.ts` reaches `src/settings.ts` through the `@atlas/*` path alias declared in a `tsconfig.json` that extends a shared base config.",
          },
          {
            body: `\`\`\`text\n${graph.fileNames.join("\n")}\n\`\`\``,
            heading: "Every file the graph knows",
            note: "`src/ambient.d.ts` is a root file of the program and never a node: declaration files are filtered out before the graph is built.",
          },
          {
            body: this.renderNonEdgeCases(),
            heading: "The statements that deliberately draw no edge",
            note: "Every one of these is a choice rather than a gap, and every one is a claim a resolver change could silently reverse.",
          },
          {
            body: `\`\`\`text\n${this.describeOutcome(this.buildOutcome(BROKEN_FIXTURE))}\n\`\`\``,
            heading: "A project whose `tsconfig.json` cannot be parsed",
            note: "`TypescriptProjectConfigurationError` carries the compiler's own diagnostics. Parsing failures are fatal rather than skipped, because a project silently dropped makes `--check` unable to tell a genuinely empty graph from one it never built.",
          },
        ],
        summary:
          "TypeScript imports resolve through the compiler, not through a heuristic — and only an import declaration with a string-literal specifier counts.",
        title: "6. Imports resolve through the compiler",
      },
    ];
  }

  /** Builds one fixture project's import graph. */
  buildFixtureGraph(fixtureName: string): TypescriptImportGraph {
    return this.buildGraphAt(
      resolveFixture(TYPESCRIPT_FIXTURES_SEGMENT, fixtureName),
    );
  }

  /** Builds one project's import graph, given its root on disk. */
  buildGraphAt(absoluteRoot: string): TypescriptImportGraph {
    const cached = this.graphsByRoot.get(absoluteRoot);

    if (cached !== undefined) return cached;

    const graph = this.typescriptService.buildGraph(
      this.typescriptService.buildProgram(this.describeProjectAt(absoluteRoot)),
    );

    this.graphsByRoot.set(absoluteRoot, graph);

    return graph;
  }

  /** Builds a fixture's program, reporting a configuration failure rather than raising. */
  buildOutcome(fixtureName: string): FixtureProgramOutcome {
    try {
      return {
        fileCount: this.buildFixtureGraph(fixtureName).fileNames.length,
        outcome: "built",
      };
    } catch (error) {
      return {
        error: this.redactPath(this.describeError(error)),
        outcome: "failed",
      };
    }
  }

  /** Describes a raised value, whether or not it was an `Error`. */
  describeError(error: unknown): string {
    return error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  }

  /** Reports an outcome as the one line a run would log for it. */
  describeOutcome(outcome: FixtureProgramOutcome): string {
    return outcome.outcome === "built"
      ? `built — ${outcome.fileCount} file(s)`
      : outcome.error;
  }

  /**
   * Describes a project through the real discovery entry point.
   *
   * `TypescriptService.discoverProjects` reads no Nx tag — every project
   * carrying its own `tsconfig.json` is a candidate, since a file-level import
   * graph is meaningful for any TypeScript project.
   */
  describeProjectAt(absoluteRoot: string): TypescriptProject {
    const [project] = this.typescriptService.discoverProjects([
      { absoluteRoot, name: path.basename(absoluteRoot) },
    ]);

    if (project === undefined) {
      throw new Error(`No tsconfig.json under ${absoluteRoot}`);
    }

    return project;
  }

  /**
   * Replaces an absolute path with a repository-relative one.
   *
   * The compiler reports diagnostics against the real file it read, so a
   * committed example carrying the absolute path of whichever machine rendered
   * it would fail `examples --check` everywhere else.
   */
  redactPath(message: string): string {
    return message.replaceAll(
      resolveFixture(TYPESCRIPT_FIXTURES_SEGMENT),
      "<fixtures>/typescript",
    );
  }

  /** Renders one project's import graph, given its root on disk. */
  renderAt(absoluteRoot: string): string {
    return this.typescriptService.renderMermaid(
      this.buildGraphAt(absoluteRoot),
    );
  }

  /** Renders one fixture project's import graph as a mermaid diagram. */
  renderFixture(fixtureName: string): string {
    return this.typescriptService.renderMermaid(
      this.buildFixtureGraph(fixtureName),
    );
  }
}
