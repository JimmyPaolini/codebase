import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConfigurationService } from "../configuration/configuration.service";

import { FlagResolutionService } from "./flag-resolution.service";

import type { ResolvedCallidescopeConfiguration } from "../configuration/configuration.types";
import type {
  CallidescopeRunFlags,
  ResolvedRunFlags,
} from "./flag-resolution.types";

// A deliberate misspelling: the example of a `--format` value nobody
// recognizes, which is exactly what these tests are about.
// cspell:ignore markdwon

describe(FlagResolutionService, () => {
  let configurationService: ConfigurationService;
  let service: FlagResolutionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationService, FlagResolutionService],
    }).compile();

    configurationService = await module.resolve(ConfigurationService);
    service = await module.resolve(FlagResolutionService);
  });

  /** A configuration declaring every destination a flag may override. */
  const fullyConfigured = (): ResolvedCallidescopeConfiguration =>
    configurationService.resolveConfiguration({
      directories: ["packages/one"],
      write: {
        json: { indentation: 4, path: "output/report.json" },
        markdown: {
          description: "What the run found.",
          endMarker: "<!-- END -->",
          heading: "## 🔭 Configured",
          path: "docs/report.md",
          startMarker: "<!-- START -->",
        },
      },
    });

  /** A configuration declaring nothing a destination flag could override. */
  const bare = (): ResolvedCallidescopeConfiguration =>
    configurationService.resolveConfiguration({});

  const resolve = (args: {
    configuration?: ResolvedCallidescopeConfiguration | undefined;
    flags: CallidescopeRunFlags;
  }): ResolvedRunFlags =>
    service.resolveRunFlags({
      configuration: args.configuration ?? fullyConfigured(),
      flags: args.flags,
    });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ One case per flag, against the documented precedence rule

  // A flag that selects mode or presentation is command-line only: it never
  // reaches the configuration, because neither can make an under-configured
  // run legal. A flag that changes what a run judges or writes may override a
  // value the configuration already declares, and only that value.
  it.each<{
    expectation: (resolved: ResolvedRunFlags) => void;
    flag: string;
    flags: CallidescopeRunFlags;
  }>([
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        // Mode only. It changes nothing the configuration declares.
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
      },
      flag: "--check, the check selector",
      flags: { check: "depth,reports" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
      },
      flag: "--write, the write switch",
      flags: { write: true },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.format).toBe("mermaid");
        // Presentation only, and never written into the configuration.
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
      },
      flag: "--format, presentation",
      flags: { format: "mermaid" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.directories).toStrictEqual([
          "packages/two",
        ]);
      },
      flag: "--directories, overriding the configured list",
      flags: { directories: ["packages/two"] },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.write.markdown).toStrictEqual({
          ...fullyConfigured().write.markdown,
          path: "docs/elsewhere.md",
        });
      },
      flag: "--markdown, overriding the path and nothing else",
      flags: { markdown: "docs/elsewhere.md" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.write.json).toStrictEqual({
          indentation: 4,
          path: "output/elsewhere.json",
        });
      },
      flag: "--json, overriding the path and nothing else",
      flags: { json: "output/elsewhere.json" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.format).toBe("markdown");
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
      },
      // `--config` chooses the file everything else is resolved against, so
      // it never reaches this call at all: it is neither mode, nor
      // presentation, nor an override of anything a configuration declares.
      flag: "no flags at all, the configuration standing alone",
      flags: {},
    },
  ])("resolves $flag", ({ expectation, flags }) => {
    expectation(resolve({ flags }));
  });

  // 🐛 The four defects

  it("treats an empty directories value as absent rather than as an empty list", () => {
    const resolved = resolve({ flags: { directories: [] } });

    expect(resolved.configuration.directories).toStrictEqual(["packages/one"]);
  });

  it("keeps a configured indentation through a JSON path override", () => {
    const resolved = resolve({ flags: { json: "output/elsewhere.json" } });

    expect(resolved.configuration.write.json?.indentation).toBe(4);
  });

  it("keeps every other markdown property through a path override", () => {
    const resolved = resolve({ flags: { markdown: "docs/elsewhere.md" } });
    const markdown = resolved.configuration.write.markdown;

    expect(markdown?.description).toBe("What the run found.");
    expect(markdown?.endMarker).toBe("<!-- END -->");
    expect(markdown?.heading).toBe("## 🔭 Configured");
    expect(markdown?.startMarker).toBe("<!-- START -->");
  });

  it("carries a configured render hook through a path override", () => {
    const render = (): string => "rendered";
    const configuration = configurationService.resolveConfiguration({
      write: { markdown: { path: "docs/report.md", render } },
    });

    const resolved = resolve({
      configuration,
      flags: { markdown: "docs/elsewhere.md" },
    });

    expect(resolved.configuration.write.markdown?.render).toBe(render);
  });

  it("refuses an unrecognized format rather than rewriting it to markdown", () => {
    const resolved = resolve({ flags: { format: "markdwon" } });

    expect(resolved.errors).toStrictEqual([
      '--format does not accept "markdwon". It takes one of "markdown", "mermaid", "json".',
    ]);
  });

  it("prints in the default format while refusing the one it was given", () => {
    const resolved = resolve({ flags: { format: "markdwon" } });

    expect(resolved.format).toBe("markdown");
  });

  // 🚫 A flag may override a declared value, never supply a missing one

  it.each<[string, CallidescopeRunFlags, string]>([
    ["--json", { json: "output/report.json" }, "write.json"],
    ["--markdown", { markdown: "docs/report.md" }, "write.markdown"],
  ])(
    "refuses %s when the configuration declares no such destination",
    (flag, flags, field) => {
      const resolved = resolve({ configuration: bare(), flags });

      expect(resolved.errors).toStrictEqual([
        `${flag} overrides a destination the configuration does not declare. ` +
          `Add \`${field}\` to the configuration this run reads, then use ${flag} to send it somewhere else.`,
      ]);
    },
  );

  it("leaves an undeclared destination undeclared rather than inventing one", () => {
    const resolved = resolve({
      configuration: bare(),
      flags: { json: "output/report.json" },
    });

    expect(resolved.configuration.write.json).toBeUndefined();
  });

  it("collects every complaint before reporting any of them", () => {
    const resolved = resolve({
      configuration: bare(),
      flags: { format: "yaml", json: "output/report.json" },
    });

    expect(resolved.errors).toHaveLength(2);
  });
});
