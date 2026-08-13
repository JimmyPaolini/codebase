"""Bridge entrypoint for invoking Python conformance validators from TypeScript."""

import json
import sys
from dataclasses import asdict


def main() -> None:
    payload = json.loads(sys.stdin.read())
    extension = payload.get("extension")
    data = payload.get("data", {})
    filename = payload["filename"]
    instance = payload["instance"]
    template = payload["template"]

    try:
        if extension == ".ipynb":
            from python.notebook.validator import validate_notebook_conformance

            result = validate_notebook_conformance(
                data=data,
                filename=filename,
                instance=instance,
                template=template,
            )
        elif extension == ".py":
            from python.validator import validate_python_conformance

            result = validate_python_conformance(
                data=data,
                filename=filename,
                instance=instance,
                template=template,
            )
        else:
            result = {
                "errors": [
                    {
                        "error_type": "code",
                        "language": "python",
                        "message": f"Unsupported extension for python bridge: {extension}",
                        "fix": "Use .py or .ipynb templates for Python bridge validation.",
                    }
                ]
            }
    except ModuleNotFoundError as error:
        result = {
            "errors": [
                {
                    "error_type": "code",
                    "language": "python",
                    "message": f"Python validator dependency missing: {error}",
                    "fix": "Install Python validator dependencies.",
                }
            ]
        }

    errors = [
        asdict(error) if hasattr(error, "__dataclass_fields__") else error
        for error in result.get("errors", [])
    ]
    print(json.dumps({"errors": errors}))


if __name__ == "__main__":
    main()
