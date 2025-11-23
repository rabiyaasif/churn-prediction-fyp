# app/services/pdf_generator.py
from io import BytesIO
from typing import Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem


def generate_report_pdf(report_data: Dict[str, Any]) -> bytes:
    """
    Very simple PDF generator. You can style it later.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    summary = report_data.get("summary", {})
    key_insights = report_data.get("keyInsights", [])
    top_risk_factors = report_data.get("topRiskFactors", [])
    segments = report_data.get("segmentBreakdown", [])
    recs = report_data.get("recommendations", [])
    exec_summary = report_data.get("executiveSummary", "")

    story.append(Paragraph("Weekly Retention & Churn Risk Report", styles["Title"]))
    story.append(Spacer(1, 12))

    # Executive summary
    story.append(Paragraph("Executive Summary", styles["Heading2"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(exec_summary.replace("\n", "<br/>"), styles["BodyText"]))
    story.append(Spacer(1, 12))

    # Summary metrics
    story.append(Paragraph("Key Metrics", styles["Heading2"]))
    story.append(Spacer(1, 6))
    metrics_text = (
        f"Total Customers: {summary.get('totalCustomers', 0)}<br/>"
        f"High-Risk Customers: {summary.get('highRiskCount', 0)}<br/>"
        f"Estimated Churned This Week: {summary.get('churnedThisWeek', 0)}<br/>"
        f"Retention Rate: {summary.get('retentionRate', 0):.1f}%<br/>"
        f"Average Churn Probability: {summary.get('avgChurnProbability', 0)*100:.1f}%"
    )
    story.append(Paragraph(metrics_text, styles["BodyText"]))
    story.append(Spacer(1, 12))

    # Key insights
    if key_insights:
        story.append(Paragraph("Key Insights", styles["Heading2"]))
        story.append(Spacer(1, 6))
        items = [ListItem(Paragraph(i, styles["BodyText"])) for i in key_insights]
        story.append(ListFlowable(items, bulletType="bullet"))
        story.append(Spacer(1, 12))

    # Risk factors
    if top_risk_factors:
        story.append(Paragraph("Top Risk Factors", styles["Heading2"]))
        story.append(Spacer(1, 6))
        items = [
            ListItem(
                Paragraph(f"{rf['factor']} ({rf['impact']} impact)", styles["BodyText"])
            )
            for rf in top_risk_factors
        ]
        story.append(ListFlowable(items, bulletType="bullet"))
        story.append(Spacer(1, 12))

    # Segments
    if segments:
        story.append(Paragraph("Customer Segments", styles["Heading2"]))
        story.append(Spacer(1, 6))
        seg_lines = []
        for s in segments:
            seg_lines.append(
                f"{s['segment']}: {s['count']} customers, risk level {s['riskLevel']}%, trend {s['trend']}"
            )
        story.append(
            Paragraph("<br/>".join(seg_lines), styles["BodyText"])
        )
        story.append(Spacer(1, 12))

    # Recommendations
    if recs:
        story.append(Paragraph("Recommended Actions", styles["Heading2"]))
        story.append(Spacer(1, 6))
        items = [
            ListItem(
                Paragraph(
                    f"{r['action']} "
                    f"(Priority: {r['priority'].upper()}, Expected impact: {r['expectedImpact']})",
                    styles["BodyText"],
                )
            )
            for r in recs
        ]
        story.append(ListFlowable(items, bulletType="bullet"))
        story.append(Spacer(1, 12))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

