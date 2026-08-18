import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
} from "../../../testing/programs";

import { AnnotationsService } from "./annotations.service";

import type { ReadAnnotationsArguments } from "./annotations.types";
import type {
  CallableDocumentation,
  CallableSignature,
} from "@callidescope/configuration";

/** Builds the arguments for one named callable in an in-memory file. */
function readArguments(args: {
  displayName: string;
  source: string;
}): ReadAnnotationsArguments {
  const projectProgram = buildFixtureProgram({
    "packages/example/src/modules/a/a.service.ts": args.source,
  });
  const services = buildFixtureServices({ projectProgram });
  const callable = [
    ...collectFixtureCallables({ projectProgram, services }).byId.values(),
  ].find((candidate) => candidate.node.displayName === args.displayName);

  if (callable === undefined) {
    throw new Error(`No callable named ${args.displayName}`);
  }

  return {
    checker: projectProgram.checker,
    declaration: callable.declaration,
  };
}

describe(AnnotationsService, () => {
  let service: AnnotationsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [AnnotationsService],
    }).compile();

    service = await module.resolve(AnnotationsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  /** Reads the documentation of one named callable. */
  function readDocumentation(args: {
    displayName: string;
    source: string;
  }): CallableDocumentation | undefined {
    return service.readDocumentation(readArguments(args));
  }

  /** Reads the signature of one named callable. */
  function readSignature(args: {
    displayName: string;
    source: string;
  }): CallableSignature | undefined {
    return service.readSignature(readArguments(args));
  }

  // 📖 Documentation

  it("reads the summary of a documented function", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source: "/** Does the thing. */\nexport function entry(): void {}",
      }),
    ).toStrictEqual({
      isDeprecated: false,
      summary: "Does the thing.",
      tags: [],
    });
  });

  it("reads the summary of a documented method", () => {
    expect(
      readDocumentation({
        displayName: "Service.load",
        source:
          "export class Service {\n  /** Loads it. */\n  public load(): void {}\n}",
      })?.summary,
    ).toBe("Loads it.");
  });

  it("finds the comment above an arrow-typed property", () => {
    // The comment sits on the property; the graph's node is the arrow.
    expect(
      readDocumentation({
        displayName: "Service.load",
        source:
          "export class Service {\n  /** Loads it. */\n  public load = (): void => {};\n}",
      })?.summary,
    ).toBe("Loads it.");
  });

  it("finds the comment above a variable-assigned arrow", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source: "/** Does the thing. */\nexport const entry = (): void => {};",
      })?.summary,
    ).toBe("Does the thing.");
  });

  it("finds the comment above an object literal method", () => {
    expect(
      readDocumentation({
        displayName: "load",
        source:
          "export const handlers = {\n  /** Loads it. */\n  load: (): void => {},\n};",
      })?.summary,
    ).toBe("Loads it.");
  });

  it("finds the comment on an overload signature", () => {
    // The graph points at the implementation, which carries no comment of its
    // own — only the signature above it does.
    expect(
      readDocumentation({
        displayName: "entry",
        source: `
          /** Handles either shape. */
          export function entry(value: string): void;
          export function entry(value: number): void;
          export function entry(value: unknown): void { void value; }
        `,
      })?.summary,
    ).toBe("Handles either shape.");
  });

  it("collapses a multi-line comment onto one line", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/**\n * First line.\n * Second line.\n */\nexport function entry(): void {}",
      })?.summary,
    ).toBe("First line. Second line.");
  });

  it("cuts a very long summary short", () => {
    const summary = readDocumentation({
      displayName: "entry",
      source: `/** ${"word ".repeat(60)} */\nexport function entry(): void {}`,
    })?.summary;

    expect(summary?.length).toBeLessThanOrEqual(121);
    expect(summary?.endsWith("…")).toBe(true);
  });

  it("records the tags a comment carries", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/**\n * Does it.\n * @returns nothing\n * @see somewhere\n */\nexport function entry(): void {}",
      })?.tags,
    ).toStrictEqual(["returns", "see"]);
  });

  it("marks a deprecated callable even with no prose", () => {
    // A comment that is nothing but `@deprecated` leaves the summary empty, so
    // the tags cannot be inferred from whether there was anything to read.
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/** @deprecated use other */\nexport function entry(): void {}",
      }),
    ).toStrictEqual({
      isDeprecated: true,
      summary: "",
      tags: ["deprecated"],
    });
  });

  it("records a repeated tag once", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source:
          "/**\n * @throws when one fails\n * @throws when two fails\n */\nexport function entry(): void {}",
      })?.tags,
    ).toStrictEqual(["throws"]);
  });

  it("reads nothing for an undocumented callable", () => {
    expect(
      readDocumentation({
        displayName: "entry",
        source: "export function entry(): void {}",
      }),
    ).toBeUndefined();
  });

  it("reads nothing for an anonymous callback", () => {
    expect(
      readDocumentation({
        displayName: "each(…)",
        source: `
          function each(callback: () => void): void { callback(); }
          export function entry(): void { each(() => {}); }
        `,
      }),
    ).toBeUndefined();
  });

  // ✍️ Signatures

  it("reads the parameters and return type of a function", () => {
    const signature = readSignature({
      displayName: "entry",
      source:
        "export function entry(value: string): number { void value; return 1; }",
    });

    expect(signature?.parameters).toStrictEqual([
      { isOptional: false, isRest: false, name: "value", type: "string" },
    ]);
    expect(signature?.returnType).toBe("number");
  });

  it("renders the whole signature on one line", () => {
    expect(
      readSignature({
        displayName: "entry",
        source:
          "export function entry(value: string): number { void value; return 1; }",
      })?.text,
    ).toBe("(value: string): number");
  });

  it("marks a parameter with a question mark as optional", () => {
    expect(
      readSignature({
        displayName: "entry",
        source: "export function entry(value?: string): void { void value; }",
      })?.parameters[0]?.isOptional,
    ).toBe(true);
  });

  it("marks a parameter with a default as optional", () => {
    expect(
      readSignature({
        displayName: "entry",
        source: "export function entry(value = 3): void { void value; }",
      })?.parameters[0]?.isOptional,
    ).toBe(true);
  });

  it("marks a rest parameter", () => {
    expect(
      readSignature({
        displayName: "entry",
        source:
          "export function entry(...values: string[]): void { void values; }",
      })?.parameters[0]?.isRest,
    ).toBe(true);
  });

  it("reads a constructor's parameters", () => {
    expect(
      readSignature({
        displayName: "Service.constructor",
        source:
          "export class Service {\n  constructor(private readonly value: string) {}\n  public use(): void { void this.value; }\n}",
      })?.parameters[0]?.name,
    ).toBe("value");
  });

  it("reads an accessor's return type", () => {
    expect(
      readSignature({
        displayName: "Service.get value",
        source:
          "export class Service {\n  public get value(): number { return 1; }\n}",
      })?.returnType,
    ).toBe("number");
  });

  it("reads an arrow property's signature", () => {
    expect(
      readSignature({
        displayName: "Service.load",
        source:
          "export class Service {\n  public load = (value: number): string => String(value);\n}",
      })?.text,
    ).toBe("(value: number): string");
  });

  it("reads a callback's contextual signature", () => {
    // The literal declares no types at all; the checker supplies them from the
    // parameter it was passed to, which is what makes a callback frame useful.
    expect(
      readSignature({
        displayName: "each(…)",
        source: `
          function each(callback: (item: string) => boolean): void { void callback("a"); }
          export function entry(): void { each((item) => item.length > 0); }
        `,
      })?.text,
    ).toBe("(item: string): boolean");
  });

  it("renders a destructured parameter as it was written", () => {
    expect(
      readSignature({
        displayName: "entry",
        source:
          "export function entry({ alpha }: { alpha: string }): void { void alpha; }",
      })?.text,
    ).toContain("{ alpha }");
  });
});
