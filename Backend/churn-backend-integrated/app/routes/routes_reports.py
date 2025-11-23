# app/routes/routes_reports.py
from datetime import date, datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db import get_db
from app.services.report_generator_on_demand import generate_weekly_report_from_events
from app.services.pdf_generator import generate_report_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


class WeeklyReportResponse(BaseModel):
    week_ending: date
    report_data: Dict[str, Any]


@router.get("/generate", response_model=WeeklyReportResponse)
async def generate_report(
    client_id: int = Query(..., description="Client ID"),
    week_ending: date = Query(..., description="Week ending date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a weekly report on-demand by analyzing events table.
    Returns the report immediately without storing it in the database.
    
    Example:
    GET /reports/generate?client_id=1&week_ending=2025-01-19
    """
    try:
        report_data = await generate_weekly_report_from_events(
            client_id=client_id,
            week_ending=week_ending,
            db=db
        )
        
        return WeeklyReportResponse(
            week_ending=week_ending,
            report_data=report_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )


@router.get("/generate/pdf")
async def generate_report_pdf_endpoint(
    client_id: int = Query(..., description="Client ID"),
    week_ending: date = Query(..., description="Week ending date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a weekly report and return it as PDF.
    
    Example:
    GET /reports/generate/pdf?client_id=1&week_ending=2025-01-19
    """
    try:
        report_data = await generate_weekly_report_from_events(
            client_id=client_id,
            week_ending=week_ending,
            db=db
        )
        
        pdf_bytes = generate_report_pdf(report_data)
        filename = f"weekly-report-{client_id}-{week_ending}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {str(e)}"
        )
