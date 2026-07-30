# Conformance Generators

The [`conformance`](../../tools/conformance) tool both generates and validates code conformance to codebase conventions. Nx generators scaffold new projects, directories, and files with consistent structure, naming, and formatting; generator unit tests then validate that each generated instance still conforms to the template used to generate it.

## Available generators

| Generator | Alias | Description |
| --- | --- | --- |
| `conformance:react-component` | `c` | React component + test file (PascalCase) |
| `conformance:nestjs-service-module` | `nsm` | NestJS module, service, types, constants, and unit test |
| `conformance:nestjs-command-application` | `nca` | Full NestJS CLI application scaffold |

## Usage

```bash
# Generate a React component (prompts for project if --project omitted)
nx generate conformance:react-component --name=Button
nx g conformance:react-component --name=Button --project=lexico-components

# Generate a NestJS service module
nx generate conformance:nestjs-service-module --name=user
nx g conformance:nestjs-service-module --name=userProfile --project=my-nestjs-app

# Generate a NestJS command-line application
nx generate conformance:nestjs-command-application --name=stellar-cli
```

Generators auto-detect the target project by framework tag (`framework:react` / `framework:nestjs`) and prompt interactively when `--project` is omitted. See [tools/conformance](../../tools/conformance) for architecture details and how to extend generators.
