# Structural interface

**`provider.ingest(document)` → `FilesystemProviderService.ingest`**

Two things make this hard for anything that indexes by name:

- `FilesystemProviderService` never writes `implements StructuralProvider`.
- `ingest` is a readonly **property holding an arrow**, not a method signature.

That is the shape this repository actually writes, and a nominal-only index
finds none of it. Callidescope expands the interface member to every class whose
instance type satisfies the declaring type — so structural matching is not an
optional refinement, it is the only thing that works here.

```text
🚀 StructuralInterfaceService.ingestDocument(…): number
  └─> FilesystemProviderService.ingest(document: string): number
```

Expansion is capped: see [`implementation-fan-out`](../implementation-fan-out).
