#!/usr/bin/env python3
"""Generate CR8W-branded PDF from the Developer SOP markdown."""
import sys, re, textwrap
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, KeepTogether, ListFlowable, ListItem
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
except ImportError:
    print("reportlab not installed. Install with: pip install reportlab")
    sys.exit(1)

# ── CR8W Brand Colors ──────────────────────────────────────────────────────────
DEEP_RUST = colors.HexColor("#C25B38")
CLAY_VELOUR = colors.HexColor("#E8AF93")
CAMEL_SUN = colors.HexColor("#D4A771")
SANDSTONE = colors.HexColor("#EAE3DB")
CREAM = colors.HexColor("#F4EAE0")
PALE_PEACH = colors.HexColor("#FFEEE3")
DARK_CHARCOAL = colors.HexColor("#3A3A3A")
WHITE = colors.white

# ── Parse markdown into blocks ─────────────────────────────────────────────────
def parse_md(path: str):
    text = Path(path).read_text()
    blocks = []
    current_table = None
    in_code = False
    code_lines = []
    code_lang = ""

    for line in text.splitlines():
        # Code blocks
        if line.strip().startswith("```"):
            if in_code:
                blocks.append(("code", code_lang, "\n".join(code_lines)))
                code_lines = []
                code_lang = ""
                in_code = False
            else:
                in_code = True
                code_lang = line.strip()[3:].strip()
            continue
        if in_code:
            code_lines.append(line)
            continue

        # Tables
        if line.startswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if all(c.replace("-", "").strip() == "" for c in cells):
                continue  # separator row
            if current_table is None:
                current_table = [cells]
            else:
                current_table.append(cells)
            continue
        elif current_table is not None:
            blocks.append(("table", current_table))
            current_table = None

        # Headers
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            blocks.append((f"h{level}", m.group(2)))
            continue

        # Bold list items
        m = re.match(r"^\*\*([^*]+)\*\*\s*[:–-]?\s*(.*)$", line)
        if m:
            blocks.append(("bold_line", m.group(1), m.group(2)))
            continue

        # Normal line
        stripped = line.strip()
        if stripped:
            blocks.append(("p", stripped))
        else:
            blocks.append(("spacer",))

    if current_table is not None:
        blocks.append(("table", current_table))

    return blocks

# ── Build PDF ──────────────────────────────────────────────────────────────────
def build_pdf(md_path: str, out_path: str):
    blocks = parse_md(md_path)

    doc = SimpleDocTemplate(
        out_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    style_title = ParagraphStyle(
        "CR8WTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=28,
        textColor=DEEP_RUST,
        spaceAfter=6,
        spaceBefore=0,
    )
    style_subtitle = ParagraphStyle(
        "CR8WSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=10,
        textColor=DARK_CHARCOAL,
        spaceAfter=18,
    )
    style_h1 = ParagraphStyle(
        "CR8WH1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=DEEP_RUST,
        spaceBefore=16,
        spaceAfter=8,
        borderWidth=0,
        borderColor=DEEP_RUST,
        borderPadding=0,
    )
    style_h2 = ParagraphStyle(
        "CR8WH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=DARK_CHARCOAL,
        spaceBefore=14,
        spaceAfter=6,
    )
    style_h3 = ParagraphStyle(
        "CR8WH3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=CAMEL_SUN,
        spaceBefore=10,
        spaceAfter=4,
    )
    style_body = ParagraphStyle(
        "CR8WBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=DARK_CHARCOAL,
        leading=13,
        spaceAfter=4,
    )
    style_code = ParagraphStyle(
        "CR8WCode",
        parent=styles["Code"],
        fontName="Courier",
        fontSize=7.5,
        textColor=DARK_CHARCOAL,
        backColor=SANDSTONE,
        leftIndent=8,
        rightIndent=8,
        spaceBefore=4,
        spaceAfter=4,
        leading=10,
    )
    style_bold_label = ParagraphStyle(
        "CR8WBoldLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=DEEP_RUST,
        leading=13,
        spaceAfter=2,
    )

    story = []

    # Cover
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph("CR8W Dashboard", style_title))
    story.append(Paragraph("Developer & Operations SOP", style_title))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("For Monica Blanco (Monny) and future Create Well dev team", style_subtitle))
    story.append(Paragraph("Last updated: August 2026 &nbsp;|&nbsp; Applies to: https://cr8w.com", style_subtitle))
    story.append(Spacer(1, 0.3 * inch))

    # Swirl rule
    story.append(Table([[""]], colWidths=[4.5 * inch], rowHeights=[2],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), DEEP_RUST),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ])))
    story.append(PageBreak())

    for block in blocks:
        kind = block[0]

        if kind == "h1":
            story.append(Paragraph(block[1], style_h1))
        elif kind == "h2":
            story.append(Paragraph(block[1], style_h2))
        elif kind == "h3":
            story.append(Paragraph(block[1], style_h3))
        elif kind == "h4":
            story.append(Paragraph(block[1], style_h3))
        elif kind == "p":
            txt = block[1]
            txt = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", txt)
            txt = re.sub(r"`([^`]+)`", r"<font name='Courier' size='7.5'>\1</font>", txt)
            txt = txt.replace("&", "&amp;").replace("<b>", "<b>").replace("</b>", "</b>")
            # Fix any double-escaped
            txt = txt.replace("&amp;amp;", "&amp;").replace("&amp;lt;", "&lt;").replace("&amp;gt;", "&gt;")
            story.append(Paragraph(txt, style_body))
        elif kind == "bold_line":
            label, rest = block[1], block[2]
            story.append(Paragraph(f"<b>{label}</b>{(' — ' + rest) if rest else ''}", style_body))
        elif kind == "code":
            code_text = block[2].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"<font name='Courier' size='7.5'>{code_text}</font>", style_code))
            story.append(Spacer(1, 4))
        elif kind == "table":
            rows = block[1]
            if not rows:
                continue
            col_count = max(len(r) for r in rows)
            # Pad short rows
            for r in rows:
                while len(r) < col_count:
                    r.append("")
            data = []
            for i, row in enumerate(rows):
                cells = []
                for cell in row:
                    c = cell.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    c = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", c)
                    c = re.sub(r"`([^`]+)`", r"<font name='Courier' size='7'>\1</font>", c)
                    if i == 0:
                        cells.append(Paragraph(f"<b>{c}</b>", ParagraphStyle("th", parent=style_body, fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)))
                    else:
                        cells.append(Paragraph(c, ParagraphStyle("td", parent=style_body, fontSize=8, leading=11)))
                data.append(cells)

            avail = doc.width
            col_w = avail / col_count
            t = Table(data, colWidths=[col_w] * col_count, repeatRows=1)
            tstyle = [
                ("BACKGROUND", (0, 0), (-1, 0), DEEP_RUST),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BACKGROUND", (0, 1), (-1, -1), CREAM),
                ("GRID", (0, 0), (-1, -1), 0.5, SANDSTONE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
            for ri in range(1, len(data)):
                if ri % 2 == 0:
                    tstyle.append(("BACKGROUND", (0, ri), (-1, ri), PALE_PEACH))
            t.setStyle(TableStyle(tstyle))
            story.append(Spacer(1, 6))
            story.append(t)
            story.append(Spacer(1, 6))
        elif kind == "spacer":
            story.append(Spacer(1, 6))

    doc.build(story)
    print(f"✓ PDF generated: {out_path}")

if __name__ == "__main__":
    md = "/Users/monicablanco/Desktop/createwell/CR8W_home_v2/CR8W_Developer_SOP.md"
    pdf = "/Users/monicablanco/Desktop/createwell/CR8W_home_v2/CR8W_Developer_SOP.pdf"
    build_pdf(md, pdf)
