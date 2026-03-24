from html import escape
from typing import Any


def sanitize_value(value: Any) -> Any:
    """Recursively sanitize input values by HTML-escaping strings.

    Keeps dicts and lists structure intact.
    """
    if value is None:
        return None
    if isinstance(value, str):
        return escape(value)
    if isinstance(value, dict):
        return {k: sanitize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_value(v) for v in value]
    # For other scalar types (int, float, bool), return as-is
    return value


def sanitize_request_data(request) -> dict:
    """Return a dict with sanitized `json`, `args`, and `form` data extracted from a Flask request."""
    sanitized = {'json': None, 'args': None, 'form': None}

    try:
        if request.is_json:
            data = request.get_json(silent=True)
            sanitized['json'] = sanitize_value(data)
    except Exception:
        sanitized['json'] = None

    try:
        # request.args and request.form are ImmutableMultiDicts; convert to plain dicts
        args = request.args.to_dict(flat=False)
        sanitized['args'] = sanitize_value(args)
    except Exception:
        sanitized['args'] = None

    try:
        form = request.form.to_dict(flat=False)
        sanitized['form'] = sanitize_value(form)
    except Exception:
        sanitized['form'] = None

    return sanitized
