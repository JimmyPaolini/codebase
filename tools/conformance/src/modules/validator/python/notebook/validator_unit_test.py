"""Unit tests for the Jupyter notebook conformance validator."""

import json

import pytest

from python.notebook.validator import validate_notebook_conformance


def make_notebook(cells=None, nbformat=4):
    nb = {
        "nbformat": nbformat,
        "nbformat_minor": 5,
        "metadata": {},
        "cells": cells or [],
    }
    return json.dumps(nb)


def make_code_cell(source):
    return {
        "cell_type": "code",
        "source": [source],
        "metadata": {},
        "outputs": [],
        "execution_count": None,
    }


def make_markdown_cell(source):
    return {"cell_type": "markdown", "source": [source], "metadata": {}}


@pytest.mark.unit
def test_error_for_missing_nbformat_key():
    result = validate_notebook_conformance(
        data={},
        filename="test.ipynb",
        instance='{"nbformat_minor": 5, "metadata": {}, "cells": []}',
        template=make_notebook([]),
    )
    assert any("nbformat" in e.message for e in result["errors"])


@pytest.mark.unit
def test_error_for_missing_function_in_code_cell():
    template = make_notebook([make_code_cell("def my_func():\n    pass")])
    instance = make_notebook([make_code_cell("x = 1")])
    result = validate_notebook_conformance(
        data={},
        filename="test.ipynb",
        instance=instance,
        template=template,
    )
    assert len(result["errors"]) > 0
    assert any("my_func" in e.message for e in result["errors"])


@pytest.mark.unit
def test_error_for_missing_heading_in_markdown_cell():
    template = make_notebook([make_markdown_cell("# My Heading\n")])
    instance = make_notebook([make_markdown_cell("Just some text\n")])
    result = validate_notebook_conformance(
        data={},
        filename="test.ipynb",
        instance=instance,
        template=template,
    )
    assert len(result["errors"]) > 0
    assert any("heading" in e.message.lower() or "h1" in e.message for e in result["errors"])


@pytest.mark.unit
def test_error_for_missing_cell():
    template = make_notebook([make_code_cell("def foo():\n    pass")])
    instance = make_notebook([])
    result = validate_notebook_conformance(
        data={},
        filename="test.ipynb",
        instance=instance,
        template=template,
    )
    # Missing cell detected either by structural check or cell check
    assert len(result["errors"]) > 0


@pytest.mark.unit
def test_mustache_interpolation():
    template = make_notebook([make_code_cell("class {{class_name}}:\n    pass")])
    instance = make_notebook([make_code_cell("class MyClass:\n    pass")])
    result = validate_notebook_conformance(
        data={"class_name": "MyClass"},
        filename="test.ipynb",
        instance=instance,
        template=template,
    )
    assert result["errors"] == []
