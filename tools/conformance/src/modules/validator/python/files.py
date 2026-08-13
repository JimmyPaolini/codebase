"""🗂️ File and directory validators."""

import os
from pathlib import Path

from python.constants import converter_by_string_case
from python.notebook.validator import validate_notebook_conformance
from python.types import ConformanceError, StringCase
from python.validator import validate_python_conformance

# Try to use workspace root dynamically, or fallback to current dir
try:
    WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent.parent
except Exception:
    WORKSPACE_ROOT = Path.cwd()


def validate_instance_file(
    *, instance_file_path: str | Path, template_file_path: str | Path, data: dict
) -> dict:
    instance_path = Path(instance_file_path)
    template_path = Path(template_file_path)

    if not instance_path.exists():
        rel_path = (
            str(instance_path.relative_to(WORKSPACE_ROOT))
            if instance_path.is_absolute()
            else str(instance_path)
        )
        return {
            "errors": [
                ConformanceError(
                    error_type="file",
                    language="text",
                    message=f'Missing file: "{rel_path}"',
                    fix=f"Create the missing file `{rel_path}` matching the template.",
                )
            ]
        }

    with open(template_path, encoding="utf-8") as f:
        template_text = f.read()

    with open(instance_path, encoding="utf-8") as f:
        instance_text = f.read()

    ext = template_path.suffix.lower()

    if ext == ".ipynb":
        return validate_notebook_conformance(
            data=data,
            filename=instance_path.name,
            instance=instance_text,
            template=template_text,
        )
    elif ext == ".py":
        return validate_python_conformance(
            data=data,
            filename=instance_path.name,
            instance=instance_text,
            template=template_text,
        )

    return {"errors": []}


def _replace_path_variables(path_str: str, data: dict) -> str:
    for key, value in data.items():
        if isinstance(value, str):
            path_str = path_str.replace(f"__{key}__", value)
    return path_str


def validate_instance_directory(
    *, instance_directory_path: str | Path, template_directory_path: str | Path
) -> dict:
    instance_dir = Path(instance_directory_path)
    template_dir = Path(template_directory_path)
    name = instance_dir.name

    description = ""
    pyproject_path = instance_dir / "pyproject.toml"
    if pyproject_path.exists():
        with open(pyproject_path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("description = "):
                    description = line.split("=")[1].strip().strip('"').strip("'")
                    break

    data = {
        "name": name,
        "description": description,
        "nameCamelCase": converter_by_string_case[StringCase.CAMEL_CASE](name),
        "namePascalCase": converter_by_string_case[StringCase.PASCAL_CASE](name),
        "nameSnakeCase": converter_by_string_case[StringCase.SNAKE_CASE](name),
        "nameKebabCase": converter_by_string_case[StringCase.KEBAB_CASE](name),
    }

    results = []

    for root, dirs, files in os.walk(template_dir):
        # Exclude common cache/build directories
        dirs[:] = [
            d
            for d in dirs
            if d not in {".ruff_cache", "__pycache__", ".pytest_cache", ".mypy_cache"}
        ]

        root_path = Path(root)
        rel_root = root_path.relative_to(template_dir)

        rel_instance_root = Path(_replace_path_variables(str(rel_root), data))

        for file in files:
            if file == ".DS_Store":
                continue

            template_file_path = root_path / file
            instance_file_name = _replace_path_variables(file, data)
            instance_file_path = instance_dir / rel_instance_root / instance_file_name

            file_result = validate_instance_file(
                instance_file_path=instance_file_path,
                template_file_path=template_file_path,
                data=data,
            )

            results.append(
                {
                    "filename": instance_file_name,
                    "instanceFilePath": str(instance_file_path),
                    "templateFilePath": str(template_file_path),
                    "errors": file_result.get("errors", []),
                }
            )

    return {"directoryName": name, "results": results}


def validate_instances_directory(
    *,
    instances_directory_path: str | Path,
    template_directory_path: str | Path,
    exclude_directories: list[str] | None = None,
) -> list[dict]:
    instances_dir = Path(instances_directory_path)
    exclude = exclude_directories or []
    results = []

    if not instances_dir.exists():
        return results

    for entry in instances_dir.iterdir():
        if entry.is_dir() and entry.name not in exclude:
            results.append(
                validate_instance_directory(
                    instance_directory_path=entry,
                    template_directory_path=template_directory_path,
                )
            )

    return results


def stringify_conformance_errors(results: list[dict]) -> str | None:
    directories_with_errors = [
        res for res in results if any(f["errors"] for f in res.get("results", []))
    ]

    if not directories_with_errors:
        return None

    lines = []
    dir_count = len(directories_with_errors)
    plural = "y" if dir_count == 1 else "ies"
    lines.append(
        f"Conformance validation failed — {dir_count} director{plural} with errors."
    )

    for dir_index, dir_result in enumerate(directories_with_errors):
        directory_name = dir_result.get("directoryName", "")
        failing_files = [f for f in dir_result.get("results", []) if f["errors"]]

        lines.append("")
        lines.append(f"{dir_index + 1}. directory: {directory_name}")

        for file_index, file_result in enumerate(failing_files):
            instance_path = Path(file_result["instanceFilePath"])
            template_path = Path(file_result["templateFilePath"])

            try:
                rel_instance = instance_path.relative_to(WORKSPACE_ROOT)
            except ValueError:
                rel_instance = instance_path

            try:
                rel_template = template_path.relative_to(WORKSPACE_ROOT)
            except ValueError:
                rel_template = template_path

            lines.append("")
            lines.append(f"  {file_index + 1}. file: {file_result['filename']}")
            lines.append(f"     Instance: {rel_instance}")
            lines.append(f"     Template: {rel_template}")

            for i, err in enumerate(file_result["errors"]):
                lines.append("")
                lines.append(f"     {i + 1}. {err.message}")

                if err.instance_line is not None:
                    col = (
                        f", Column {err.instance_column}"
                        if err.instance_column is not None
                        else ""
                    )
                    lines.append(f"        Instance: Line {err.instance_line}{col}")
                elif err.instance_path is not None:
                    lines.append(f'        Instance: JSON path "{err.instance_path}"')

                if err.template_line is not None:
                    col = (
                        f", Column {err.template_column}"
                        if err.template_column is not None
                        else ""
                    )
                    lines.append(f"        Template: Line {err.template_line}{col}")
                elif err.template_path is not None:
                    lines.append(f'        Template: JSON path "{err.template_path}"')

                if err.expected is not None:
                    lines.append(f"        Expected: `{err.expected}`")
                if err.actual is not None:
                    lines.append(f"        Actual  : `{err.actual}`")
                lines.append(f"        Fix     : {err.fix}")

    return "\n".join(lines)
