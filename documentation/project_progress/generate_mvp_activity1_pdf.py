from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    LongTable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "Uy_Activity1_MVP_Test_Scenarios_and_Test_Cases.pdf"

BLUE = colors.HexColor("#1F4E78")
ACCENT = colors.HexColor("#2E75B6")
LIGHT_BLUE = colors.HexColor("#D9EAF7")
PALE_BLUE = colors.HexColor("#F2F7FB")
RED = colors.HexColor("#C00000")
LIGHT_RED = colors.HexColor("#FCE8E8")
INK = colors.HexColor("#17202A")
MUTED = colors.HexColor("#5E6A73")
GRID = colors.HexColor("#8B98A4")


pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", r"C:\Windows\Fonts\ariali.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BodyA", fontName="Arial", fontSize=9.2, leading=12.1, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="BodySmall", parent=styles["BodyA"], fontSize=8.2, leading=10.5))
styles.add(ParagraphStyle(name="BodyItalic", parent=styles["BodyA"], fontName="Arial-Italic"))
styles.add(ParagraphStyle(name="H1Blue", fontName="Arial-Bold", fontSize=17, leading=20, textColor=BLUE, spaceBefore=7, spaceAfter=7))
styles.add(ParagraphStyle(name="H2Blue", fontName="Arial-Bold", fontSize=12.8, leading=15.5, textColor=ACCENT, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle(name="CoverKicker", fontName="Arial-Bold", fontSize=11, leading=14, textColor=BLUE, alignment=TA_CENTER, spaceAfter=6))
styles.add(ParagraphStyle(name="CoverTitle", fontName="Arial-Bold", fontSize=24, leading=28, textColor=BLUE, alignment=TA_CENTER, spaceAfter=5))
styles.add(ParagraphStyle(name="CoverSubtitle", fontName="Arial-Bold", fontSize=15, leading=19, textColor=ACCENT, alignment=TA_CENTER, spaceAfter=5))
styles.add(ParagraphStyle(name="Center", parent=styles["BodyA"], alignment=TA_CENTER))
styles.add(ParagraphStyle(name="Cell", fontName="Arial", fontSize=8.1, leading=10.2, textColor=INK))
styles.add(ParagraphStyle(name="CellBold", parent=styles["Cell"], fontName="Arial-Bold"))
styles.add(ParagraphStyle(name="CellWhite", parent=styles["Cell"], fontName="Arial-Bold", textColor=colors.white))
styles.add(ParagraphStyle(name="CaseTitle", fontName="Arial-Bold", fontSize=13.2, leading=16, textColor=BLUE, spaceAfter=5))
styles.add(ParagraphStyle(name="CaseMeta", fontName="Arial-Italic", fontSize=8.8, leading=11, textColor=MUTED, spaceAfter=7))


def P(text: str, style: str = "BodyA") -> Paragraph:
    return Paragraph(text, styles[style])


def numbered(items: list[str]) -> str:
    return "<br/>".join(f"{index}. {escape(item)}" for index, item in enumerate(items, 1))


def bullets(items: list[str]) -> str:
    return "<br/>".join(f"&#8226; {escape(item)}" for item in items)


SCENARIOS = [
    ("TS-RL-01", "Verify that a citizen can browse Rights Guide categories and view the corresponding plain-language articles and legal references."),
    ("TS-RL-02", "Verify that the Rights Guides search returns relevant categories or articles for a valid keyword and a clear empty state when no guide matches."),
    ("TS-RL-03", "Verify that Juris AI search returns relevant Supreme Court cases or Republic Acts with citations, research-aid notices, and links to authoritative sources."),
    ("TS-RL-04", "Verify that Juris AI protects private information and handles unavailable or empty research results safely without inventing legal sources."),
    ("TS-TR-01", "Verify that AI Triage validates required basic information and applies the configured pro-bono income-eligibility rules before continuing."),
    ("TS-TR-02", "Verify that a citizen can submit complete concern details and that the system creates a pending case and linked triage assessment."),
    ("TS-TR-03", "Verify that AI Triage ranks verified volunteer attorneys using legal-practice fit, location, urgency, availability, and pro-bono indicators."),
    ("TS-TR-04", "Verify that a citizen can request consultation from a selected match and receives a safe fallback when no attorney is available or the request cannot be completed."),
]


CASES = [
    {
        "id": "TC_RL_001",
        "title": "Browse Rights Guides and View Article Details",
        "scenario": "TS-RL-01",
        "kind": "Positive / Happy Path",
        "pre": [
            "The JusticeLink citizen web application is available in a supported browser.",
            "A citizen is signed in.",
            "The rights_categories and rights_articles tables contain published guide data.",
        ],
        "steps": [
            "Open the citizen Legal Library.",
            "Select the Rights Guides tab.",
            "Review the category cards and choose a category such as Labor Rights.",
            "Select an article that has an in-app detail.",
            "Select an article that has an external source link, if available.",
        ],
        "data": "Category: Labor Rights\nArticle example: Minimum Wage / Wage Protection",
        "expected": [
            "Rights Guide categories and their articles load without an application error.",
            "The selected article expands to show its plain-language detail and legal section when stored in the library.",
            "An article with a source URL opens the configured legal source in a new browser tab.",
            "The citizen remains able to browse other categories and articles.",
        ],
    },
    {
        "id": "TC_RL_002",
        "title": "Search Rights Guides with a Valid Keyword",
        "scenario": "TS-RL-02",
        "kind": "Positive / Happy Path",
        "pre": [
            "The Legal Library has loaded its guide categories and articles.",
            "At least one guide record contains the keyword in its title, description, detail, or legal section.",
        ],
        "steps": [
            "Open Legal Library and remain on Rights Guides.",
            "Enter the search keyword in the guide search field.",
            "Review the filtered category and article list.",
            "Open one matching article.",
        ],
        "data": "Search keyword: sahod",
        "expected": [
            "Only categories with a category-level match or at least one matching article remain visible.",
            "Matching articles related to wages or salary are displayed.",
            "Opening a result shows its stored detail or source link.",
            "The application does not modify the underlying library data.",
        ],
    },
    {
        "id": "TC_RL_003",
        "title": "Search Rights Guides with No Matching Result",
        "scenario": "TS-RL-02",
        "kind": "Negative / Error Path",
        "pre": [
            "The Legal Library has loaded successfully.",
            "No guide category or article contains the test keyword.",
        ],
        "steps": [
            "Open Legal Library and select Rights Guides.",
            "Enter the non-matching keyword in the search field.",
            "Observe the results area.",
            "Clear the search field and search again with a valid keyword.",
        ],
        "data": "Search keyword: xyznonexistentright999",
        "expected": [
            "No unrelated category or article is displayed as a match.",
            "A clear no-results message is shown (for example, 'Walang nahanap na resulta').",
            "The application does not crash or display a raw database error.",
            "Clearing or replacing the keyword restores normal searching.",
        ],
    },
    {
        "id": "TC_RL_004",
        "title": "Search Juris AI for a Relevant Supreme Court Case",
        "scenario": "TS-RL-03",
        "kind": "Positive / Happy Path",
        "pre": [
            "The citizen is signed in and has a valid session token.",
            "The JusticeLink backend and Juris search service are available.",
            "Juris contains at least one relevant jurisprudence record for the test issue.",
        ],
        "steps": [
            "Open Legal Library and select Cases.",
            "Enter a legal issue in the Juris search field.",
            "Select Search Juris.",
            "Review the returned cards and open the Juris record and authoritative source links.",
            "Repeat using the Laws tab to confirm the Republic Acts dataset is selected.",
        ],
        "data": "Cases query: illegal dismissal\nLaws query: violence against women Republic Act",
        "expected": [
            "The Cases search requests the jurisprudence dataset and the Laws search requests the republic-acts dataset.",
            "Each returned card identifies the legal record by title and citation when available.",
            "The card labels the summary as an AI-generated research aid and tells the user to verify it.",
            "The Juris record link works, and an authoritative-source link is shown when supplied by the service.",
            "Low-relevance or malformed records are not presented as valid results.",
        ],
    },
    {
        "id": "TC_RL_005",
        "title": "Handle Juris AI Service Unavailability",
        "scenario": "TS-RL-04",
        "kind": "Negative / Recovery Path",
        "pre": [
            "The citizen is signed in and viewing the Cases or Laws tab.",
            "The Juris API is unavailable, times out, or returns a service error after its retry attempt.",
        ],
        "steps": [
            "Enter a valid legal research query.",
            "Start the Juris search.",
            "Observe the error state after the request fails.",
            "Restore the service and select Retry.",
        ],
        "data": "Query: consumer protection refund\nSimulated service response: HTTP 503",
        "expected": [
            "The page displays a clear temporary-unavailability message instead of a raw exception.",
            "No fabricated case, citation, statute, or source link is displayed.",
            "A Retry action remains available and the page remains usable.",
            "After service restoration, Retry performs the search and can display valid results.",
        ],
    },
    {
        "id": "TC_RL_006",
        "title": "Remove Personal Information Before Juris Search",
        "scenario": "TS-RL-04",
        "kind": "Security / Privacy Path",
        "pre": [
            "A test environment can inspect the outbound query sent from the backend to Juris.",
            "The privacy-preserving research planner and redaction guard are enabled.",
        ],
        "steps": [
            "Submit a research request containing a name, email address, phone number, street address, and a generic legal issue.",
            "Capture the query parameters sent by the backend to Juris.",
            "Force the AI query planner to fail and repeat the request to exercise the privacy fallback.",
        ],
        "data": "Complainant: Juan Dela Cruz; Email: juan@example.com; Phone: 0917-123-4567; Address: 12 Mabini Street, Manila; Issue: illegal dismissal and unpaid wages",
        "expected": [
            "The outbound Juris query does not contain the person's name, email, phone number, or street address.",
            "The generic legal issue may remain when it can be safely separated from the identifiers.",
            "If the AI planner fails, the backend uses a generic Philippine-law research query rather than forwarding the raw narrative.",
            "No private test data appears in the Juris URL or returned UI links.",
        ],
    },
    {
        "id": "TC_TR_001",
        "title": "Continue Triage with Complete Eligible Basic Information",
        "scenario": "TS-TR-01",
        "kind": "Positive / Happy Path",
        "pre": [
            "A citizen is signed in and can open Legal Help Assessment.",
            "The citizen is eligible for pro-bono matching under the configured income rule.",
        ],
        "steps": [
            "Open Legal Help Assessment.",
            "Select a legal problem category.",
            "Select an urgency level.",
            "Select an eligible monthly household income bracket.",
            "Enter the province or city of the case.",
            "Select Susunod.",
        ],
        "data": "Category: Labor & Employment (Trabaho)\nUrgency: high\nIncome: Below ₱15,000/buwan\nLocation: Bulacan",
        "expected": [
            "Susunod stays disabled until all four required basic fields contain valid values.",
            "The eligible income bracket does not display a blocking message.",
            "After all fields are complete, Susunod is enabled.",
            "Selecting Susunod opens Concern Details and shows Hakbang 2 ng 3.",
        ],
    },
    {
        "id": "TC_TR_002",
        "title": "Block Ineligible Income from Continuing",
        "scenario": "TS-TR-01",
        "kind": "Negative / Validation Path",
        "pre": [
            "A citizen is signed in and viewing Hakbang 1 ng 3.",
        ],
        "steps": [
            "Complete the category, urgency, and location fields.",
            "Select the highest monthly household income bracket.",
            "Review the eligibility message and the Susunod button.",
            "Attempt to continue to Concern Details.",
        ],
        "data": "Income: Higit sa ₱50,000/buwan",
        "expected": [
            "A clear message explains that the citizen is not eligible for the free pro-bono service under the configured rule.",
            "Susunod remains disabled even when the other basic fields are complete.",
            "The citizen remains on Hakbang 1 ng 3.",
            "No case or triage assessment is created.",
        ],
    },
    {
        "id": "TC_TR_003",
        "title": "Create a Pending Case and Linked Triage Assessment",
        "scenario": "TS-TR-02",
        "kind": "Positive / Integration Path",
        "pre": [
            "A signed-in citizen has completed Hakbang 1 with eligible data.",
            "The citizen has permission to insert their own case and triage assessment.",
            "The database is available.",
        ],
        "steps": [
            "Enter a meaningful concern summary.",
            "Select the opposing-party type.",
            "Indicate whether a legal deadline and supporting documents exist.",
            "If a deadline exists, provide the deadline date.",
            "Select Find Best Match.",
            "Inspect the result page and the stored case and triage assessment records.",
        ],
        "data": "Concern: My employer dismissed me without notice and has not released my final salary.\nOpposing party: Employer\nDeadline: 2026-10-15\nSupporting documents: Meron",
        "expected": [
            "The application enters a Matching state and prevents duplicate submission while processing.",
            "A case is created for the signed-in citizen with status Pending Triage and the selected category.",
            "A linked triage assessment stores the issue type, top match percentage, summary, and triage input without duplicating the user ID inside triage_input.",
            "Hakbang 3 ng 3 displays a Case created identifier and the resulting matches or an explicit no-attorney message.",
        ],
    },
    {
        "id": "TC_TR_004",
        "title": "Require a Date When a Legal Deadline Exists",
        "scenario": "TS-TR-02",
        "kind": "Negative / Validation Path",
        "pre": [
            "A signed-in citizen is on Concern Details after completing Hakbang 1.",
        ],
        "steps": [
            "Enter a concern summary and select an opposing-party type.",
            "Select Meron for the legal-deadline question.",
            "Leave the deadline date empty.",
            "Observe Find Best Match, then enter a valid future date.",
        ],
        "data": "Concern: Received an eviction notice.\nOpposing party: Landlord/Property owner\nHas deadline: Meron\nDeadline date: blank, then 2026-10-01",
        "expected": [
            "The deadline-date input appears after Meron is selected.",
            "Find Best Match remains disabled while the date is empty.",
            "No case or assessment is created from the incomplete form.",
            "After a valid date is entered, the form becomes eligible for submission when all other required fields are complete.",
        ],
    },
    {
        "id": "TC_TR_005",
        "title": "Rank Verified Attorneys by Match Factors",
        "scenario": "TS-TR-03",
        "kind": "Positive / Matching Path",
        "pre": [
            "The attorney directory contains at least three verified Volunteer Attorney accounts.",
            "The test fixtures define practice areas, province/region, active cases, pro-bono hours, and ratings.",
            "A valid Labor & Employment triage has been submitted for Bulacan with high urgency.",
        ],
        "steps": [
            "Run AI Triage using the prepared citizen input.",
            "Record the returned attorney order and match scores.",
            "Review each displayed reason, practice-area tag, location, active-case count, and pro-bono progress.",
            "Compare the top result with the controlled attorney fixtures.",
        ],
        "data": "Attorney A: verified, labor practice, Bulacan, 2 active cases, 20/60 pro-bono hours\nAttorney B: verified, family practice, Cebu, 10 active cases, 55/60 pro-bono hours\nCitizen issue: labor, Bulacan, high urgency",
        "expected": [
            "Only verified Volunteer Attorney accounts are included.",
            "Results are sorted from highest to lowest computed match score and limited to the configured top results.",
            "Attorney A ranks above Attorney B because the controlled fixture has stronger practice, location, urgency, availability, and pro-bono signals.",
            "Each card presents enough observable information to explain the ranking, including a match score and up to three reasons.",
            "The top result is selected by default without automatically assigning the case.",
        ],
    },
    {
        "id": "TC_TR_006",
        "title": "Request Consultation from a Selected Attorney",
        "scenario": "TS-TR-04",
        "kind": "Positive / Happy Path",
        "pre": [
            "A pending triage case and at least one attorney match are displayed.",
            "The case has no assigned attorney and remains in Pending Triage status.",
            "The selected attorney is verified and available in the result list.",
        ],
        "steps": [
            "Select a displayed attorney using Piliin ang Lawyer na Ito.",
            "Select Humingi ng Konsultasyon.",
            "Review the confirmation dialog and select Oo, piliin siya.",
            "Inspect the case record, attorney notification, and confirmation state.",
        ],
        "data": "Selected attorney: Attorney A\nInitial case status: Pending Triage\nInitial attorney_id: null",
        "expected": [
            "The confirmation dialog identifies the selected attorney and match score before submission.",
            "The case is updated atomically with the selected attorney and status Pending Acceptance.",
            "A notification is created for the selected attorney with a link to their Cases page.",
            "The citizen sees Naghihintay sa Tugon ng Abogado and is told they will be notified after acceptance or rejection.",
        ],
    },
    {
        "id": "TC_TR_007",
        "title": "Handle No Available Verified Attorney",
        "scenario": "TS-TR-04",
        "kind": "Negative / Fallback Path",
        "pre": [
            "A signed-in eligible citizen submits complete triage data.",
            "The attorney directory contains no verified Volunteer Attorney candidates.",
            "The database remains available for saving the citizen's case and assessment.",
        ],
        "steps": [
            "Submit the valid triage form.",
            "Wait for the matching result.",
            "Review the result and available actions.",
        ],
        "data": "Attorney candidate query result: empty list",
        "expected": [
            "The citizen's case and triage assessment are still saved, with a top match percentage of 0.",
            "The result contains no invented or unverified attorney profile.",
            "A clear message states that no verified attorney is currently available and suggests trying again later or contacting support.",
            "The consultation-request controls are not displayed because no attorney can be selected.",
            "The citizen can still open the Rights Library for self-help information.",
        ],
    },
]


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(BLUE)
    canvas.setLineWidth(1)
    canvas.line(18 * mm, height - 17 * mm, width - 18 * mm, height - 17 * mm)
    canvas.setFont("Arial-Bold", 7.5)
    canvas.setFillColor(BLUE)
    canvas.drawString(18 * mm, height - 13.5 * mm, "Software Testing / Software Quality Assurance")
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 18 * mm, height - 13.5 * mm, "Activity 1 - Finals: MVP Test Scenarios and Test Cases")
    canvas.setStrokeColor(colors.HexColor("#D5DADF"))
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(width / 2, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUT),
    pagesize=letter,
    rightMargin=18 * mm,
    leftMargin=18 * mm,
    topMargin=23 * mm,
    bottomMargin=19 * mm,
    title="JusticeLink MVP Test Scenarios and Test Cases",
    author="Uy",
    subject="Activity 1 - Finals",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=frame, onPage=page_decor)])


story = [
    Spacer(1, 17 * mm),
    P("ACTIVITY 1 - FINALS", "CoverKicker"),
    P("Test Scenarios and Test Cases Development", "CoverTitle"),
    P("JusticeLink / LAYA MVP", "CoverSubtitle"),
    P("Course: Software Testing / Software Quality Assurance", "Center"),
    Spacer(1, 13 * mm),
]

cover_rows = [
    [P("Prepared by", "CellBold"), P("Uy", "Cell")],
    [P("Application", "CellBold"), P("JusticeLink (LAYA)", "Cell")],
    [P("Primary test target", "CellBold"), P("Citizen-facing web application in a supported desktop browser", "Cell")],
    [P("MVP modules", "CellBold"), P("1. Rights Library with Juris AI<br/>2. AI Triage and citizen-to-legal-help matching", "Cell")],
    [P("Document date", "CellBold"), P(date.today().isoformat(), "Cell")],
]
cover_table = Table(cover_rows, colWidths=[45 * mm, 118 * mm])
cover_table.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.55, GRID),
    ("BACKGROUND", (0, 0), (0, -1), LIGHT_BLUE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story += [cover_table, Spacer(1, 11 * mm)]

scope_box = Table([[P("Scope note", "CellBold"), P("This specification intentionally excludes authentication, messaging, document generation, case management after attorney acceptance, profiles, administration, pending bills, and other non-MVP modules.", "Cell")]], colWidths=[30 * mm, 133 * mm])
scope_box.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.6, ACCENT),
    ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story += [scope_box, PageBreak()]

story += [P("Learning Outcomes", "H1Blue"), P(numbered([
    "Identify MVP functions that require testing in JusticeLink.",
    "Create effective Test Scenarios that describe what should be tested.",
    "Develop detailed Test Cases from the identified scenarios.",
    "Apply positive, negative, integration, recovery, and privacy testing to a legal-aid system.",
]))]

story += [P("Part 1: Application Information", "H1Blue")]
info_rows = [
    [P("Item", "CellWhite"), P("Details", "CellWhite")],
    [P("Application Name", "CellBold"), P("JusticeLink (LAYA)", "Cell")],
    [P("Application Type/Category", "CellBold"), P("Web Application / Legal Aid and Philippine Legal Research Platform", "Cell")],
    [P("Primary User", "CellBold"), P("Citizen seeking rights information or pro-bono legal help", "Cell")],
    [P("MVP Feature 1", "CellBold"), P("Rights Library with curated Rights Guides and Juris AI searches for Supreme Court cases and Republic Acts", "Cell")],
    [P("MVP Feature 2", "CellBold"), P("AI Triage that validates citizen information, records the concern, ranks verified volunteer attorneys, and allows a consultation request", "Cell")],
]
info = Table(info_rows, colWidths=[45 * mm, 118 * mm], repeatRows=1)
info.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.55, GRID),
    ("BACKGROUND", (0, 0), (-1, 0), BLUE),
    ("BACKGROUND", (0, 1), (0, -1), PALE_BLUE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story += [info, Spacer(1, 4 * mm), P("Part 2: Test Scenarios", "H1Blue"), P("Format: TS-XX: Verify that [user action/feature] works correctly.", "BodyItalic")]

scenario_rows = [[P("Scenario ID", "CellWhite"), P("Test Scenario", "CellWhite")]] + [[P(sid, "CellBold"), P(text, "Cell")] for sid, text in SCENARIOS]
scenario_table = LongTable(scenario_rows, colWidths=[28 * mm, 135 * mm], repeatRows=1)
scenario_table.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.55, GRID),
    ("BACKGROUND", (0, 0), (-1, 0), BLUE),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ALIGN", (0, 1), (0, -1), "CENTER"),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story += [scenario_table, PageBreak(), P("Part 3: Detailed Test Cases", "H1Blue"), P("The following cases cover the positive, negative, validation, integration, recovery, matching, and privacy paths of the two MVP modules.", "BodyA"), Spacer(1, 2 * mm)]

scenario_map = dict(SCENARIOS)
for index, case in enumerate(CASES):
    is_negative = case["kind"].startswith("Negative")
    heading_color = RED if is_negative else ACCENT
    header_bg = RED if is_negative else ACCENT
    heading = P(f"{escape(case['kind'])} Test Case", "CaseTitle")
    heading.style = ParagraphStyle(
        name=f"case-heading-{index}",
        parent=styles["CaseTitle"],
        textColor=heading_color,
    )
    meta = P(f"Related Scenario: {case['scenario']} - {escape(scenario_map[case['scenario']])}", "CaseMeta")
    table_rows = [
        [P("Field", "CellWhite"), P("Details", "CellWhite")],
        [P("Test Case ID", "CellBold"), P(case["id"], "Cell")],
        [P("Title", "CellBold"), P(escape(case["title"]), "Cell")],
        [P("Related Scenario", "CellBold"), P(case["scenario"], "Cell")],
        [P("Preconditions", "CellBold"), P(numbered(case["pre"]), "Cell")],
        [P("Test Steps", "CellBold"), P(numbered(case["steps"]), "Cell")],
        [P("Test Data", "CellBold"), P(escape(case["data"]).replace("\n", "<br/>"), "Cell")],
        [P("Expected Result", "CellBold"), P(numbered(case["expected"]), "Cell")],
    ]
    table = LongTable(table_rows, colWidths=[39 * mm, 124 * mm], repeatRows=1, splitByRow=1)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.55, GRID),
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("BACKGROUND", (0, 1), (0, -1), LIGHT_RED if is_negative else PALE_BLUE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [heading, meta, table]
    if index < len(CASES) - 1:
        story.append(PageBreak())

story += [
    PageBreak(),
    P("Part 4: Reflection", "H1Blue"),
    P("1. What is the difference between a Test Scenario and a Test Case?", "H2Blue"),
    P("A Test Scenario is a high-level statement of what feature, workflow, or risk must be tested. A Test Case explains exactly how to test it through defined preconditions, test data, numbered actions, and observable expected results. One scenario can therefore produce several positive, negative, boundary, recovery, integration, or security cases."),
    P("2. Why is it important to create Test Cases before performing software testing?", "H2Blue"),
    P("Prepared Test Cases make execution systematic, repeatable, and objective. They establish expected behavior before a tester sees the outcome, reduce missed requirements, and provide a reusable baseline for regression testing after changes to the user interface, database policies, matching rules, or external AI and legal-research services."),
    P("3. Which part of this MVP is the most challenging to test and why?", "H2Blue"),
    P("AI Triage and Juris AI are the most challenging because external results and AI wording can vary. The tests should not require identical prose. Instead, they verify stable requirements: correct dataset selection, relevant and attributable sources, privacy redaction, no invented citations, required-field validation, verified-attorney filtering, deterministic ranking from controlled fixtures, and safe fallback behavior when services or matching data are unavailable."),
    Spacer(1, 8 * mm),
    P("- End of Activity 1 -", "Center"),
]

doc.build(story)
print(f"Created {OUT} ({OUT.stat().st_size} bytes)")
