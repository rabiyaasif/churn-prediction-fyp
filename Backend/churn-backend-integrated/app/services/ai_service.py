# app/services/ai_service.py
import os
from typing import Dict, Any

import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def generate_executive_summary(report_payload: Dict[str, Any]) -> str:
    """
    Uses Gemini to turn structured report data into a professional,
    layman-friendly executive summary.

    report_payload will contain:
      - summary
      - key_insights
      - segment_breakdown
      - top_risk_factors
    """

    if not GEMINI_API_KEY:
        # Fallback summary if no API key is set
        s = report_payload.get("summary", {})
        total = s.get("totalCustomers", 0)
        high = s.get("highRiskCount", 0)
        retention = s.get("retentionRate", 0)
        return (
            f"This week you had {total} active customers, with {high} currently flagged "
            f"as high churn risk. Overall retention remained at {retention:.1f}%. "
            "Review the key insights and recommended actions below to see how you can reduce churn next week."
        )

    # Build a compact but informative prompt
    summary = report_payload.get("summary", {})
    key_insights = report_payload.get("keyInsights", [])
    segments = report_payload.get("segmentBreakdown", [])
    risk_factors = report_payload.get("topRiskFactors", [])

    prompt = f"""
You are an analyst writing a short weekly report for a non-technical business owner.

Here is the structured data for this week's retention & churn risk:

SUMMARY (numbers):
{summary}

KEY INSIGHTS (bullet points):
{key_insights}

SEGMENT BREAKDOWN:
{segments}

TOP RISK FACTORS:
{risk_factors}

Write a concise executive summary in plain business language.
- 2–3 short paragraphs max
- No jargon, no formulas
- Focus on what is happening and why it matters
- End with a positive, action-oriented tone
"""

    model = genai.GenerativeModel("gemini-1.5-pro")

    try:
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        if not text:
            raise ValueError("Empty response from Gemini")
        return text
    except Exception:
        # Safe fallback
        s = summary
        total = s.get("totalCustomers", 0)
        high = s.get("highRiskCount", 0)
        retention = s.get("retentionRate", 0)
        return (
            f"This week you had {total} active customers, with {high} customers at higher risk of churn. "
            f"Retention stayed around {retention:.1f}%. Focus on the high-risk segments and follow the "
            "recommended actions to protect revenue and strengthen customer loyalty."
        )

