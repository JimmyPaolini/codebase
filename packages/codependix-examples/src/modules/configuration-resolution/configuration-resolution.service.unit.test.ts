import {
  codependixConfigurationSchema,
  ConfigurationModule,
} from "@codependix/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ABSENT_FIXTURE,
  MISSING_CONFIGURATION_FILE,
  PRECEDENCE_FIXTURE,
  UNKNOWN_FIELDS_FIXTURE,
  UNSUPPORTED_TYPE_FIXTURE,
} from "./configuration-resolution.constants";
import { ConfigurationResolutionService } from "./configuration-resolution.service";

describe(ConfigurationResolutionService, () => {
  let service: ConfigurationResolutionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [ConfigurationResolutionService],
    }).compile();

    service = await module.resolve(ConfigurationResolutionService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("configuration discovery", () => {
    it("prefers the TypeScript configuration file over the JSON one beside it", async () => {
      expect.hasAssertions();

      const configuration = await service.loadFixture(PRECEDENCE_FIXTURE);

      expect(configuration.defaults.nx?.markdown?.anchor).toBe("example-nx");
    });

    it("resolves every graph to none when no configuration file exists", async () => {
      expect.hasAssertions();

      const configuration = await service.loadFixture(ABSENT_FIXTURE);

      expect(configuration.defaults).toStrictEqual({});
    });

    it("strips a field codependix has no opinion about", async () => {
      expect.hasAssertions();

      const configuration = await service.loadFixture(UNKNOWN_FIELDS_FIXTURE);

      expect(configuration).not.toHaveProperty("graphqlSchemas");
      expect(configuration.defaults.nx?.target).toBe("markdown");
    });
  });

  describe("path refusals", () => {
    it("refuses an explicitly named configuration file that does not exist", async () => {
      expect.hasAssertions();
      await expect(
        service.describeLoadRefusal(
          `${ABSENT_FIXTURE}/${MISSING_CONFIGURATION_FILE}`,
        ),
      ).resolves.toContain("ConfigurationFileNotFoundError");
    });

    it("refuses a configuration file the loader cannot read", async () => {
      expect.hasAssertions();
      await expect(
        service.describeLoadRefusal(
          `${UNSUPPORTED_TYPE_FIXTURE}/codependix.config.yaml`,
        ),
      ).resolves.toContain("UnknownConfigurationFileTypeError");
    });

    it("keeps an absolute path out of the committed message", async () => {
      expect.hasAssertions();
      await expect(
        service.describeLoadRefusal(
          `${ABSENT_FIXTURE}/${MISSING_CONFIGURATION_FILE}`,
        ),
      ).resolves.toContain("<fixtures>/configuration");
    });
  });

  describe("buildParseRefusalSections", () => {
    it("refuses every configuration the schema rejects", () => {
      expect.hasAssertions();

      const sections = service.buildParseRefusalSections();

      expect(sections).toHaveLength(5);

      for (const section of sections) {
        expect(section.body).not.toContain("accepted");
      }
    });
  });

  describe("describeDestination", () => {
    it("names a standalone Markdown destination, which carries no anchor", () => {
      expect.hasAssertions();
      expect(
        service.describeDestination({
          json: undefined,
          markdown: { anchor: undefined, path: "docs/graph.md" },
        }),
      ).toBe("markdown `docs/graph.md`");
    });

    it("names both destinations when a target writes both", () => {
      expect.hasAssertions();
      expect(
        service.describeDestination({
          json: { path: "graph.json" },
          markdown: { anchor: "example-nx", path: "README.md" },
        }),
      ).toBe("json `graph.json`, markdown `README.md` anchor `example-nx`");
    });
  });

  describe("describeIssues", () => {
    it("lists every validation message a refused configuration produced", () => {
      expect.hasAssertions();
      expect(
        service.describeIssues(
          codependixConfigurationSchema.safeParse({
            defaults: { nx: { target: "both" } },
          }).error,
        ),
      ).toContain("needs a json destination");
    });

    it("falls back to describing anything that was not a validation error", () => {
      expect.hasAssertions();
      expect(service.describeIssues(new TypeError("unreadable"))).toBe(
        "TypeError: unreadable",
      );
      expect(service.describeIssues("unreadable")).toBe("unreadable");
    });
  });

  describe("build", () => {
    it("builds the resolution and refusal documents", async () => {
      expect.hasAssertions();

      const documents = await service.build();

      expect(documents.map((document) => document.id)).toStrictEqual([
        "08-configuration-resolution",
        "14-refusals",
      ]);
    });
  });
});
