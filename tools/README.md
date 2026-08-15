# Tools - Nx Workspace Utilities

This directory contains Nx plugins and workspace helpers for the codebase.

## Available Generators

### Conformetry (`@conformetry/nx`)

**Purpose:** Generate React components and other scaffolded modules with the conformetry package ecosystem.

**Quick Start:**

```bash
pnpm nx run codebase:conformetry-generate -- --help
pnpm nx generate conformetry:react-component --name=Button
```

**Features:**

- React component with TypeScript
- Vitest test file
- Auto-formatted code
- Codebase conventions

**Example Usage:**

```bash
# Basic component
pnpm nx generate conformetry:react-component --name=Button

# With custom directory
pnpm nx generate conformetry:react-component \
  --name=FormInput \
  --directory=src/components/form
```

## Adding New Generators

To add more generators to this workspace:

1. Create a new conformetry generator package under `packages/`
2. Follow the runtime contracts in `packages/conformetry-generation`
3. Register the generator in `configuration/conformetry.config.ts`
4. Expose it through `packages/conformetry-nx`
5. Build and test

## Project Structure

```text
packages/
├── conformetry/
├── conformetry-generation/
├── conformetry-validation/
├── conformetry-nx/
└── conformetry-configuration/
```

## Building Generators

```bash
pnpm nx run conformetry-nx:build
```

## Best Practices

1. **Always provide schemas** - Define options clearly
2. **Template everything** - Don't hardcode file content
3. **Type your generators** - Use TypeScript interfaces
4. **Include tests** - Generate valid, tested code
5. **Document thoroughly** - README + AGENTS.md
6. **Follow codebase conventions** - See [AGENTS.md](../AGENTS.md)

## Troubleshooting

**Generator not found?**

```bash
pnpm nx run conformetry-nx:build
pnpm nx reset
pnpm nx generate conformetry:react-component --name=Test
```

**Build failed?**

```bash
# Check dependencies
pnpm install

# Rebuild with verbose output
pnpm nx run conformetry-nx:build --verbose
```

**Template syntax issues?**

- Use `<%= variable %>` for substitution
- `<%= name %>` for component name
- File extensions: `__name__.tsx__template__` → `ComponentName.tsx`

## References

- [Nx Generators Documentation](https://nx.dev/docs/extending-nx/intro)
- [Nx Plugin API](https://nx.dev/docs/extending-nx/create-sync-generator)

## Contributing

When adding new generators:

1. Create feature branch
2. Follow existing patterns
3. Add comprehensive documentation
4. Test thoroughly
5. Update this README
6. Submit PR

---

**Current Generators:** 1 (conformetry)
