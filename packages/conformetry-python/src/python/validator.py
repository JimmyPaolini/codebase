"""🐍 Python file conformance validation using abstract syntax trees."""

import ast

from python.abstract_syntax_tree import validate_depth_first_search
from python.comments import validate_comments
from python.types import ConformanceError


def _syntax_error(*, source: str, error: SyntaxError) -> ConformanceError:
    """Describes a file that could not be parsed at all."""
    return ConformanceError(
        error_type="code",
        language="python",
        message=f"{source} syntax error: {error}",
        fix=f"Fix the syntax error in the {source.lower()} file.",
    )


def validate_python_conformance(*, filename: str, instance: str, template: str) -> dict:
    """Validates that a Python file is a structural superset of its template.

    The template arrives already rendered — substitution happens in TypeScript,
    so generation and validation cannot drift apart in how they substitute.
    """
    try:
        template_tree = ast.parse(template, filename=filename)
    except SyntaxError as error:
        return {"errors": [_syntax_error(source="Template", error=error)]}

    try:
        instance_tree = ast.parse(instance, filename=filename)
    except SyntaxError as error:
        return {"errors": [_syntax_error(source="Instance", error=error)]}

    structural_errors = validate_depth_first_search(
        template_tree, instance_tree, template, instance, filename
    )
    comment_errors = validate_comments(template, instance)

    return {"errors": [*structural_errors, *comment_errors]}
