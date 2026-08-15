// Nx loads this plugin through CommonJS, so the TypeScript sources are
// registered here. @swc-node is used rather than tsx because esbuild does not
// emit `design:paramtypes`, and without that metadata every NestJS constructor
// injection in this package resolves to `undefined` at runtime.
require("@swc-node/register/register");

module.exports = require("./index.ts");
