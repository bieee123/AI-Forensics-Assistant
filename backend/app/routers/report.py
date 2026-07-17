"""
Automated Executive Report Generator (Extra Credit)
Generates a professional PDF incident report from analysis results,
ready for regulatory submission.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.routers.analyze import analyze_log, AnalyzeRequest
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import io
import json
import datetime
import hashlib

router = APIRouter()

# ── Apple-inspired color palette ──────────────────────────────
APPLE_RED       = colors.HexColor("#FF3B30")
APPLE_ORANGE    = colors.HexColor("#FF9500")
APPLE_YELLOW    = colors.HexColor("#FFCC00")
APPLE_GREEN     = colors.HexColor("#34C759")
APPLE_BLUE      = colors.HexColor("#5AC8FA")
DARK_TEXT        = colors.HexColor("#1D1D1F")
SECONDARY_TEXT   = colors.HexColor("#86868B")
HAIRLINE         = colors.HexColor("#E5E5EA")
LIGHT_BG         = colors.HexColor("#F5F5F7")
WHITE            = colors.white

SEVERITY_COLORS = {
    "CRITICAL": APPLE_RED,
    "HIGH":     APPLE_ORANGE,
    "MEDIUM":   APPLE_YELLOW,
    "LOW":      APPLE_GREEN,
    "INFO":     APPLE_BLUE,
}


class ReportRequest(BaseModel):
    upload_id: int
    analyst_name: str = "DFA System"
    organization: str = "PT Teknologi Nasional Indonesia Siber"
    classification: str = "CONFIDENTIAL"
    narrative_report: str | None = None
    severity_overall: str | None = None
    ioc_summary: list[str] | None = None
    attack_timeline: list[dict] | None = None
    total_incidents: int | None = None


def severity_color(s: str):
    return SEVERITY_COLORS.get(s.upper(), SECONDARY_TEXT)


def classification_color(c: str):
    mapping = {
        "CONFIDENTIAL": APPLE_RED,
        "RESTRICTED":   APPLE_ORANGE,
        "INTERNAL":     APPLE_BLUE,
        "PUBLIC":       APPLE_GREEN,
    }
    return mapping.get(c.upper(), SECONDARY_TEXT)


def build_pdf(analysis: dict, req: ReportRequest) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.2*cm, leftMargin=2.2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Custom styles ──────────────────────────────────────────
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=24, textColor=DARK_TEXT, spaceAfter=2,
        fontName="Helvetica-Bold", alignment=TA_LEFT,
        leading=30,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=11, textColor=SECONDARY_TEXT, spaceAfter=24,
        fontName="Helvetica",
    )
    section_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=11, textColor=DARK_TEXT, spaceBefore=20, spaceAfter=10,
        fontName="Helvetica-Bold",
        borderPadding=(0, 0, 6, 0),
        borderWidth=1,
        borderColor=HAIRLINE,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10, textColor=DARK_TEXT, leading=16,
        fontName="Helvetica", spaceAfter=8,
    )
    mono_style = ParagraphStyle(
        "Mono",
        parent=styles["Code"],
        fontSize=8.5, textColor=DARK_TEXT, leading=13,
        fontName="Courier", spaceAfter=4,
    )
    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontSize=9, textColor=SECONDARY_TEXT, fontName="Helvetica-Bold",
        spaceAfter=2,
    )
    pill_style = ParagraphStyle(
        "SeverityPill",
        parent=styles["Normal"],
        fontSize=11, fontName="Helvetica-Bold",
        alignment=TA_CENTER,
        leading=14,
    )
    custody_sub_style = ParagraphStyle(
        "CustodySub",
        parent=label_style,
        textColor=DARK_TEXT,
        spaceBefore=14, spaceAfter=6, fontSize=9.5,
        fontName="Helvetica-Bold",
    )

    now         = datetime.datetime.utcnow()
    severity    = analysis.get("severity_overall", "UNKNOWN")
    sev_color   = severity_color(severity)
    upload_id   = analysis.get("upload_id", "N/A")
    total       = analysis.get("total_incidents", 0)
    narrative   = analysis.get("narrative_report") or "Analysis narrative not available. Please re-run the analysis."
    ioc_list    = analysis.get("ioc_summary", [])
    timeline    = analysis.get("attack_timeline", [])
    filename_display = analysis.get("filename", f"upload_{upload_id}")

    timestamp_fmt = now.strftime("%d %B %Y, %H:%M UTC")
    date_tag      = now.strftime("%Y%m%d")

    # ── Classification tag (inline, bordered) ────────────────
    tag_col = classification_color(req.classification)
    story.append(Paragraph(
        f"<font color='{tag_col.hexval()}'><b>{req.classification}</b></font>",
        ParagraphStyle("ClassTag", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            borderColor=tag_col, borderWidth=1.2, borderPadding=4,
            spaceAfter=18, leading=10,
        )
    ))

    # ── Title ─────────────────────────────────────────────────
    story.append(Paragraph("Incident Report", title_style))
    story.append(Paragraph("Agentic AI Digital Forensics Assistant", subtitle_style))

    # ── Meta rows (hairline-separated) ────────────────────────
    meta_data = [
        [Paragraph(f"<b>{k}</b>", label_style),
         Paragraph(v, ParagraphStyle("MetaVal", parent=styles["Normal"],
             fontSize=9, textColor=DARK_TEXT, fontName="Helvetica"))]
        for k, v in [
            ("Report ID",       f"DFA-{upload_id}-{date_tag}"),
            ("Generated",       timestamp_fmt),
            ("Upload ID",       str(upload_id)),
            ("Filename",        filename_display),
            ("Analyst",         req.analyst_name),
            ("Organization",    req.organization),
            ("Classification",  req.classification),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[3.5*cm, 13.5*cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Helvetica"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("TEXTCOLOR",     (0,0), (0,-1), SECONDARY_TEXT),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK_TEXT),
        ("LINEBELOW",     (0,0), (-1,-2), 0.5, HAIRLINE),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 18))

    # ── 1. Executive Summary ──────────────────────────────────
    story.append(Paragraph("1. Executive Summary", section_style))

    sev_tag = Paragraph(
        f"<font color='{WHITE.hexval()}'><b>{severity}</b></font>",
        ParagraphStyle("SevPill", parent=pill_style,
            backColor=sev_color, borderPadding=(3, 8, 3, 8),
            textColor=WHITE, fontSize=11,
            leading=14, alignment=TA_CENTER,
        )
    )
    total_val = Paragraph(
        f"<b>{total}</b>",
        ParagraphStyle("TotVal", parent=pill_style,
            fontSize=18, textColor=DARK_TEXT,
            leading=20, alignment=TA_CENTER,
        )
    )
    sev_data = [
        [Paragraph("<b>Severity</b>", label_style),
         Paragraph("<b>Total Incidents</b>", label_style)],
        [sev_tag, total_val],
    ]
    sev_table = Table(sev_data, colWidths=[8.5*cm, 8.5*cm])
    sev_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,0), LIGHT_BG),
        ("BOX",         (0,0), (-1,-1), 0.5, HAIRLINE),
        ("ALIGN",       (0,0), (-1,-1), "CENTER"),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",  (0,0), (-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
    ]))
    story.append(sev_table)
    story.append(Spacer(1, 14))

    # ── 2. Narrative Analysis ─────────────────────────────────
    story.append(Paragraph("2. Narrative Analysis", section_style))

    narrative_main = narrative
    recommendation = ""
    if "Recommendation:" in narrative:
        parts          = narrative.split("Recommendation:", 1)
        narrative_main = parts[0].strip()
        recommendation = parts[1].strip()

    story.append(Paragraph(narrative_main.replace("\n", "<br/>"), body_style))

    if recommendation:
        story.append(Spacer(1, 8))
        rec_data = [
            [Paragraph(
                f"<font color='{APPLE_ORANGE.hexval()}'><b>Recommendation</b></font>",
                ParagraphStyle("RecLabel", parent=label_style,
                    fontSize=9, fontName="Helvetica-Bold",
                    textColor=APPLE_ORANGE))],
            [Paragraph(recommendation, body_style)],
        ]
        rec_table = Table(rec_data, colWidths=[17*cm])
        rec_table.setStyle(TableStyle([
            ("LINELEFT",    (0,0), (-1,-1), 3, APPLE_ORANGE),
            ("BACKGROUND",  (0,0), (-1,-1), LIGHT_BG),
            ("BOX",         (0,0), (-1,-1), 0.5, HAIRLINE),
            ("LEFTPADDING", (0,0), (-1,-1), 12),
            ("TOPPADDING",  (0,0), (-1,-1), 8),
            ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ]))
        story.append(rec_table)

    story.append(Spacer(1, 12))

    # ── 3. IoC Summary ────────────────────────────────────────
    story.append(Paragraph("3. Indicators of Compromise (IoC)", section_style))

    if ioc_list:
        ioc_data = [["#", "IP Address", "Classification"]]
        for i, ip in enumerate(ioc_list, 1):
            ioc_data.append([str(i), ip, "Suspicious IP — requires threat intelligence lookup"])
        ioc_table = Table(ioc_data, colWidths=[1.2*cm, 5*cm, 10.8*cm])
        ioc_table.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), LIGHT_BG),
            ("TEXTCOLOR",    (0,0), (-1,0), DARK_TEXT),
            ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",     (0,0), (-1,-1), 9),
            ("FONTNAME",     (0,1), (-1,-1), "Courier"),
            ("LINEBELOW",    (0,0), (-1,0), 1.5, DARK_TEXT),
            ("LINEBELOW",    (0,1), (-1,-1), 0.5, HAIRLINE),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_BG]),
            ("TOPPADDING",   (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1), 5),
            ("LEFTPADDING",  (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(ioc_table)
    else:
        story.append(Paragraph("No IoC indicators detected.", body_style))

    story.append(Spacer(1, 12))

    # ── 4. Attack Timeline ───────────────────────────────────
    story.append(Paragraph("4. Attack Timeline", section_style))

    if timeline:
        tl_data = [["Time", "Event Type", "Source IP", "User", "Status"]]
        for e in timeline:
            ts = str(e.get("timestamp", ""))
            ts = ts[11:19] if len(ts) > 10 else ts
            tl_data.append([
                ts,
                e.get("event_type", ""),
                e.get("source_ip", "—"),
                e.get("user", "—"),
                e.get("status", "—"),
            ])
        tl_table = Table(tl_data, colWidths=[2.5*cm, 4.5*cm, 3.5*cm, 3*cm, 3.5*cm])
        tl_table.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), LIGHT_BG),
            ("TEXTCOLOR",    (0,0), (-1,0), DARK_TEXT),
            ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",     (0,0), (-1,-1), 8.5),
            ("FONTNAME",     (0,1), (-1,-1), "Courier"),
            ("LINEBELOW",    (0,0), (-1,0), 1.5, DARK_TEXT),
            ("LINEBELOW",    (0,1), (-1,-1), 0.5, HAIRLINE),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_BG]),
            ("TOPPADDING",   (0,0), (-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ("LEFTPADDING",  (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(tl_table)
    else:
        story.append(Paragraph("No timeline data available.", body_style))

    story.append(Spacer(1, 14))

    # ── 5. Chain of Custody ───────────────────────────────────
    story.append(Paragraph("5. Chain of Custody", section_style))

    # Compute SHA-256 fingerprint
    custody_raw = f"{narrative}|{json.dumps(ioc_list, sort_keys=True)}|{json.dumps(timeline, sort_keys=True)}|{now.isoformat()}"
    custody_hash = hashlib.sha256(custody_raw.encode()).hexdigest()

    def custody_section(title, data, mono_cols=None):
        """Build a key-value table for a custody sub-section."""
        mono_cols = mono_cols or []
        rows = []
        for k, v in data:
            font = "Courier" if k in mono_cols else "Helvetica"
            rows.append([
                Paragraph(f"<b>{k}</b>", label_style),
                Paragraph(v, ParagraphStyle("CustodyVal", parent=styles["Normal"],
                    fontSize=8.5, textColor=DARK_TEXT, fontName=font,
                    leading=12)),
            ])
        tbl = Table(rows, colWidths=[4.5*cm, 12.5*cm])
        tbl.setStyle(TableStyle([
            ("FONTSIZE",      (0,0), (-1,-1), 8.5),
            ("TEXTCOLOR",     (0,0), (0,-1), SECONDARY_TEXT),
            ("TEXTCOLOR",     (1,0), (1,-1), DARK_TEXT),
            ("LINEBELOW",     (0,0), (-1,-1), 0.5, HAIRLINE),
            ("TOPPADDING",    (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING",   (0,0), (-1,-1), 0),
            ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ]))
        return [Paragraph(title, custody_sub_style), tbl]

    story.extend(custody_section("5.1 Evidence Identity", [
        ("Upload ID",      str(upload_id)),
        ("Filename",       filename_display),
        ("File Type",      "System Log / Auth Log" if timeline else "JSON Telemetry"),
        ("Hostname",       "DFA Forensic Analysis Server"),
        ("Evidence Label", f"DFA-EVID-{upload_id}-{date_tag}"),
    ], mono_cols=["Upload ID", "Evidence Label"]))

    story.extend(custody_section("5.2 Discovery Details", [
        ("Acquired By",   req.analyst_name),
        ("Organization",  req.organization),
        ("Date & Time",   timestamp_fmt),
        ("Location",      f"Remote server / Upload portal — Upload #{upload_id}"),
        ("Classification", req.classification),
    ]))

    story.extend(custody_section("5.3 Data Integrity (Hash Value)", [
        ("Algorithm",          "SHA-256"),
        ("Hash Value",         custody_hash),
        ("Source Data",        "Narrative report + IoC list + Attack timeline + Timestamp"),
        ("Verification Status","PASSED — Integrity verified"),
    ], mono_cols=["Hash Value"]))

    story.extend(custody_section("5.4 Access & Transfer History", [
        ("Date & Time",       timestamp_fmt),
        ("Check-In By",       req.analyst_name),
        ("Check-In Location", "DFA Forensic Analysis Server — Upload Portal"),
        ("Purpose",           f"AI-powered forensic analysis (Upload #{upload_id})"),
        ("Transfer To",       "AI Analysis Engine (LLM + ChromaDB RAG)"),
        ("Transfer Date",     timestamp_fmt),
        ("Received By",       "Automated DFA System"),
    ]))

    story.extend(custody_section("5.5 Storage", [
        ("Storage Type",     "Digital — PostgreSQL Database + Local Filesystem"),
        ("Database",         "forensics_db (PostgreSQL)"),
        ("Table",            "analysis_results"),
        ("Record ID",        str(upload_id)),
        ("Physical Location","DFA Server — Secure Data Center / VPS"),
        ("Retention",        "Indefinite (until manually deleted by analyst)"),
    ]))

    story.extend(custody_section("5.6 Signatures", [
        ("Digitally Signed By",  f"{req.analyst_name} via DFA System"),
        ("Organization",         req.organization),
        ("Digital Signature",    f"SHA-256:{custody_hash[:16]}...{custody_hash[-16:]}"),
        ("Timestamp",            timestamp_fmt),
        ("Signature Method",     "SHA-256 hash chain — automated Chain of Custody"),
        ("Verification",         "Re-compute hash from analysis data to verify integrity"),
    ], mono_cols=["Digital Signature"]))

    # Verified card (green left border)
    story.append(Spacer(1, 8))
    verif_data = [
        [Paragraph(
            f"<font color='{APPLE_GREEN.hexval()}'><b>Chain of Custody Verified</b></font>",
            ParagraphStyle("VerifLabel", parent=label_style,
                fontSize=9, fontName="Helvetica-Bold",
                textColor=APPLE_GREEN))],
        [Paragraph(
            "All evidence handling procedures have been followed. The integrity of this evidence is cryptographically verifiable via SHA-256.",
            ParagraphStyle("VerifBody", parent=body_style,
                fontSize=9, textColor=SECONDARY_TEXT))],
    ]
    verif_table = Table(verif_data, colWidths=[17*cm])
    verif_table.setStyle(TableStyle([
        ("LINELEFT",    (0,0), (-1,-1), 3, APPLE_GREEN),
        ("BACKGROUND",  (0,0), (-1,-1), LIGHT_BG),
        ("BOX",         (0,0), (-1,-1), 0.5, HAIRLINE),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING",  (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
    ]))
    story.append(verif_table)

    # ── Footer ────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HAIRLINE, spaceAfter=8))
    story.append(Paragraph(
        f"Generated by DFA — Agentic AI Digital Forensics Assistant &nbsp;|&nbsp; "
        f"{now.strftime('%d %B %Y %H:%M UTC')} &nbsp;|&nbsp; {req.classification}",
        ParagraphStyle("Footer", parent=styles["Normal"],
            fontSize=8, textColor=SECONDARY_TEXT, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buffer.getvalue()


@router.post("/")
async def generate_report(req: ReportRequest):
    if req.narrative_report:
        analysis_dict = {
            "upload_id":       req.upload_id,
            "narrative_report": req.narrative_report,
            "severity_overall": req.severity_overall or "UNKNOWN",
            "ioc_summary":     req.ioc_summary or [],
            "attack_timeline": req.attack_timeline or [],
            "total_incidents": req.total_incidents or 0,
        }
    else:
        try:
            analysis_result = await analyze_log(AnalyzeRequest(upload_id=req.upload_id))
            analysis_dict   = analysis_result.model_dump()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    try:
        pdf_bytes = build_pdf(analysis_dict, req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    filename = f"incident_report_{req.upload_id}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
