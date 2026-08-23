import math


def observed_rate(value):
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
        and value >= 0
    )


def complete_rate_total(lines, field):
    rows = list(lines or [])
    if not rows:
        return None
    values = [row.get(field) for row in rows]
    if not all(observed_rate(value) for value in values):
        return None
    return sum(int(value) for value in values)
