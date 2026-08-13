"""Mustache-style template rendering for validator templates."""

import re


def render_template(*, template: str, data: dict) -> str:
    """Renders supported template placeholders using chevron when available."""
    try:
        import chevron

        return chevron.render(template, data)
    except ModuleNotFoundError:
        pass

    def replace_token(match: re.Match[str]) -> str:
        key = match.group("key")
        value = data.get(key)
        return value if isinstance(value, str) else match.group(0)

    return re.sub(r"{{\s*(?P<key>[\w]+)\s*}}", replace_token, template)
