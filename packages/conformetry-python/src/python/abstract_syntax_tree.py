"""🌲 Depth-first search abstract syntax tree conformance validation."""

import ast

from python.nodes import (
    filter_by_same_key,
    filter_by_same_type,
    get_children,
    get_key,
)
from python.types import ConformanceError


def _get_node_location(node: ast.AST) -> tuple[int | None, int | None]:
    line = getattr(node, "lineno", None)
    col = getattr(node, "col_offset", None)
    return line, (col + 1 if col is not None else None)


def _build_error(
    template_child: ast.AST, instance_node: ast.AST, filename: str
) -> ConformanceError:
    kind = type(template_child).__name__
    key = get_key(template_child)
    breadcrumb = f'{kind} "{key}"' if key is not None else kind
    instance_line, instance_col = _get_node_location(instance_node)
    template_line, template_col = _get_node_location(template_child)
    return ConformanceError(
        error_type="code",
        language="python",
        message=f"Missing {breadcrumb}",
        instance_line=instance_line,
        instance_column=instance_col,
        template_line=template_line,
        template_column=template_col,
        fix=f"Add the missing {breadcrumb} to the instance file. See the template for the expected structure.",
    )


def validate_depth_first_search(
    template_node: ast.AST,
    instance_node: ast.AST,
    template_source: str,
    instance_source: str,
    filename: str,
) -> list[ConformanceError]:
    errors: list[ConformanceError] = []
    instance_children = get_children(instance_node)
    template_children = get_children(template_node)
    for template_child in template_children:
        key = get_key(template_child)
        if key is not None:
            matches = filter_by_same_key(instance_children, template_child)
            match = matches[0] if matches else None
            if match is None:
                errors.append(_build_error(template_child, instance_node, filename))
            else:
                errors.extend(
                    validate_depth_first_search(
                        template_child, match, template_source, instance_source, filename
                    )
                )
        else:
            same_type = filter_by_same_type(instance_children, template_child)
            if not same_type:
                errors.append(_build_error(template_child, instance_node, filename))
            else:
                candidate_errors = [
                    validate_depth_first_search(
                        template_child, candidate, template_source, instance_source, filename
                    )
                    for candidate in same_type
                ]
                fewest = min(candidate_errors, key=len)
                errors.extend(fewest)
    return errors
