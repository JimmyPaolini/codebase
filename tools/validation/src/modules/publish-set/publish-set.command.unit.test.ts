import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { mockProcessExit } from "../../../testing/mocks";

import { PublishSetCommand } from "./publish-set.command";
import { formatPublishSetSuccessMessage } from "./publish-set.constants";
import { PublishSetService } from "./publish-set.service";

describe(PublishSetCommand, () => {
  let command: PublishSetCommand;
  let service: PublishSetService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishSetCommand,
        {
          provide: PublishSetService,
          useValue: createMock<PublishSetService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PublishSetCommand);
    service = await module.resolve(PublishSetService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        PublishSetCommand,
        {
          provide: PublishSetService,
          useValue: createMock<PublishSetService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("PublishSetCommand");
  });

  it("logs success message when verification succeeds", async () => {
    expect.hasAssertions();

    vi.mocked(service.verifyPublishSet).mockReturnValue({
      binaryCount: 4,
      messages: [],
      packageCount: 28,
      succeeded: true,
    });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await command.run();

    expect(infoSpy).toHaveBeenCalledWith(formatPublishSetSuccessMessage(28, 4));
  });

  it("logs error messages and exits with code 1 when verification fails", async () => {
    expect.hasAssertions();

    vi.mocked(service.verifyPublishSet).mockReturnValue({
      binaryCount: 0,
      messages: ["Error 1"],
      packageCount: 0,
      succeeded: false,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(errorSpy).toHaveBeenCalledWith("Error 1");
  });
});
