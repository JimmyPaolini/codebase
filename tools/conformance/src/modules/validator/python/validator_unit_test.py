"""Unit tests for the Python AST conformance validator."""

import pytest

from python.validator import validate_python_conformance


@pytest.mark.unit
def test_no_errors_for_identical_files():
    code = "import os\n\ndef foo():\n    pass\n"
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance=code,
        template=code,
    )
    assert result["errors"] == []


@pytest.mark.unit
def test_no_errors_when_instance_is_superset():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="import os\nimport sys\n\ndef foo():\n    pass\n\ndef bar():\n    pass\n",
        template="import os\n\ndef foo():\n    pass\n",
    )
    assert result["errors"] == []


@pytest.mark.unit
def test_error_for_missing_class():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="def foo():\n    pass\n",
        template="class MyClass:\n    pass\n",
    )
    assert len(result["errors"]) > 0
    assert any("MyClass" in e.message for e in result["errors"])


@pytest.mark.unit
def test_error_for_missing_import():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="def foo():\n    pass\n",
        template="import os\n\ndef foo():\n    pass\n",
    )
    assert len(result["errors"]) > 0
    assert any("os" in e.message for e in result["errors"])


@pytest.mark.unit
def test_error_for_missing_function():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="import os\n",
        template="import os\n\ndef my_function():\n    pass\n",
    )
    assert len(result["errors"]) > 0
    assert any("my_function" in e.message for e in result["errors"])


@pytest.mark.unit
def test_mustache_rendering():
    result = validate_python_conformance(
        data={"class_name": "MyClass"},
        filename="test.py",
        instance="class MyClass:\n    pass\n",
        template="class {{class_name}}:\n    pass\n",
    )
    assert result["errors"] == []


@pytest.mark.unit
def test_error_for_missing_comment():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="def foo():\n    pass\n",
        template="# required comment\ndef foo():\n    pass\n",
    )
    assert any(e.error_type == "comment" for e in result["errors"])


@pytest.mark.unit
def test_todo_comment_loose_match():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="# some other comment\ndef foo():\n    pass\n",
        template="# TODO: implement\ndef foo():\n    pass\n",
    )
    assert not any(e.error_type == "comment" for e in result["errors"])


@pytest.mark.unit
def test_syntax_error_in_instance():
    result = validate_python_conformance(
        data={},
        filename="test.py",
        instance="def foo(\n    pass\n",
        template="def foo():\n    pass\n",
    )
    assert len(result["errors"]) > 0
    assert any("syntax" in e.message.lower() for e in result["errors"])
