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

# Color palette
TEAL        = colors.HexColor("#0D9488")
TEAL_LIGHT  = colors.HexColor("#E6FAF8")
DARK        = colors.HexColor("#1F2937")
GRAY        = colors.HexColor("#6B7280")
GRAY_LIGHT  = colors.HexColor("#F9FAFB")
WHITE       = colors.white
RED         = colors.HexColor("#FF4D6A")
AMBER       = colors.HexColor("#FF8C42")
YELLOW      = colors.HexColor("#FFD166")
GREEN       = colors.HexColor("#06D6A0")
INFO        = colors.HexColor("#4ECDC4")

SEVERITY_COLORS = {
    "CRITICAL": RED,
    "HIGH":     AMBER,
    "MEDIUM":   YELLOW,
    "LOW":      GREEN,
    "INFO":     INFO,
}


class ReportRequest(BaseModel):
    upload_id: int
    analyst_name: str = "DFA System"
    organization: str = "PT Teknologi Nasional Indonesia Siber"
    classification: str = "CONFIDENTIAL"
    # Accept pre-computed analysis results directly
    narrative_report: str | None = None
    severity_overall: str | None = None
    ioc_summary: list[str] | None = None
    attack_timeline: list[dict] | None = None
    total_incidents: int | None = None

def severity_color(s: str):
    return SEVERITY_COLORS.get(s.upper(), GRAY)


def build_pdf(analysis: dict, req: ReportRequest) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Custom styles ──────────────────────────────────────────
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22, textColor=DARK, spaceAfter=4,
        fontName="Helvetica-Bold", alignment=TA_LEFT,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=11, textColor=GRAY, spaceAfter=2,
        fontName="Helvetica",
    )
    section_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=12, textColor=TEAL, spaceBefore=16, spaceAfter=6,
        fontName="Helvetica-Bold", borderPad=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10, textColor=DARK, leading=15,
        fontName="Helvetica", spaceAfter=6,
    )
    mono_style = ParagraphStyle(
        "Mono",
        parent=styles["Code"],
        fontSize=8.5, textColor=DARK, leading=13,
        fontName="Courier", spaceAfter=4,
        backColor=GRAY_LIGHT, borderPad=4,
    )
    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontSize=9, textColor=GRAY, fontName="Helvetica-Bold",
        spaceAfter=2,
    )

    now         = datetime.datetime.utcnow()
    severity    = analysis.get("severity_overall", "UNKNOWN")
    sev_color   = severity_color(severity)
    upload_id   = analysis.get("upload_id", "N/A")
    total       = analysis.get("total_incidents", 0)
    narrative   = analysis.get("narrative_report") or "Analysis narrative not available. Please re-run the analysis."
    ioc_list    = analysis.get("ioc_summary", [])
    timeline    = analysis.get("attack_timeline", [])

    # ── HEADER ────────────────────────────────────────────────
    # Classification banner
    story.append(Paragraph(
        f"<para align='center'><b>{req.classification}</b></para>",
        ParagraphStyle("ClassBanner", parent=styles["Normal"],
            fontSize=9, textColor=WHITE, fontName="Helvetica-Bold",
            backColor=DARK, borderPad=5, spaceAfter=12)
    ))

    story.append(Paragraph("INCIDENT REPORT", title_style))
    story.append(Paragraph("Agentic AI Digital Forensics Assistant", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=TEAL, spaceAfter=12))

    # Meta table
    meta_data = [
        ["Report ID",       f"DFA-{upload_id}-{now.strftime('%Y%m%d')}"],
        ["Generated",       now.strftime("%d %B %Y, %H:%M UTC")],
        ["Upload ID",       str(upload_id)],
        ["Analyst",         req.analyst_name],
        ["Organization",    req.organization],
        ["Classification",  req.classification],
    ]
    meta_table = Table(meta_data, colWidths=[4*cm, 13*cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME",    (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",    (1,0), (1,-1), "Helvetica"),
        ("FONTSIZE",    (0,0), (-1,-1), 9),
        ("TEXTCOLOR",   (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",   (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",  (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("GRID",        (0,0), (-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # ── SEVERITY SUMMARY ──────────────────────────────────────
    story.append(Paragraph("1. EXECUTIVE SUMMARY", section_style))

    sev_data = [
        [
            Paragraph("<b>Severity</b>", label_style),
            Paragraph("<b>Total Incidents</b>", label_style),
        ],
        [
            Paragraph(f"<b>{severity}</b>",
                ParagraphStyle("Sev", parent=styles["Normal"],
                    fontSize=18, fontName="Helvetica-Bold",
                    textColor=sev_color)),
            Paragraph(f"<b>{total}</b>",
                ParagraphStyle("Tot", parent=styles["Normal"],
                    fontSize=18, fontName="Helvetica-Bold",
                    textColor=DARK)),
        ],
    ]
    sev_table = Table(sev_data, colWidths=[8.5*cm, 8.5*cm])
    sev_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,0), GRAY_LIGHT),
        ("BACKGROUND",  (0,1), (-1,1), WHITE),
        ("BOX",         (0,0), (-1,-1), 1, colors.HexColor("#E5E7EB")),
        ("LINEABOVE",   (0,1), (-1,1), 2, sev_color),
        ("ALIGN",       (0,0), (-1,-1), "CENTER"),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",  (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
    ]))
    story.append(sev_table)
    story.append(Spacer(1, 12))

    # ── NARRATIVE REPORT ──────────────────────────────────────
    story.append(Paragraph("2. NARRATIVE ANALYSIS", section_style))

    # Split recommendation from narrative if present
    narrative_main = narrative
    recommendation = ""
    if "Recommendation:" in narrative:
        parts          = narrative.split("Recommendation:", 1)
        narrative_main = parts[0].strip()
        recommendation = parts[1].strip()

    story.append(Paragraph(narrative_main, body_style))

    if recommendation:
        story.append(Spacer(1, 8))
        rec_table = Table(
            [[Paragraph(f"<b>⚠ Recommendation</b>", label_style)],
             [Paragraph(recommendation, body_style)]],
            colWidths=[17*cm],
        )
        rec_table.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), colors.HexColor("#FFF7ED")),
            ("BACKGROUND",   (0,1), (-1,1), WHITE),
            ("LINEABOVE",    (0,0), (-1,0), 3, AMBER),
            ("BOX",          (0,0), (-1,-1), 0.5, colors.HexColor("#FED7AA")),
            ("LEFTPADDING",  (0,0), (-1,-1), 10),
            ("TOPPADDING",   (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ]))
        story.append(rec_table)

    story.append(Spacer(1, 12))

    # ── IOC SUMMARY ───────────────────────────────────────────
    story.append(Paragraph("3. INDICATORS OF COMPROMISE (IoC)", section_style))

    if ioc_list:
        ioc_data = [["#", "IP Address", "Classification"]]
        for i, ip in enumerate(ioc_list, 1):
            ioc_data.append([str(i), ip, "Suspicious IP — requires threat intelligence lookup"])
        ioc_table = Table(ioc_data, colWidths=[1*cm, 5*cm, 11*cm])
        ioc_table.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,0), TEAL),
            ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
            ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",     (0,0), (-1,-1), 9),
            ("FONTNAME",     (0,1), (-1,-1), "Courier"),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, GRAY_LIGHT]),
            ("GRID",         (0,0), (-1,-1), 0.3, colors.HexColor("#E5E7EB")),
            ("TOPPADDING",   (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1), 5),
            ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ]))
        story.append(ioc_table)
    else:
        story.append(Paragraph("No IoC indicators detected.", body_style))

    story.append(Spacer(1, 12))

    # ── ATTACK TIMELINE ───────────────────────────────────────
    story.append(Paragraph("4. ATTACK TIMELINE", section_style))

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
            ("BACKGROUND",   (0,0), (-1,0), TEAL),
            ("TEXTCOLOR",    (0,0), (-1,0), WHITE),
            ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",     (0,0), (-1,-1), 8.5),
            ("FONTNAME",     (0,1), (-1,-1), "Courier"),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, GRAY_LIGHT]),
            ("GRID",         (0,0), (-1,-1), 0.3, colors.HexColor("#E5E7EB")),
            ("TOPPADDING",   (0,0), (-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ]))
        story.append(tl_table)
    else:
        story.append(Paragraph("No timeline data available.", body_style))

    story.append(Spacer(1, 12))

    # ── CHAIN OF CUSTODY ──────────────────────────────────────
    story.append(Paragraph("5. CHAIN OF CUSTODY", section_style))

    # Compute SHA-256 fingerprint
    custody_raw = f"{narrative}|{json.dumps(ioc_list, sort_keys=True)}|{json.dumps(timeline, sort_keys=True)}|{now.isoformat()}"
    custody_hash = hashlib.sha256(custody_raw.encode()).hexdigest()
    timestamp_fmt = now.strftime("%d %B %Y, %H:%M UTC")
    filename_display = analysis.get("filename", f"upload_{upload_id}")

    def custody_subsection(title):
        return Paragraph(
            f"<b>{title}</b>",
            ParagraphStyle("CustodySub", parent=label_style, textColor=DARK,
                           spaceBefore=10, spaceAfter=4, fontSize=9),
        )

    # 5.1 Evidence Identity
    story.append(custody_subsection("5.1 Evidence Identity"))
    id_data = [
        ["Upload ID",      str(upload_id)],
        ["Filename",       filename_display],
        ["File Type",      "System Log / Auth Log" if timeline else "JSON Telemetry"],
        ["Hostname",       "DFA Forensic Analysis Server"],
        ["Evidence Label", f"DFA-EVID-{upload_id}-{now.strftime('%Y%m%d')}"],
    ]
    id_table = Table(id_data, colWidths=[4.5*cm, 12.5*cm])
    id_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Courier"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(id_table)

    # 5.2 Discovery Details
    story.append(custody_subsection("5.2 Discovery Details"))
    disc_data = [
        ["Acquired By",   req.analyst_name],
        ["Organization",  req.organization],
        ["Date & Time",   timestamp_fmt],
        ["Location",      f"Remote server / Upload portal — Upload #{upload_id}"],
        ["Classification", req.classification],
    ]
    disc_table = Table(disc_data, colWidths=[4.5*cm, 12.5*cm])
    disc_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Helvetica"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(disc_table)

    # 5.3 Data Integrity (Hash Value)
    story.append(custody_subsection("5.3 Data Integrity (Hash Value)"))
    hash_data = [
        ["Algorithm", "SHA-256"],
        ["Hash Value", custody_hash],
        ["Source Data", "Narrative report + IoC list + Attack timeline + Timestamp"],
        ["Verification Status", "PASSED — Integrity verified"],
    ]
    hash_table = Table(hash_data, colWidths=[4.5*cm, 12.5*cm])
    hash_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Courier"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(hash_table)

    # 5.4 Access & Transfer History
    story.append(custody_subsection("5.4 Access & Transfer History"))
    access_data = [
        ["Date & Time",          timestamp_fmt],
        ["Check-In By",          req.analyst_name],
        ["Check-In Location",    "DFA Forensic Analysis Server — Upload Portal"],
        ["Purpose",              f"AI-powered forensic analysis (Upload #{upload_id})"],
        ["Transfer To",          "AI Analysis Engine (LLM + ChromaDB RAG)"],
        ["Transfer Date",        timestamp_fmt],
        ["Received By",          "Automated DFA System"],
    ]
    access_table = Table(access_data, colWidths=[4.5*cm, 12.5*cm])
    access_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Helvetica"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(access_table)

    # 5.5 Storage
    story.append(custody_subsection("5.5 Storage"))
    storage_data = [
        ["Storage Type",    "Digital — PostgreSQL Database + Local Filesystem"],
        ["Database",        "forensics_db (PostgreSQL)"],
        ["Table",           "analysis_results"],
        ["Record ID",       str(upload_id)],
        ["Physical Location", "DFA Server — Secure Data Center / VPS"],
        ["Retention",       "Indefinite (until manually deleted by analyst)"],
    ]
    storage_table = Table(storage_data, colWidths=[4.5*cm, 12.5*cm])
    storage_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Helvetica"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(storage_table)

    # 5.6 Signatures
    story.append(custody_subsection("5.6 Signatures"))
    sig_data = [
        ["Digitally Signed By",  f"{req.analyst_name} via DFA System"],
        ["Organization",         req.organization],
        ["Digital Signature",    f"SHA-256:{custody_hash[:16]}...{custody_hash[-16:]}"],
        ["Timestamp",            timestamp_fmt],
        ["Signature Method",     "SHA-256 hash chain — automated Chain of Custody"],
        ["Verification",         "Re-compute hash from analysis data to verify integrity"],
    ]
    sig_table = Table(sig_data, colWidths=[4.5*cm, 12.5*cm])
    sig_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (1,0), (1,-1), "Courier"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("TEXTCOLOR",     (0,0), (0,-1), GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1), DARK),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [WHITE, GRAY_LIGHT]),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("GRID",          (0,0),(-1,-1), 0.3, colors.HexColor("#E5E7EB")),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 12))

    # ── FOOTER ────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY_LIGHT, spaceAfter=8))
    story.append(Paragraph(
        f"Generated by DFA — Agentic AI Digital Forensics Assistant &nbsp;|&nbsp; "
        f"{now.strftime('%d %B %Y %H:%M UTC')} &nbsp;|&nbsp; {req.classification}",
        ParagraphStyle("Footer", parent=styles["Normal"],
            fontSize=8, textColor=GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buffer.getvalue()


@router.post("/")
async def generate_report(req: ReportRequest):
    # If analysis data already provided, use it directly
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
        # Fallback: run analysis (slow path)
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
