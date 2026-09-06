#!/usr/bin/env python3
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "pitch.pptx"
MEDIA = ROOT / "web" / "pitch-media"

NAVY = RGBColor(0x25, 0x45, 0x63)
SAFFRON = RGBColor(0xC5, 0x6A, 0x1A)
DEEP = RGBColor(0x0E, 0x1C, 0x1B)
WHITE = RGBColor(0xFF, 0xF8, 0xEE)
CREAM = RGBColor(0xF4, 0xEF, 0xE6)
INK = RGBColor(0x23, 0x1F, 0x1A)
MUTED = RGBColor(0x5C, 0x56, 0x4C)
HEAD = RGBColor(0xEF, 0xE6, 0xD8)
ZEBRA = RGBColor(0xF7, 0xF1, 0xE8)
CARD = RGBColor(0xFB, 0xF7, 0xF0)
W = Inches(13.333)
H = Inches(7.5)


def fill_shape(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def add_rect(slide, l, t, w, h, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    fill_shape(shape, color)
    return shape


def textbox(slide, l, t, w, h, text, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Calibri"
    return box


def footer(slide, page, total=9, light=True):
    color = MUTED if light else RGBColor(0xD5, 0xCD, 0xC0)
    textbox(slide, Inches(0.45), Inches(7.12), Inches(9), Inches(0.26), "Maharashtra Civic Alerts  ·  Codex Build House Pune", 11, False, color)
    textbox(slide, Inches(11.3), Inches(7.12), Inches(1.5), Inches(0.26), f"{page} / {total}", 11, True, color, PP_ALIGN.RIGHT)


def style_cell(cell, text, fill, font, size=11, bold=False):
    cell.text = ""
    p = cell.text_frame.paragraphs[0]
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = font
    run.font.name = "Calibri"
    cell.fill.solid()
    cell.fill.fore_color.rgb = fill
    cell.text_frame.word_wrap = True


def add_table(slide, left, top, width, height, headers, rows):
    table = slide.shapes.add_table(len(rows) + 1, len(headers), left, top, width, height).table
    for i in range(len(headers)):
        table.columns[i].width = int(width / len(headers))
    for c, header in enumerate(headers):
        style_cell(table.cell(0, c), header, HEAD, NAVY, 10, True)
    for r, row in enumerate(rows, start=1):
        fill = CARD if r % 2 else ZEBRA
        for c, value in enumerate(row):
            style_cell(table.cell(r, c), value, fill, INK, 11, c == 0)
    return table


def paper_slide(prs, kicker, title, page):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    if (MEDIA / "paper-wash.jpg").exists():
        slide.shapes.add_picture(str(MEDIA / "paper-wash.jpg"), 0, 0, W, H)
    else:
        add_rect(slide, 0, 0, W, H, CREAM)
    add_rect(slide, 0, 0, Inches(0.14), H, SAFFRON)
    textbox(slide, Inches(0.45), Inches(0.22), Inches(12), Inches(0.28), kicker, 12, True, SAFFRON)
    textbox(slide, Inches(0.45), Inches(0.48), Inches(12.4), Inches(0.7), title, 24, True, NAVY)
    footer(slide, page, light=True)
    return slide


def title_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    if (MEDIA / "title-wash.jpg").exists():
        slide.shapes.add_picture(str(MEDIA / "title-wash.jpg"), 0, 0, W, H)
    else:
        add_rect(slide, 0, 0, W, H, DEEP)
    add_rect(slide, 0, 0, Inches(0.14), H, SAFFRON)
    textbox(slide, Inches(0.55), Inches(0.35), Inches(12), Inches(0.3), "CODEX BUILD HOUSE  ·  PUNE  ·  BRIEFING", 12, True, SAFFRON)
    textbox(slide, Inches(0.55), Inches(0.75), Inches(12), Inches(1.2), "Maharashtra Civic Alerts", 40, True, WHITE)
    textbox(slide, Inches(0.55), Inches(2.0), Inches(12), Inches(0.4), "महाराष्ट्र नागरी सतर्कता", 18, False, CREAM)
    textbox(slide, Inches(0.55), Inches(2.5), Inches(12), Inches(0.8), "A bilingual public-information hub that shows official warnings by district, says how fresh each source is, and refuses to treat silence as safety.", 16, False, CREAM)
    stats = [("36", "Districts"), ("5", "Sources"), ("12", "Service dirs"), ("EN+MR", "No AI rewrite")]
    for i, (n, label) in enumerate(stats):
        x = Inches(0.55) + i * Inches(3.1)
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(3.5), Inches(2.9), Inches(1.15))
        fill_shape(box, RGBColor(0x1C, 0x3A, 0x37))
        textbox(slide, x + Inches(0.15), Inches(3.58), Inches(2.6), Inches(0.55), n, 26, True, WHITE)
        textbox(slide, x + Inches(0.15), Inches(4.15), Inches(2.6), Inches(0.35), label, 12, False, CREAM)
    textbox(slide, Inches(0.55), Inches(5.0), Inches(12), Inches(1.6), "Agenda: problem table · session model · source matrix · operating rules · place lookups · information model · limits · review path", 15, False, CREAM)
    footer(slide, 1, light=False)


def close_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    if (MEDIA / "title-wash.jpg").exists():
        slide.shapes.add_picture(str(MEDIA / "title-wash.jpg"), 0, 0, W, H)
    add_rect(slide, 0, 0, Inches(0.14), H, SAFFRON)
    textbox(slide, Inches(0.5), Inches(0.35), Inches(12), Inches(0.28), "REVIEW PATH", 12, True, SAFFRON)
    textbox(slide, Inches(0.5), Inches(0.7), Inches(12), Inches(0.6), "Open these in the review", 28, True, WHITE)
    links = [
        ("Live demo", "https://maharashtra-sachet.mangeshraut712.workers.dev"),
        ("GitHub", "https://github.com/mangeshraut712/maharashtra-sachet"),
        ("HTML briefing", "https://maharashtra-sachet.mangeshraut712.workers.dev/pitch.html"),
        ("Judge sequence", "Banner → status → Navi Mumbai → Marathi → source health"),
    ]
    for i, (title, url) in enumerate(links):
        r, c = divmod(i, 2)
        x = Inches(0.5) + c * Inches(6.3)
        y = Inches(1.6) + r * Inches(1.7)
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(6.05), Inches(1.5))
        fill_shape(box, RGBColor(0x1C, 0x3A, 0x37))
        textbox(slide, x + Inches(0.25), y + Inches(0.25), Inches(5.55), Inches(0.4), title, 18, True, WHITE)
        textbox(slide, x + Inches(0.25), y + Inches(0.75), Inches(5.55), Inches(0.5), url, 13, False, CREAM)
    textbox(slide, Inches(0.5), Inches(5.3), Inches(12.2), Inches(1.2), "Local labelled demo only: npm run demo → http://127.0.0.1:8799. Never production.\nBuilder: Mangesh Raut  ·  +91 7276819090  ·  mbr63drexel@gmail.com", 14, False, CREAM)
    footer(slide, 9, light=False)


def main():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    title_slide(prs)

    s = paper_slide(prs, "PROBLEM", "Residents should not have to guess which feed is live", 2)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Resident question", "Typical today", "Failure mode", "This hub answers"],
        [
            ["Is this source live?", "Empty map or last screenshot", "Stale data looks like all-clear", "Per-source freshness and status"],
            ["Where does it apply?", "City or village name on a poster", "Wrong district, false precision", "District alias; dual-candidate when needed"],
            ["What should I do?", "Scattered agency pages", "Instructions rewritten or dropped", "Original CAP text, EN/MR labelled"],
            ["Who issued it?", "Reposted WhatsApp card", "Lost attribution", "Source identity + official directory"],
            ["Is the warning still on?", "Old graphic stays in chat", "Cancelled alert still believed", "Actual / Update / Cancel / expiry"],
        ],
    )

    s = paper_slide(prs, "SOLUTION", "One session returns status, place, bulletin and services", 3)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Step", "Input", "Output", "Honesty rule"],
        [
            ["1. Identify the site", "—", "Independent banner + NDMA SACHET link", "Not a government website"],
            ["2. Read latest status", "—", "healthy / degraded / stale + source ages", "Partial coverage is expected"],
            ["3. Find a place", "Pune, Sawantwadi, Navi Mumbai, Marunji", "District ID(s), precision = district-alias", "No invented village polygons"],
            ["4. Read the bulletin", "District filter", "Active Actual records only", "0 alerts ≠ all-clear"],
            ["5. Open services", "Power, water, health, transport", "Official portal + live vs directory", "Directory is not a live incident feed"],
        ],
    )

    s = paper_slide(prs, "COVERAGE MATRIX", "Five official sources, two intentionally disconnected", 4)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Source", "Kind", "Runtime", "What is stored", "Resident meaning"],
        [
            ["SACHET / NDMA CAP", "Public warnings", "Connected", "CAP lifecycle + retained cancels", "Primary official bulletin"],
            ["IMD", "Weather notices", "Connected", "Official text only", "No invented severity"],
            ["INCOIS", "Ocean / quake", "Connected", "Arabian Sea relevant events", "Pacific quakes excluded"],
            ["CWC FloodWatch", "Flood", "Disabled", "No adapter", "Use official directory"],
            ["CPCB AQI", "Air quality", "Disabled", "No key / not enabled", "Concentration ≠ AQI warning"],
        ],
    )

    s = paper_slide(prs, "OPERATING MODEL", "Read-only relay: collect, retain, expire, never invent", 5)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Stage", "Rule"],
        [
            ["01 Cron + heal-on-read", "Every minute; recovery if enabled sources older than 5 minutes; 60s cooldown"],
            ["02 Collectors", "Bounded byte/time limits, TLS allowlist, token-owned D1 lease"],
            ["03 CAP lifecycle", "Actual / Update / Cancel / expiry retained so old warnings die"],
            ["04 Public API", "GET only. No refresh POST. Demo mutation routes return 405 in production"],
            ["05 Host", "Cloudflare Workers + D1. Fixtures only via npm run demo, never production"],
            ["06 Empty bulletin", "UI states it is not an all-clear. Call 112 in danger"],
        ],
    )

    s = paper_slide(prs, "PLACE RESOLUTION", "Typed names resolve to districts, not village polygons", 6)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Query", "Result", "Precision", "Why it matters"],
        [
            ["Pune", "Pune", "district", "Direct district match"],
            ["Navi Mumbai", "Raigad and Thane", "district-alias", "Resident must pick one"],
            ["Sawantwadi", "Sindhudurg", "district-alias", "Town ≠ verified ward"],
            ["Marunji", "Pune", "district-alias", "Place maps to district only"],
            ["Panaji", "No Maharashtra match", "—", "Goa is excluded on purpose"],
        ],
    )

    s = paper_slide(prs, "INFORMATION MODEL", "What the resident can actually know", 7)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Surface", "Fields shown", "Not shown"],
        [
            ["Latest status", "Overall mode, generation time, polling interval", "Guarantee that the area is safe"],
            ["Source health", "ok/stale/disabled, last success, error class, count", "Raw upstream bodies or keys"],
            ["Bulletin", "Issuer, area, class, original instructions, expiry", "AI paraphrase, village polygons"],
            ["Citizen services", "12 categories, official URL, live vs directory", "Statewide live power/water/AQI feeds"],
            ["Phone guide", "How to check device government-alert settings", "A button that sends a cell broadcast"],
        ],
    )

    s = paper_slide(prs, "LIMITS", "Public does / does not so the demo cannot overclaim", 8)
    add_table(
        s,
        Inches(0.45),
        Inches(1.25),
        Inches(12.45),
        Inches(5.6),
        ["Does", "Does not"],
        [
            ["Relay official public feeds with attribution", "Speak as government or dispatch 112"],
            ["Keep cancel/expiry so old warnings die", "Send carrier cell broadcast / WEA"],
            ["Map places to 36 Maharashtra districts", "Claim complete village or ward coverage"],
            ["Label CWC/CPCB as disconnected", "Invent flood or AQI alerts"],
            ["Offer a labelled local fixture demo", "Seed production with test alerts"],
            ["Preserve original EN/MR wording", "Rewrite emergency instructions with a model"],
        ],
    )

    close_slide(prs)
    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
