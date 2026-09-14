import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import { HardcodedMeandersService } from "../hardcoded-meanders/hardcoded-meanders.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawCommand } from "./draw.command";

import type { Meander } from "../meander-database/entities/Meander.entity";

/**
 * Covers what `DrawCommand` decides rather than what it produces: which of
 * its two modes an option set selects, and how each flag is parsed.
 *
 * Everything the command actually writes is asserted against a real database
 * instead — `draw-sweep.command.integration.test.ts` for the sweep and
 * `draw.command.integration.test.ts` for the `--code` path — per spec #813's
 * Testing Decisions. This file used to mock `node:fs/promises` and assert on
 * the `output/<family>` tree the per-family procedural pipeline wrote; there
 * is no tree left to assert on, and a persisted row is a better witness than
 * an intercepted write ever was.
 */
describe(DrawCommand, () => {
  let command: DrawCommand;
  let draw: Mock<() => Promise<Meander>>;
  let ingest: Mock<() => Promise<Meander[]>>;
  let sweep: Mock<() => Promise<number>>;

  beforeAll(async () => {
    draw = vi
      .fn<() => Promise<Meander>>()
      .mockResolvedValue(createMock<Meander>({ id: 1 }));
    ingest = vi.fn<() => Promise<Meander[]>>().mockResolvedValue([]);
    sweep = vi.fn<() => Promise<number>>().mockResolvedValue(30_279);

    const module = await Test.createTestingModule({
      providers: [
        DrawCommand,
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>({ draw }),
        },
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>({ sweep }),
        },
        {
          provide: HardcodedMeandersService,
          useValue: createMock<HardcodedMeandersService>({ ingest }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(DrawCommand);
  });

  beforeEach(() => {
    draw.mockClear();
    ingest.mockClear();
    sweep.mockClear();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCommand,
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>(),
        },
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: HardcodedMeandersService,
          useValue: createMock<HardcodedMeandersService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(DrawCommand);

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DrawCommand");
  });

  it("sweeps both halves of the corpus when no Code is named", async () => {
    await command.run([], {});

    expect(sweep).toHaveBeenCalledTimes(1);
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(draw).not.toHaveBeenCalled();
  });

  it("enumerates before ingesting, so a hardcoded collision is refused rather than overwriting", async () => {
    await command.run([], {});

    const [enumerated] = sweep.mock.invocationCallOrder;
    const [hardcoded] = ingest.mock.invocationCallOrder;

    expect(enumerated).toBeLessThan(hardcoded ?? 0);
  });

  it("draws the one meander a Code names, sweeping nothing", async () => {
    await command.run([], { code: "3c9a", columns: 2, rows: 3 });

    expect(draw).toHaveBeenCalledWith({ code: "3c9a", columns: 2, rows: 3 });
    expect(sweep).not.toHaveBeenCalled();
  });

  it("refuses a Code given without both --rows and --columns", async () => {
    await expect(command.run([], { code: "0", rows: 2 })).rejects.toThrow(
      /needs both --rows and --columns/,
    );
    await expect(command.run([], { code: "0", columns: 1 })).rejects.toThrow(
      /needs both --rows and --columns/,
    );
    expect(draw).not.toHaveBeenCalled();
  });

  it("parses each option the command still takes", () => {
    expect(command.parseCode("3c9a")).toBe("3c9a");
    expect(command.parseColumns("2")).toBe(2);
    expect(command.parseRows("3")).toBe(3);
  });
});
