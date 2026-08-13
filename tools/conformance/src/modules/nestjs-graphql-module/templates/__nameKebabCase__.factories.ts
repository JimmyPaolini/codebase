import { faker } from "@faker-js/faker";
import { Factory } from "fishery";

import {
  Create{{namePascalCase}}Input,
  Delete{{namePascalCase}}Input,
  Find{{namePascalCase}}Args,
  Update{{namePascalCase}}Input,
} from "./{{nameKebabCase}}.entities";

// 📥 Inputs

export const create{{namePascalCase}}InputFactory = Factory.define<Create{{namePascalCase}}Input>(
  () => ({
    _placeholder: undefined as never,
  }),
);

export const update{{namePascalCase}}InputFactory = Factory.define<Update{{namePascalCase}}Input>(
  () => ({
    _placeholder: undefined as never,
  }),
);

export const delete{{namePascalCase}}InputFactory = Factory.define<Delete{{namePascalCase}}Input>(
  () => ({
    _placeholder: undefined as never,
  }),
);

// ⚙️ Args

export const find{{namePascalCase}}ArgsFactory = Factory.define<Find{{namePascalCase}}Args>(
  () => ({
    first: faker.number.int({ max: 50, min: 1 }),
    after: undefined,
    last: undefined,
    before: undefined,
  }),
);
