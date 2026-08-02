<!-- 📄 Text -->

Delete the `plugin.ts` files in the language validator packages, and instead allow `conformetry-validation` to directly import the NestJS module from each of the language validator packages. Additional files like `packages/*/src/plugin.ts` should not be allowed by the ESLint project structure rules, please update that to tighten the project structure restrictions.
Update the `conformetry-nx` folder `modules` to use `nestjs-service-module` and `nestjs-service-file` generators rather than the free-form file structures they currently have, and update the `.service.ts` files there to follow the lint rules that it should only contain the service class and all logic is in that class as methods and fields.
