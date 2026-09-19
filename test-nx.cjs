require('@swc-node/register');
try {
  require('./packages/ic-suite/conformetry/conformetry-nx/src/index.ts');
  console.log("conformetry-nx loaded successfully");
} catch (e) {
  console.error("conformetry-nx error:", e);
}
try {
  require('./packages/ic-suite/callidescope/callidescope-nx/src/index.ts');
  console.log("callidescope-nx loaded successfully");
} catch (e) {
  console.error("callidescope-nx error:", e);
}
