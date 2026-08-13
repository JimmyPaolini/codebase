"""📓 Jupyter notebook conformance validator."""

import json
import re

from python.template import render_template
from python.types import ConformanceError
from python.validator import validate_python_conformance

_TOKEN_PATTERN = re.compile(r'("(?:\\.|[^"\\])*")|(//[^\n]*|/\*[\s\S]*?\*/)')


def _strip_comments(text: str) -> str:
    return _TOKEN_PATTERN.sub(
        lambda match: match.group(1) if match.group(1) else "", text
    )


def _format_path(path: list[str | int]) -> str:
    result = ""
    for segment in path:
        if isinstance(segment, int):
            result = f"{result}[{segment}]"
        elif result == "":
            result = segment
        else:
            result = f"{result}.{segment}"
    return result


def _validate_json_structure(
    template: object, instance: object, path: list[str | int] | None = None
) -> list[ConformanceError]:
    current_path = path or []
    errors: list[ConformanceError] = []

    if isinstance(template, list) and isinstance(instance, list):
        for template_item in template:
            path_text = _format_path(current_path)
            if isinstance(template_item, (bool, int, float, str, type(None))):
                if template_item not in instance:
                    item_path = (
                        f"{path_text}[{json.dumps(template_item)}]"
                        if path_text
                        else f"[{json.dumps(template_item)}]"
                    )
                    errors.append(
                        ConformanceError(
                            error_type="code",
                            language="json",
                            message=f'Missing required value: "{item_path}"',
                            instance_path=item_path,
                            template_path=item_path,
                            fix=f'Add the missing value at "{item_path}" to the instance file.',
                        )
                    )
            elif not instance:
                errors.append(
                    ConformanceError(
                        error_type="code",
                        language="json",
                        message=f'Missing required value: "{path_text}"',
                        instance_path=path_text,
                        template_path=path_text,
                        fix=f'Add the missing value at "{path_text}" to the instance file.',
                    )
                )
            else:
                candidate_errors: list[list[ConformanceError]] = []
                for instance_index, instance_item in enumerate(instance):
                    candidate_errors.append(
                        _validate_json_structure(
                            template_item,
                            instance_item,
                            [*current_path, instance_index],
                        )
                    )
                errors.extend(min(candidate_errors, key=len))
        return errors

    if isinstance(template, dict) and isinstance(instance, dict):
        for key, template_value in template.items():
            key_path = _format_path([*current_path, key])
            if key in instance:
                errors.extend(
                    _validate_json_structure(
                        template_value,
                        instance[key],
                        [*current_path, key],
                    )
                )
            else:
                errors.append(
                    ConformanceError(
                        error_type="code",
                        language="json",
                        message=f'Missing required key: "{key_path}"',
                        instance_path=key_path,
                        template_path=key_path,
                        fix=f'Add the missing key "{key_path}" to the instance file.',
                    )
                )
        return errors

    if template != instance:
        mismatch_path = _format_path(current_path)
        errors.append(
            ConformanceError(
                error_type="code",
                language="json",
                message=(
                    f'Key "{mismatch_path}": expected {json.dumps(template)}, '
                    f"got {json.dumps(instance)}"
                ),
                instance_path=mismatch_path,
                template_path=mismatch_path,
                expected=json.dumps(template),
                actual=json.dumps(instance),
                fix=(
                    f'Change the value at "{mismatch_path}" in the instance '
                    f"file to {json.dumps(template)}."
                ),
            )
        )

    return errors


def _validate_markdown_cell(
    template_source: str, instance_source: str
) -> list[ConformanceError]:
    errors: list[ConformanceError] = []
    for line in template_source.split("\n"):
        if line == "":
            continue
        if line not in instance_source.split("\n"):
            errors.append(
                ConformanceError(
                    error_type="code",
                    language="markdown",
                    message=f"Missing line: {line}",
                    expected=line,
                    fix=f"Add the line `{line}` to the notebook markdown cell.",
                )
            )
    return errors


def validate_notebook_conformance(
    *, data: dict, filename: str, instance: str, template: str
) -> dict:
    """Validates a Jupyter notebook (.ipynb) as JSON with cell content validation."""
    rendered = render_template(template=template, data=data)
    try:
        template_obj = json.loads(_strip_comments(rendered))
        instance_obj = json.loads(_strip_comments(instance))
    except json.JSONDecodeError as e:
        return {
            "errors": [
                ConformanceError(
                    error_type="code",
                    language="json",
                    message=f"JSON parse error: {e}",
                    fix="Fix the JSON syntax in the notebook file.",
                )
            ]
        }
    structural_errors = _validate_json_structure(template_obj, instance_obj)
    cell_errors: list[ConformanceError] = []
    template_cells = template_obj.get("cells", [])
    instance_cells = instance_obj.get("cells", [])
    for i, template_cell in enumerate(template_cells):
        cell_type = template_cell.get("cell_type", "")
        template_source = "".join(template_cell.get("source", []))
        if i >= len(instance_cells):
            cell_errors.append(
                ConformanceError(
                    error_type="code",
                    language="json",
                    message=f'Missing notebook cell at index {i} (cell_type: "{cell_type}")',
                    instance_path=f"cells[{i}]",
                    fix=f"Add the missing cell at index {i} to the notebook.",
                )
            )
            continue
        instance_cell = instance_cells[i]
        instance_source = "".join(instance_cell.get("source", []))
        if cell_type == "code" and template_source.strip():
            result = validate_python_conformance(
                data=data,
                filename=filename,
                instance=instance_source,
                template=template_source,
            )
            cell_errors.extend(result["errors"])
        elif cell_type == "markdown" and template_source.strip():
            cell_errors.extend(
                _validate_markdown_cell(template_source, instance_source)
            )
    return {"errors": [*structural_errors, *cell_errors]}
