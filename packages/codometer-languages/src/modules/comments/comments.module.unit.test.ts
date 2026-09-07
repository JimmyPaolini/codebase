import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { CommentsModule } from "./comments.module";
import { CommentsService } from "./comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { LanguageCommentsService } from "./language-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

describe(CommentsModule, () => {
  it("provides every comment reader and the service that measures them", async () => {
    const module = await Test.createTestingModule({
      imports: [CommentsModule],
    }).compile();

    await expect(module.resolve(CommentsService)).resolves.toBeDefined();
    await expect(module.resolve(HashCommentsService)).resolves.toBeDefined();
    await expect(
      module.resolve(LanguageCommentsService),
    ).resolves.toBeDefined();
    await expect(module.resolve(YamlCommentsService)).resolves.toBeDefined();
  });
});
