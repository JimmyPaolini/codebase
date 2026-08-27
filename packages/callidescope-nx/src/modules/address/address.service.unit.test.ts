import { AddressLookupService, AddressReportService } from "@callidescope/cli";
import { AddressDepthService, BreadthService } from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AddressService } from "./address.service";

import type { LookupAddressOutcome } from "@callidescope/cli";
import type { CallableId } from "@callidescope/configuration";
import type { DiscoveredCallable } from "@callidescope/graph";

/** The address every test looks up. */
const ADDRESS = "src/foo.service.ts#FooService.bar";

describe(AddressService, () => {
  let addressDepthService: ReturnType<typeof createMock<AddressDepthService>>;
  let addressLookupService: ReturnType<typeof createMock<AddressLookupService>>;
  let addressReportService: ReturnType<typeof createMock<AddressReportService>>;
  let breadthService: ReturnType<typeof createMock<BreadthService>>;
  let service: AddressService;

  beforeAll(async () => {
    addressDepthService = createMock<AddressDepthService>();
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    breadthService = createMock<BreadthService>();

    const module = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: AddressDepthService, useValue: addressDepthService },
        { provide: AddressLookupService, useValue: addressLookupService },
        { provide: AddressReportService, useValue: addressReportService },
        { provide: BreadthService, useValue: breadthService },
      ],
    }).compile();

    service = await module.resolve(AddressService);
  });

  /** Stubs a lookup that resolved, holding one traced callable. */
  function stubResolved(): void {
    addressLookupService.lookup.mockResolvedValue(
      createMock<LookupAddressOutcome>({
        located: {
          callablesById: new Map<CallableId, DiscoveredCallable>([
            ["id", createMock<DiscoveredCallable>()],
          ]),
        },
        resolution: { id: "id", kind: "resolved" },
      }),
    );
    addressLookupService.describeProblem.mockReturnValue(undefined);
    addressReportService.renderDepth.mockReturnValue("# Depth");
    addressReportService.renderBreadth.mockReturnValue("# Breadth");
  }

  beforeEach(() => {
    stubResolved();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("resolves the address against the directories it was given, never prompting", async () => {
    expect.hasAssertions();

    await service.runDepth({
      address: ADDRESS,
      directories: ["packages/alpha"],
    });

    // A task runner has nobody to prompt, so the lookup must never try.
    expect(addressLookupService.lookup).toHaveBeenCalledWith({
      address: ADDRESS,
      options: { directories: ["packages/alpha"], interactive: false },
    });
  });

  it("passes a configuration path and format through to the lookup", async () => {
    expect.hasAssertions();

    await service.runDepth({
      address: ADDRESS,
      configurationPath: "elsewhere.ts",
      directories: ["packages/alpha"],
      format: "json",
    });

    expect(addressLookupService.lookup).toHaveBeenCalledWith({
      address: ADDRESS,
      options: {
        config: "elsewhere.ts",
        directories: ["packages/alpha"],
        format: "json",
        interactive: false,
      },
    });
  });

  describe("runDepth", () => {
    it("renders the stacks above and below the callable", async () => {
      expect.hasAssertions();

      await expect(
        service.runDepth({ address: ADDRESS, directories: ["packages/alpha"] }),
      ).resolves.toStrictEqual({ ok: true, report: "# Depth" });
      expect(addressDepthService.buildUpwardStacks).toHaveBeenCalledTimes(1);
      expect(addressDepthService.buildDownwardStacks).toHaveBeenCalledTimes(1);
    });

    it("reports the reason an address could not be resolved", async () => {
      expect.hasAssertions();

      addressLookupService.describeProblem.mockReturnValue(
        "No callable matches it.",
      );

      // Returned rather than thrown or logged: the executor's product is what
      // it writes, and a reader wants the reason where the report would be.
      await expect(
        service.runDepth({ address: ADDRESS, directories: ["packages/alpha"] }),
      ).resolves.toStrictEqual({
        ok: false,
        report: "No callable matches it.",
      });
    });

    it("reports an address that resolved to nothing without a stated problem", async () => {
      expect.hasAssertions();

      addressLookupService.lookup.mockResolvedValue(
        createMock<LookupAddressOutcome>({ resolution: { kind: "not-found" } }),
      );
      addressLookupService.describeProblem.mockReturnValue(undefined);

      await expect(
        service.runDepth({ address: ADDRESS, directories: ["packages/alpha"] }),
      ).resolves.toMatchObject({ ok: false });
    });
  });

  describe("runBreadth", () => {
    it("renders the callable's direct callers and callees", async () => {
      expect.hasAssertions();

      await expect(
        service.runBreadth({
          address: ADDRESS,
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Breadth" });
      expect(breadthService.describeDirectCalls).toHaveBeenCalledTimes(1);
    });

    it("refuses an address that resolved to a callable nothing traced", async () => {
      expect.hasAssertions();

      addressLookupService.lookup.mockResolvedValue(
        createMock<LookupAddressOutcome>({
          located: { callablesById: new Map() },
          resolution: { id: "id", kind: "resolved" },
        }),
      );

      await expect(
        service.runBreadth({
          address: ADDRESS,
          directories: ["packages/alpha"],
        }),
      ).resolves.toMatchObject({ ok: false });
    });

    it("reports the reason an address could not be resolved", async () => {
      expect.hasAssertions();

      addressLookupService.describeProblem.mockReturnValue("Ambiguous.");

      await expect(
        service.runBreadth({
          address: ADDRESS,
          directories: ["packages/alpha"],
        }),
      ).resolves.toStrictEqual({ ok: false, report: "Ambiguous." });
    });
  });
});
