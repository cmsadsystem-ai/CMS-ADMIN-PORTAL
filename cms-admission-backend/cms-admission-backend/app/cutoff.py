"""Anna University engineering cutoff formula:
    cutoff = Maths + (Physics / 2) + (Chemistry / 2)   (marks out of 100 each -> cutoff out of 200)

The docx leaves the exact formula as an open question for the Vice Chairman
(section 13, point 6). This is the standard formula every counselling-based
college uses, so it's wired in as the default - change this one function if
the college confirms something different.
"""


def compute_cutoff(maths: float | None, physics: float | None, chemistry: float | None) -> float | None:
    if maths is None or physics is None or chemistry is None:
        return None
    return round(maths + physics / 2 + chemistry / 2, 2)
