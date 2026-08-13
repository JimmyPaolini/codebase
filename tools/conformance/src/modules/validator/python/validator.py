"""🐍 Python file conformance validator using abstract syntax trees."""

import ast

from python.abstract_syntax_tree import validate_depth_first_search
from python.comments import validate_comments
from python.template import render_template
from python.types import ConformanceError


def validate_python_conformance(*, data: dict, filename: str, instance: str, template: str) -> dict:
    """Validates that a generated Python file is a structural superset of its Mustache template."""
    rendered = render_template(template=template, data=data)
    try:
        template_tree = ast.parse(rendered, filename=filename)
    except SyntaxError as e:
        return {
            "errors": [
                ConformanceError(
                    error_type="code",
                    language="python",
                    message=f"Template syntax error: {e}",
                    fix="Fix the syntax error in the template.",
                )
            ]
        }
    try:
        instance_tree = ast.parse(instance, filename=filename)
    except SyntaxError as e:
        return {
            "errors": [
                ConformanceError(
                    error_type="code",
                    language="python",
                    message=f"Instance syntax error: {e}",
                    fix="Fix the syntax error in the instance file.",
                )
            ]
        }
    structural_errors = validate_depth_first_search(
        template_tree, instance_tree, rendered, instance, filename
    )
    comment_errors = validate_comments(rendered, instance)
    return {"errors": [*structural_errors, *comment_errors]}
