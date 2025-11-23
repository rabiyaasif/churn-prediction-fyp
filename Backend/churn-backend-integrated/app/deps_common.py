# app/deps_common.py
from datetime import date, timedelta
from fastapi import Query, HTTPException
from typing import Optional
import re

SORT_RE = re.compile(r"^[A-Za-z0-9_]+:(asc|desc)$")

def common_query(
    from_: Optional[date] = Query(None, alias="from"),
    to_: Optional[date]   = Query(None, alias="to"),
    limit: int            = Query(100, ge=1, le=1000),
    offset: int           = Query(0, ge=0),
    sort: Optional[str]   = Query(None),          # <-- no pattern here
    threshold: float      = Query(0.5, ge=0.0, le=1.0),
):
    # defaults
    if to_ is None:
        to_ = date.today()
    if from_ is None:
        from_ = to_ - timedelta(days=90)

    # validate sort manually to avoid Query(pattern=...) incompat issues
    if sort and not SORT_RE.match(sort):
        raise HTTPException(status_code=400, detail="Invalid sort format. Use field:asc or field:desc")

    return {
        "from": from_,
        "to": to_,
        "limit": limit,
        "offset": offset,
        "sort": sort,
        "threshold": threshold,
    }
