"""Unit tests for Python bridge entrypoint behavior."""

import json
from unittest.mock import patch

import pytest

from python.bridge import main


@pytest.mark.unit
def test_py_extension_routes_to_python_validator(capsys):
    payload = {
        "data": {},
        "extension": ".py",
        "filename": "example.py",
        "instance": "instance",
        "template": "template",
    }

    with (
        patch(
            "python.validator.validate_python_conformance",
            return_value={"errors": []},
        ) as validate_python_conformance,
        patch("sys.stdin.read", return_value=json.dumps(payload)),
    ):
        main()

    captured = capsys.readouterr()
    result = json.loads(captured.out)

    validate_python_conformance.assert_called_once()
    assert result["errors"] == []


@pytest.mark.unit
def test_ipynb_extension_routes_to_notebook_validator(capsys):
    payload = {
        "data": {},
        "extension": ".ipynb",
        "filename": "example.ipynb",
        "instance": "instance",
        "template": "template",
    }

    with (
        patch(
            "python.notebook.validator.validate_notebook_conformance",
            return_value={"errors": []},
        ) as validate_notebook_conformance,
        patch("sys.stdin.read", return_value=json.dumps(payload)),
    ):
        main()

    captured = capsys.readouterr()
    result = json.loads(captured.out)

    validate_notebook_conformance.assert_called_once()
    assert result["errors"] == []
