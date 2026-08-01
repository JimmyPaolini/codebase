# Conformetry Generators

The conformetry toolchain generates and validates code against repository conventions. The Nx plugin exposes generators for scaffolding new projects, directories, and files with consistent structure, naming, and formatting; generator unit tests then validate that each generated instance still conforms to the template used to generate it.

## Available generators

| Generator | Alias | Description |
| --- | --- | --- |
| `conformetry:react-component` | `c` | React component + test file (PascalCase) |
| `conformetry:nestjs-service-module` | `nsm` | NestJS module, service, types, constants, and unit test |
| `conformetry:nestjs-command-application` | `nca` | Full NestJS CLI application scaffold |

## Usage

```bash
# Generate a React component (prompts for project if --project omitted)
nx generate conformetry:react-component --name=Button
nx g conformetry:react-component --name=Button --project=lexico-components

# Generate a NestJS service module
nx generate conformetry:nestjs-service-module --name=user
nx g conformetry:nestjs-service-module --name=userProfile --project=my-nestjs-app

# Generate a NestJS command-line application
nx generate conformetry:nestjs-command-application --name=stellar-cli
```

Generators auto-detect the target project by framework tag (`framework:react` / `framework:nestjs`) and prompt interactively when `--project` is omitted. See [packages/conformetry](../../packages/conformetry) and [packages/conformetry-nx](../../packages/conformetry-nx) for the runtime and Nx plugin implementation details.
