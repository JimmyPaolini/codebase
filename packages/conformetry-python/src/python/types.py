"""🔎 Conformance error types for Python validators."""

from dataclasses import dataclass
from typing import Literal

ConformanceErrorType = Literal["comment", "directory", "file", "code"]
ConformanceErrorLanguage = Literal["javascript", "json", "markdown", "python", "text"]

StringCaseValue = Literal["CAMEL_CASE", "KEBAB_CASE", "PASCAL_CASE", "SNAKE_CASE"]


class StringCase:
    CAMEL_CASE: StringCaseValue = "CAMEL_CASE"
    KEBAB_CASE: StringCaseValue = "KEBAB_CASE"
    PASCAL_CASE: StringCaseValue = "PASCAL_CASE"
    SNAKE_CASE: StringCaseValue = "SNAKE_CASE"


@dataclass
class ConformanceError:
    """A structured conformance error produced by any Python validator."""

    error_type: ConformanceErrorType
    fix: str
    message: str
    language: ConformanceErrorLanguage | None = None
    instance_line: int | None = None
    instance_column: int | None = None
    instance_path: str | None = None
    template_line: int | None = None
    template_column: int | None = None
    template_path: str | None = None
    expected: str | None = None
    actual: str | None = None
