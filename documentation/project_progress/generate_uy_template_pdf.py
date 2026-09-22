from pathlib import Path
import os
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
os.environ["JUSTICELINK_ANSWERED_REPORT"] = "1"
import generate_uy_activity1_pdf as source
os.environ.pop("JUSTICELINK_ANSWERED_REPORT", None)
answered_artifact = HERE / "Uy_Activity1_Test_Scenarios_and_Test_Cases_Answered.pdf"
if answered_artifact.exists():
    answered_artifact.unlink()

OUT = HERE / "Uy_Activity1_Test_Scenarios_and_Test_Cases.pdf"
BLUE = colors.HexColor("#1F4E78")
RED = colors.HexColor("#D60000")
GRID = colors.black

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=15, leading=18, alignment=TA_CENTER, textColor=colors.HexColor("#1E5AA8"), spaceAfter=2))
styles.add(ParagraphStyle(name="Course", parent=styles["BodyText"], fontName="Helvetica", fontSize=7, leading=9, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=12, leading=14, textColor=colors.HexColor("#17365D"), spaceBefore=7, spaceAfter=5))
styles.add(ParagraphStyle(name="CaseHead", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=colors.HexColor("#1E5AA8"), spaceBefore=5, spaceAfter=2))
styles.add(ParagraphStyle(name="Body7", parent=styles["BodyText"], fontSize=7, leading=9, spaceAfter=2))
styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontSize=6.2, leading=7.5))
styles.add(ParagraphStyle(name="CellBold", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=6.2, leading=7.5))
styles.add(ParagraphStyle(name="Tiny", parent=styles["BodyText"], fontSize=5.6, leading=6.8))
styles.add(ParagraphStyle(name="End", parent=styles["BodyText"], fontSize=7, leading=9, alignment=TA_RIGHT, spaceBefore=8))


def p(text, style="Body7"):
    safe = str(text).replace("&", "&amp;").replace(chr(0x2022), "-").replace(chr(0x2014), "-")
    return Paragraph(safe, styles[style])


def numbered(values):
    return "<br/>".join(f"{index}. {value}" for index, value in enumerate(values, 1))


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFont("Helvetica", 5.5)
    canvas.setFillColor(colors.HexColor("#56738F"))
    canvas.drawString(18 * mm, height - 11 * mm, "Software Testing / Software Quality Assurance")
    canvas.setFillColor(colors.HexColor("#A0A0A0"))
    canvas.drawRightString(width - 18 * mm, height - 11 * mm, "Activity 1 - Finals: Test Scenarios and Test Cases")
    canvas.setStrokeColor(colors.HexColor("#4F81BD"))
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, height - 13 * mm, width - 18 * mm, height - 13 * mm)
    canvas.setStrokeColor(colors.HexColor("#C9D2DC"))
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 5.5)
    canvas.setFillColor(colors.HexColor("#999999"))
    canvas.drawRightString(width - 18 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


def grid_table(rows, widths, header_color=BLUE, repeat_rows=1):
    table = Table(rows, colWidths=widths, repeatRows=repeat_rows)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.55, GRID),
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    return table


def case_table(case, negative=False):
    rows = [
        [p("Field", "CellBold"), p("Details", "CellBold")],
        [p("Test Case ID", "CellBold"), p(case["id"], "Cell")],
        [p("Title", "CellBold"), p(case["title"], "Cell")],
        [p("Related Scenario", "CellBold"), p(case["scenario"], "Cell")],
        [p("Preconditions", "CellBold"), p(numbered(case["pre"]), "Tiny")],
        [p("Test Steps", "CellBold"), p(numbered(case["steps"]), "Tiny")],
        [p("Test Data", "CellBold"), p(case["data"], "Tiny")],
        [p("Expected Result", "CellBold"), p(numbered(case["expected"]), "Tiny")],
    ]
    return grid_table(rows, [34 * mm, 128 * mm], RED if negative else BLUE)


groups = source.GROUPS
cases_by_scenario = {case["scenario"]: case for case in source.CASES}

# One positive and one negative/error-path case for every in-scope feature group.
pair_specs = [
    ("Dashboard and Navigation", "TS-01", "TS-03"),
    ("AI Legal Help Assessment (Triage)", "TS-05", "TS-08"),
    ("Case and Attorney Workflow", "TS-12", "TS-14"),
    ("Messaging", "TS-18", "TS-22"),
    ("Document Drafter", "TS-25", "TS-27"),
    ("Legal Library", "TS-32", "TS-37"),
    ("Notifications, Profile, Settings, and Usability", "TS-39", "TS-41"),
]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=17 * mm, title="Uy Activity 1 - Test Scenarios and Test Cases", author="Uy")
story = []

story += [p("ACTIVITY 1 - FINALS", "DocTitle"), p("Test Scenarios and Test Cases Development", "DocTitle"), p("Course: Software Testing / Software Quality Assurance", "Course")]
story += [p("Learning Outcomes", "Section"), p("After completing this activity, you should be able to:")]
for item in [
    "Identify functionalities that require testing in your application.",
    "Create effective Test Scenarios that describe what should be tested.",
    "Develop detailed Test Cases from identified Test Scenarios.",
    "Apply software testing principles to improve software quality.",
]:
    story.append(p("- " + item))

story += [p("Part 1: Application Information", "Section"), p("Complete the information below:")]
info_rows = [
    [p("Item", "CellBold"), p("Details", "CellBold")],
    [p("Application Name", "CellBold"), p("JusticeLink / LAYA Mobile", "Cell")],
    [p("Application Type/Category", "CellBold"), p("Mobile Legal-Aid and Legal-Research Application", "Cell")],
    [p("Main Features/Modules", "CellBold"), p("1. Dashboard and Navigation<br/>2. AI Legal Help Assessment<br/>3. Case and Attorney Workflow<br/>4. Messaging<br/>5. Document Drafter<br/>6. Legal Library<br/>7. Notifications, Profile, Settings, and Usability", "Cell")],
]
story += [grid_table(info_rows, [45 * mm, 117 * mm]), p("Part 2: Test Scenarios", "Section")]

scenario_rows = [[p("Scenario ID", "CellBold"), p("Test Scenario", "CellBold")]]
for _, items in groups:
    scenario_rows.extend([[p(scenario_id, "CellBold"), p(description, "Cell")] for scenario_id, description in items])
story.append(grid_table(scenario_rows, [28 * mm, 134 * mm]))
story.append(PageBreak())

story += [p("Part 3: Test Cases", "Section"), p("One Positive and one Negative/Error Path Test Case for each main feature.")]
for feature, positive_id, negative_id in pair_specs:
    positive = dict(cases_by_scenario[positive_id])
    negative = dict(cases_by_scenario[negative_id])
    positive["id"] = f"TC_{positive_id.replace('-', '')}_POS"
    negative["id"] = f"TC_{negative_id.replace('-', '')}_NEG"
    positive_block = [
        p(f"{feature} - Positive / Happy Path Test Case", "CaseHead"),
        p(f"Related Scenario: {positive_id} - {next(text for _, items in groups for sid, text in items if sid == positive_id)}", "Tiny"),
        case_table(positive, negative=False),
    ]
    negative_block = [
        p(f"{feature} - Negative / Error Path Test Case", "CaseHead"),
        p(f"Related Scenario: {negative_id} - {next(text for _, items in groups for sid, text in items if sid == negative_id)}", "Tiny"),
        case_table(negative, negative=True),
    ]
    story += [KeepTogether(positive_block), Spacer(1, 3 * mm), KeepTogether(negative_block), Spacer(1, 5 * mm)]

story += [PageBreak(), p("Part 4: Reflection", "Section")]
story += [
    p("1. What is the difference between a Test Scenario and a Test Case?", "CaseHead"),
    p("A Test Scenario is a high-level description of a feature, user action, or workflow that needs to be verified. It explains what should be tested without describing every action that the tester must perform. A Test Case is more specific and contains the preconditions, test data, numbered steps, and expected results required to verify the scenario. One Test Scenario may therefore require several Test Cases to cover its positive path, negative path, boundary conditions, permissions, and possible errors. For example, a Messaging scenario may verify that users can communicate, while its Test Cases separately check successful message delivery, unsupported attachments, failed sending, chronological order, and unauthorized access."),
    p("2. Why is it important to create Test Cases before performing software testing?", "CaseHead"),
    p("Creating Test Cases before execution makes the testing process organized, objective, and repeatable. Each case identifies the required setup, the exact actions to perform, the data to use, and the expected behavior of the application. This prevents testers from relying only on memory or random exploration and reduces the chance that important workflows or error conditions will be missed. Written Test Cases also allow different testers to evaluate the same feature consistently, make defects easier to reproduce, and provide a reusable basis for regression testing after the application is updated. In JusticeLink, this is especially important because one action may affect the citizen application, attorney application, database, realtime messaging, AI service, and legal-research integrations."),
    p("3. Which part of the activity was the most challenging and why?", "CaseHead"),
    p("The most challenging part was developing meaningful positive and negative Test Cases for the AI-assisted and multi-user features. AI Legal Help Assessment and Document Drafter responses may vary even when the same information is submitted, so the expected result cannot depend on identical wording. The tests must instead verify completeness, relevance, privacy, legal-source grounding, safe fallback behavior, and the absence of fabricated citations. Messaging and case management are also challenging because their results must be checked across two existing accounts: an action performed by the citizen should appear correctly for the attorney, and vice versa. External services such as Juris and Open Congress introduce additional failure conditions involving unavailable networks, empty responses, invalid links, and delayed data. These factors require Test Cases that verify both normal behavior and safe recovery without exposing confidential information or interrupting the user's main legal-aid workflow."),
    p("- End of Activity 1 -", "End"),
]

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"Created {OUT} ({OUT.stat().st_size} bytes)")
