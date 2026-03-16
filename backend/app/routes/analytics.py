from collections import defaultdict
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.models import Lead, LeadBehavior


router = APIRouter(prefix="/analytics", tags=["analytics"])


def _collect_points(data: Any) -> List[Tuple[int, int]]:
    points: List[Tuple[int, int]] = []

    def _walk(node: Any) -> None:
        if isinstance(node, dict):
            if "x" in node and "y" in node:
                try:
                    x = int(node["x"])
                    y = int(node["y"])
                    points.append((x, y))
                except (TypeError, ValueError):
                    pass
            for value in node.values():
                _walk(value)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(data)
    return points


@router.get("/heatmap")
def get_heatmap(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    behaviors: List[LeadBehavior] = db.query(LeadBehavior).all()

    click_counts: Dict[Tuple[int, int], int] = defaultdict(int)
    hover_counts: Dict[Tuple[int, int], int] = defaultdict(int)

    for behavior in behaviors:
        if behavior.clicks:
            for x, y in _collect_points(behavior.clicks):
                click_counts[(x, y)] += 1
        if behavior.hovers:
            for x, y in _collect_points(behavior.hovers):
                hover_counts[(x, y)] += 1

    clicks = [
        {"x": x, "y": y, "count": count}
        for (x, y), count in click_counts.items()
    ]
    hovers = [
        {"x": x, "y": y, "count": count}
        for (x, y), count in hover_counts.items()
    ]

    return {"clicks": clicks, "hovers": hovers}


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=7)
    month_start = datetime(now.year, now.month, 1)

    total_leads = db.query(Lead).count()
    leads_today = (
        db.query(Lead)
        .filter(Lead.created_at >= today_start)
        .count()
    )
    leads_this_week = (
        db.query(Lead)
        .filter(Lead.created_at >= week_start)
        .count()
    )
    leads_this_month = (
        db.query(Lead)
        .filter(Lead.created_at >= month_start)
        .count()
    )

    behaviors: List[LeadBehavior] = db.query(LeadBehavior).all()
    if behaviors:
        avg_time_on_page = int(
            sum(b.time_on_page for b in behaviors) / len(behaviors)
        )
        avg_return_count = (
            sum(b.return_count for b in behaviors) / len(behaviors)
        )
    else:
        avg_time_on_page = 0
        avg_return_count = 0.0

    return {
        "avg_time_on_page": avg_time_on_page,
        "total_leads": total_leads,
        "leads_today": leads_today,
        "leads_this_week": leads_this_week,
        "leads_this_month": leads_this_month,
        "avg_return_count": avg_return_count,
    }

