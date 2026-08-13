import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderingService } from "./rendering.service";

describe(RenderingService, () => {
  let service: RenderingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderingService],
    }).compile();

    service = await module.resolve(RenderingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildNameSubstitutions", () => {
    it("derives every case variant from a kebab-case name", () => {
      expect(service.buildNameSubstitutions("my-widget")).toStrictEqual({
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
      });
    });

    it("normalizes names that arrive in other cases", () => {
      expect(service.buildNameSubstitutions("MyWidget")).toStrictEqual({
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
      });
    });
  });

  describe("renderContent", () => {
    it("substitutes placeholders", () => {
      const rendered = service.renderContent({
        substitutions: { namePascalCase: "MyWidget" },
        templateContent: "export class {{namePascalCase}}Service {}",
      });

      expect(rendered).toBe("export class MyWidgetService {}");
    });

    it("tolerates whitespace inside the placeholder", () => {
      const rendered = service.renderContent({
        substitutions: { name: "widget" },
        templateContent: "a {{ name }} b",
      });

      expect(rendered).toBe("a widget b");
    });

    it("leaves unknown placeholders verbatim so template bugs stay visible", () => {
      const rendered = service.renderContent({
        substitutions: {},
        templateContent: "value: {{missing}}",
      });

      expect(rendered).toBe("value: {{missing}}");
    });

    it("does not run greedily across two adjacent placeholders", () => {
      const rendered = service.renderContent({
        substitutions: { first: "a", second: "b" },
        templateContent: "{{first}}{{second}}",
      });

      expect(rendered).toBe("ab");
    });

    it("substitutes the inner pair of a triple-brace token", () => {
      const rendered = service.renderContent({
        substitutions: { name: "widget" },
        templateContent: "{{{name}}}",
      });

      expect(rendered).toBe("{widget}");
    });
  });

  describe("renderPath", () => {
    it("substitutes path placeholders", () => {
      const rendered = service.renderPath({
        substitutions: { nameKebabCase: "my-widget" },
        templatePath: "__nameKebabCase__.service.ts",
      });

      expect(rendered).toBe("my-widget.service.ts");
    });

    it("substitutes every placeholder in a nested path", () => {
      const rendered = service.renderPath({
        substitutions: { nameKebabCase: "my-widget" },
        templatePath: "src/__nameKebabCase__/__nameKebabCase__.module.ts",
      });

      expect(rendered).toBe("src/my-widget/my-widget.module.ts");
    });

    it("leaves unknown placeholders verbatim", () => {
      const rendered = service.renderPath({
        substitutions: {},
        templatePath: "__missing__.ts",
      });

      expect(rendered).toBe("__missing__.ts");
    });
  });

  it("renders content and paths consistently for one name", () => {
    const substitutions = service.buildNameSubstitutions("my-widget");

    expect(
      service.renderPath({
        substitutions,
        templatePath: "__nameKebabCase__.service.ts",
      }),
    ).toBe("my-widget.service.ts");
    expect(
      service.renderContent({
        substitutions,
        templateContent: "class {{namePascalCase}}Service {}",
      }),
    ).toBe("class MyWidgetService {}");
  });
});
