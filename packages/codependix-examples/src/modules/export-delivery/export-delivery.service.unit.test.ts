import { AnchorsModule, DeliveryModule } from "@codependix/cli";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import { SAMPLE_DIAGRAM } from "./export-delivery.constants";
import { ExportDeliveryService } from "./export-delivery.service";

describe(ExportDeliveryService, () => {
  let service: ExportDeliveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LoggerModule, AnchorsModule, DeliveryModule],
      providers: [ExportDeliveryService],
    }).compile();

    service = await module.resolve(ExportDeliveryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("export targets", () => {
    it("writes nothing at all for a none target", () => {
      expect.hasAssertions();

      const sections = service.buildTargetSections();

      expect(sections[0]?.heading).toBe('`target: "none"`');
      expect(sections[0]?.body).toContain("(nothing written)");
    });

    it("writes the JSON destination for a both target", () => {
      expect.hasAssertions();
      expect(service.buildTargetSections().at(-1)?.body).toContain(
        "codependix-nx-graph.json",
      );
    });
  });

  describe("deliverUnwrittenJson", () => {
    it("leaves a configured JSON destination unwritten under a markdown target", () => {
      expect.hasAssertions();
      expect(service.deliverUnwrittenJson()).toStrictEqual(["README.md"]);
    });
  });

  describe("deliver", () => {
    it("reports a current export as current and a drifted one as stale", () => {
      expect.hasAssertions();

      const project = service.createScratchProject();

      service.deliver({ content: SAMPLE_DIAGRAM, mode: "write", project });

      expect(
        service.deliver({ content: SAMPLE_DIAGRAM, mode: "check", project })
          .isCurrent,
      ).toBe(true);
      expect(
        service.deliver({ content: "_moved_", mode: "check", project })
          .stalePaths,
      ).toStrictEqual(["README.md"]);
    });
  });

  describe("build", () => {
    it("builds the target, mode, and JSON documents", () => {
      expect.hasAssertions();
      expect(service.build().map((document) => document.id)).toStrictEqual([
        "10-export-targets",
        "13-check-and-write",
        "15-json-exports",
      ]);
    });
  });
});
