from pathlib import Path
from datetime import date
import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, LongTable, Image,
)

ANSWERED = os.environ.get("JUSTICELINK_ANSWERED_REPORT") == "1"
OUT = Path(__file__).with_name(
    "Uy_Activity1_Test_Scenarios_and_Test_Cases_Answered.pdf"
    if ANSWERED else "Uy_Activity1_Test_Scenarios_and_Test_Cases.pdf"
)
EVIDENCE_DIR = Path(__file__).with_name("test_evidence")

GROUPS = [
    ("Authentication and Access", [
        ("TS-01", "Verify that a citizen can log in using valid credentials."),
        ("TS-02", "Verify that login is rejected when the password is invalid."),
        ("TS-03", "Verify that required login fields and email format are validated."),
        ("TS-04", "Verify that a new citizen can complete account registration."),
        ("TS-05", "Verify that password recovery accepts a registered email and handles an unknown email safely."),
        ("TS-06", "Verify that protected mobile screens cannot be opened without an authenticated session."),
    ]),
    ("Didit Identity and Attorney Verification", [
        ("TS-07", "Verify that a citizen can complete the required Didit identity-verification flow."),
        ("TS-08", "Verify that an attorney applicant can submit identity and professional-verification requirements."),
        ("TS-09", "Verify that cancelled, failed, or expired Didit sessions are handled without approving the account."),
        ("TS-10", "Verify that duplicate or mismatched identity information is rejected or routed for review."),
        ("TS-11", "Verify that an unverified attorney cannot access attorney-only case functions."),
    ]),
    ("Dashboard and Navigation", [
        ("TS-12", "Verify that the citizen dashboard presents the primary legal-help task, self-help tools, and active case."),
        ("TS-13", "Verify that the attorney dashboard presents pending work, quick actions, case statistics, and service hours."),
        ("TS-14", "Verify that bottom navigation and back navigation preserve the correct role and screen state."),
    ]),
    ("AI Legal Help Assessment (Triage)", [
        ("TS-15", "Verify that triage asks intake questions before performing legal retrieval."),
        ("TS-16", "Verify that sufficient citizen answers produce a complete legal assessment."),
        ("TS-17", "Verify that required or ambiguous triage answers trigger clarification rather than a premature result."),
        ("TS-18", "Verify that final triage results show relevant Juris sources and authoritative links when available."),
        ("TS-19", "Verify that triage completes safely when Juris is unavailable and does not fabricate citations."),
        ("TS-20", "Verify that personal identifiers and uploaded-document text are not sent in outbound Juris queries."),
        ("TS-21", "Verify that a citizen can choose an attorney and submit the assessed case."),
    ]),
    ("Case and Attorney Workflow", [
        ("TS-22", "Verify that a submitted case appears in the citizen case list with its current status."),
        ("TS-23", "Verify that an assigned attorney can review and accept a pending case."),
        ("TS-24", "Verify that an attorney can decline or withdraw and the case returns to an appropriate available state."),
        ("TS-25", "Verify that citizens and attorneys see correct case details while confidential data remains role-restricted."),
        ("TS-26", "Verify that an attorney can update case status and close a case with an outcome and notes."),
        ("TS-27", "Verify that service hours can be logged by the attorney and verified or rejected by the citizen."),
        ("TS-28", "Verify that Find Similar Cases opens de-identified jurisprudence research for both roles."),
    ]),
    ("Messaging", [
        ("TS-29", "Verify that a citizen can open the case thread and send a message to the assigned attorney."),
        ("TS-30", "Verify that an attorney receives and replies to a citizen message."),
        ("TS-31", "Verify that messages update in real time and retain chronological ordering."),
        ("TS-32", "Verify that supported case files can be shared and opened from the message thread."),
        ("TS-33", "Verify that empty, oversized, unsupported, or failed message/file submissions are handled safely."),
        ("TS-34", "Verify that users cannot open message threads for cases in which they are not participants."),
    ]),
    ("Document Drafter", [
        ("TS-35", "Verify that the drafter gathers sufficient facts before producing a document."),
        ("TS-36", "Verify that a supported legal-document request produces a usable draft and source list."),
        ("TS-37", "Verify that nonlegal or unsafe drafting requests are refused."),
        ("TS-38", "Verify that document generation continues safely when Juris is unavailable."),
        ("TS-39", "Verify that a generated document can be copied, exported to PDF/DOCX, and shared."),
        ("TS-40", "Verify that a generated document and its legal sources can be saved to the citizen account."),
        ("TS-41", "Verify that saved documents reopen from My Documents with content and sources intact."),
    ]),
    ("Legal Library / Rights Library", [
        ("TS-42", "Verify that Rights Guides load from curated Supabase content and can be filtered by topic."),
        ("TS-43", "Verify that guide search returns matching plain-language rights articles and handles no results."),
        ("TS-44", "Verify that Cases search returns relevant Juris jurisprudence with research-aid labeling."),
        ("TS-45", "Verify that Laws search returns relevant Juris Republic Acts with authoritative links."),
        ("TS-46", "Verify that Pending Bills loads Open Congress House and Senate bill information."),
        ("TS-47", "Verify that Legal Library empty, loading, error, and retry states are usable."),
        ("TS-48", "Verify that Juris record, authoritative source, and PDF links open safely in an external viewer."),
        ("TS-49", "Verify that both citizen and attorney roles can access the Legal Library."),
    ]),
    ("Notifications, Profile, Settings, and Security", [
        ("TS-50", "Verify that case and message events create the correct notification and unread badge."),
        ("TS-51", "Verify that opening a notification routes to the intended item and marks it read."),
        ("TS-52", "Verify that citizen and attorney profile information can be viewed and valid editable fields can be updated."),
        ("TS-53", "Verify that invalid profile data and failed avatar uploads do not overwrite valid information."),
        ("TS-54", "Verify that password/security and notification settings can be updated safely."),
        ("TS-55", "Verify that logout is available at the bottom of the Profile page and ends the session."),
        ("TS-56", "Verify that core screens remain usable with large text, screen-reader labels, keyboard display, and temporary network loss."),
    ]),
]

def case(cid, scenario, title, role, priority, kind, pre, steps, data, expected):
    return dict(id=cid, scenario=scenario, title=title, role=role, priority=priority,
                kind=kind, pre=pre, steps=steps, data=data, expected=expected)

COMMON = "JusticeLink mobile is installed; Supabase and the local backend are running unless the case states otherwise."
CASES = [
case("TC_AUTH_001","TS-01","Citizen login with valid credentials","Citizen","Critical","Positive",[COMMON,"Citizen account exists and is logged out."],["Open LAYA.","Enter the registered email and correct password.","Tap LOGIN."],"uylancejr@gmail.com / Password1!",["Authentication succeeds.","Citizen Home opens.","Citizen-only navigation is displayed."]),
case("TC_AUTH_002","TS-02","Login fails with an invalid password","Any user","Critical","Negative",[COMMON,"Registered account exists and is logged out."],["Enter the registered email.","Enter an incorrect password.","Tap LOGIN."],"uylancejr@gmail.com / WrongPassword1!",["Login fails with a clear message.","No session is created.","Password is not exposed."]),
case("TC_AUTH_003","TS-03","Login field validation","Any user","High","Negative",["Login screen is open."],["Submit empty fields.","Enter malformed email and submit."],"Blank values; user@invalid",["Required/email validation appears.","No authentication request grants access.","Application remains responsive."]),
case("TC_AUTH_004","TS-04","Register a citizen account","Citizen applicant","Critical","Positive",[COMMON,"Unique test email is available."],["Tap SIGNUP.","Choose citizen role.","Complete every required registration step.","Accept terms and submit."],"Unique email, valid password, valid personal data",["Account is created or verification email is requested.","Role is Citizen/Public.","No attorney privileges are granted."]),
case("TC_AUTH_005","TS-05","Request password recovery","Any user","High","Positive/Negative",["Forgot Password screen is available."],["Submit a registered email.","Repeat with an unknown but valid-format email."],"Registered email; unknown@example.com",["A safe confirmation is displayed.","The response does not reveal whether an account exists.","No crash occurs."]),
case("TC_AUTH_006","TS-06","Block unauthenticated protected-screen access","Logged-out user","Critical","Security",["No valid session exists."],["Attempt to open a saved protected route/deep link.","Restart the app."],"Case/Profile/Message deep link",["User is redirected to authentication.","No protected case or message data is rendered."]),

case("TC_IDV_001","TS-07","Complete citizen Didit identity verification","Citizen applicant","Critical","Positive",[COMMON,"Camera/network permissions are available."],["Start identity verification.","Follow Didit document and selfie instructions.","Return to LAYA after success."],"Valid supported government ID and matching selfie",["Didit returns a successful decision.","Verification status is saved once.","Registration can continue."]),
case("TC_IDV_002","TS-08","Submit attorney professional verification","Attorney applicant","Critical","Positive",[COMMON,"Applicant has valid identity and professional documents."],["Choose attorney registration.","Complete Didit identity flow.","Upload required IBP/professional evidence.","Submit."],"Valid ID, selfie, IBP/professional details",["Submission is stored as pending/unverified until review.","Applicant is not automatically given verified privileges."]),
case("TC_IDV_003","TS-09","Handle cancelled or expired Didit session","Applicant","Critical","Negative",["Didit verification has started."],["Cancel, close, or allow the session to expire.","Return to LAYA.","Retry verification."],"Cancelled/expired session",["Account is not marked verified.","A retry action is available.","A new valid session can be started."]),
case("TC_IDV_004","TS-10","Detect identity mismatch or duplicate","Applicant","Critical","Negative/Security",["An existing identity or mismatched selfie is available for testing."],["Submit mismatched or previously used identity evidence.","Complete provider flow."],"ID/selfie mismatch or duplicate identity",["Verification is rejected or referred for review.","No duplicate verified identity is created.","Sensitive provider details are not exposed."]),
case("TC_IDV_005","TS-11","Restrict unverified attorney account","Unverified attorney","Critical","Security",["Attorney account exists with unverified status."],["Log in.","Attempt to accept or manage a case."],"Unverified attorney account",["Restricted action is blocked.","Verification status/instructions are shown.","Case data is not mutated."]),

case("TC_NAV_001","TS-12","Citizen dashboard task hierarchy","Citizen","High","UI/Functional",["Citizen is logged in."],["Open Home.","Review the hero, self-help tools, and active case area.","Open each primary destination and return."],"Citizen with and without active case",["Legal Help Assessment is the primary action.","Document Drafter and Legal Library are visible.","Active case state is accurate."]),
case("TC_NAV_002","TS-13","Attorney dashboard task hierarchy","Attorney","High","UI/Functional",["Verified attorney is logged in."],["Open Home.","Use Review Cases, Messages, and Legal Research.","Inspect statistics."],"uylance67@gmail.com",["Quick actions open correct screens.","Counts/hours match stored data.","Long attorney name does not overlap notification control."]),
case("TC_NAV_003","TS-14","Role-aware bottom and back navigation","Citizen and Attorney","High","Regression",["Each role is logged in on a separate emulator."],["Navigate through all bottom tabs.","Open a nested screen and press Back.","Repeat after app resume."],"Citizen and attorney sessions",["Correct role-specific tabs remain.","Back returns to the prior screen.","No cross-role screen is exposed."]),

case("TC_TRIAGE_001","TS-15","Triage asks before retrieval","Citizen","Critical","Positive/Privacy",["Citizen opened Legal Help Assessment; backend request logging is enabled."],["Enter only an initial concern.","Answer one clarification.","Inspect outbound Juris calls."],"I have a workplace concern.",["Assistant asks relevant questions.","No Juris request occurs before sufficient facts exist."]),
case("TC_TRIAGE_002","TS-16","Generate complete assessment","Citizen","Critical","Positive",["Triage is open."],["Describe the concern.","Answer every clarification.","Submit final answer."],"Illegal dismissal; location, urgency, evidence, desired outcome",["Result includes category, issue, urgency, assessment, and missing details.","Progress advances to Review Assessment."]),
case("TC_TRIAGE_003","TS-17","Clarify incomplete triage input","Citizen","High","Negative/Boundary",["Triage is open."],["Enter vague or contradictory answers.","Attempt to finish."],"Help me; conflicting dates",["Specific clarification is requested.","No incomplete case assessment is silently finalized."]),
case("TC_TRIAGE_004","TS-18","Show grounded triage sources","Citizen","Critical","Integration",["Juris and AI services are available."],["Complete a labor-law assessment.","Review Legal Sources.","Open the authoritative link."],"Illegal dismissal concern",["Relevant cases/laws are listed separately from assessment text.","AI-research warning is shown.","Authoritative URL opens."]),
case("TC_TRIAGE_005","TS-19","Complete triage during Juris outage","Citizen","Critical","Resilience",["Simulate timeout/503 from Juris."],["Complete all triage questions.","View final result."],"Valid complete concern",["Assessment still completes.","Source verification-unavailable notice appears.","No invented citation is displayed."]),
case("TC_TRIAGE_006","TS-20","De-identify outbound legal research","Citizen","Critical","Privacy/Security",["Outbound Juris URL capture is enabled."],["Provide name, email, phone, address, parties, and uploaded-document text.","Complete triage.","Inspect Juris request."],"Juan Dela Cruz, juan@example.com, 0917..., full address/document text",["Outbound query contains only generic legal issues.","Direct identifiers and document text are absent.","Raw narrative remains inside JusticeLink-controlled flow."]),
case("TC_TRIAGE_007","TS-21","Choose attorney and submit case","Citizen","Critical","End-to-end",["Assessment is complete; eligible attorneys exist."],["Continue to attorney selection.","Review recommendations.","Select an attorney or open network.","Submit."],"Recommended attorney",["Case is created once.","Selected attorney/status is correct.","Citizen receives confirmation and returns Home."]),

case("TC_CASE_001","TS-22","Citizen sees submitted case","Citizen","Critical","Positive",["Citizen submitted a case."],["Open Cases.","Open the new case."],"New case ID",["Case title/status/attorney are accurate.","Latest case is visible without duplicate records."]),
case("TC_CASE_002","TS-23","Attorney accepts pending case","Attorney","Critical","Positive",["Pending case is assigned/available to verified attorney."],["Open case details.","Tap Accept Case and confirm."],"Pending Triage/Acceptance case",["Status changes to active/in progress.","Citizen is notified.","Message thread becomes available."]),
case("TC_CASE_003","TS-24","Attorney declines or withdraws","Attorney","Critical","Negative workflow",["Attorney has a pending or active case."],["Choose Decline/Withdraw.","Confirm action.","Refresh both roles."],"Pending and active cases",["Attorney is removed according to workflow.","Case remains recoverable for reassignment.","Citizen is notified."]),
case("TC_CASE_004","TS-25","Enforce case participant visibility","Citizen/Attorney/Other user","Critical","Security",["Two unrelated accounts and one shared case exist."],["Open case as participant.","Attempt same case ID as unrelated account."],"Valid and unauthorized case IDs",["Participants see permitted details.","Unrelated account receives no confidential data."]),
case("TC_CASE_005","TS-26","Update and close case","Attorney","High","Positive",["Attorney owns an active case."],["Update status.","Close case with outcome and notes.","Reopen detail from both roles."],"Hearing Scheduled; Closed-Won; closing notes",["Timeline/status updates persist.","Closing notes and summary are visible appropriately.","Closed case actions are restricted."]),
case("TC_CASE_006","TS-27","Log and verify service hours","Attorney/Citizen","High","End-to-end",["Active assigned case exists."],["Attorney submits hours and description.","Citizen reviews and accepts one log, rejects another.","Return to attorney dashboard."],"1.5 valid hours; invalid/duplicate log",["Pending log appears to citizen.","Accepted hours contribute to verified totals.","Rejected hours do not."]),
case("TC_CASE_007","TS-28","Research similar cases privately","Citizen and Attorney","High","Privacy/Integration",["Case contains a detailed private narrative."],["Tap Research Similar Cases.","Inspect Legal Library query and outbound request."],"Existing case",["Cases tab opens with de-identified query/results.","Raw case description is not present in Juris URL.","Research does not modify case data."]),

case("TC_MSG_001","TS-29","Citizen sends case message","Citizen","Critical","Positive",["Citizen has an assigned case and thread."],["Open Messages or case Message Attorney.","Enter text.","Send."],"Please advise on my hearing date.",["Message appears once with citizen identity/time.","Input clears after confirmed send."]),
case("TC_MSG_002","TS-30","Attorney receives and replies","Attorney","Critical","Positive",["Citizen message exists."],["Open Messages.","Open thread.","Send reply."],"I received your update.",["Citizen message is visible.","Reply reaches citizen thread.","Unread indicators update."]),
case("TC_MSG_003","TS-31","Realtime chronological messaging","Citizen/Attorney","High","Realtime",["Both users have the same thread open on separate emulators."],["Send alternating messages quickly.","Observe both devices.","Reopen thread."],"Three timestamped messages",["Messages appear without manual refresh.","No duplicates occur.","Order remains chronological after reopen."]),
case("TC_MSG_004","TS-32","Share supported case file","Citizen/Attorney","High","Positive",["Thread is open; file permission is available."],["Attach supported PDF/image.","Send.","Open attachment as other participant."],"Small PDF and JPEG",["Upload progress/completion is clear.","Attachment metadata and sender are correct.","Authorized participant can open it."]),
case("TC_MSG_005","TS-33","Reject invalid message or attachment","Citizen/Attorney","High","Negative/Resilience",["Thread is open."],["Try empty message.","Try unsupported/oversized file.","Simulate upload failure and retry."],"Whitespace; executable; oversized file",["Invalid send is blocked with feedback.","Failed item is not presented as sent.","Retry does not duplicate content."]),
case("TC_MSG_006","TS-34","Block unauthorized thread access","Other authenticated user","Critical","Security",["Known thread belongs to different users."],["Attempt to open thread ID directly.","Attempt to query its messages."],"Unauthorized thread ID",["Access is denied or empty.","Message contents and attachment URLs are not exposed."]),

case("TC_DOC_001","TS-35","Gather facts before drafting","Citizen","Critical","Positive",["Document Drafter is open; request logging is enabled."],["Request a demand letter with minimal detail.","Answer follow-up questions one at a time."],"I need a demand letter.",["Drafter asks for required parties, facts, remedy, and relevant dates.","No draft or Juris search occurs prematurely."]),
case("TC_DOC_002","TS-36","Generate grounded document draft","Citizen","Critical","Positive/Integration",["AI and Juris are available; required facts are supplied."],["Finish drafting conversation.","Review generated document and source cards."],"Complete unpaid-wages demand facts",["Professional draft is produced.","Sources are separate and relevant.","Inline citations appear only when customary."]),
case("TC_DOC_003","TS-37","Refuse nonlegal or unsafe request","Citizen","High","Negative/Safety",["Drafter is open."],["Request nonlegal content.","Request a document facilitating illegal activity."],"Recipe; fraudulent affidavit",["Drafter refuses and stays within legal-document scope.","No Juris request is made for a clearly nonlegal prompt."]),
case("TC_DOC_004","TS-38","Draft during Juris outage","Citizen","Critical","Resilience",["Simulate Juris timeout/503; AI remains available."],["Provide sufficient facts and generate."],"Complete valid request",["Existing AI/template flow still produces a draft.","External-source warning appears.","No fabricated citation is inserted."]),
case("TC_DOC_005","TS-39","Copy and export document","Citizen","High","Positive",["Generated document is displayed; storage/share permissions are available."],["Copy text.","Export PDF.","Export DOCX.","Open/share each file."],"Generated draft",["Clipboard matches document.","Files open with correct title/content.","Permission denial has a safe fallback."]),
case("TC_DOC_006","TS-40","Save document with sources","Citizen","Critical","Positive",["Generated draft and authenticated session exist."],["Tap Save.","Wait for confirmation."],"Draft with Juris sources",["One generated_documents record is saved.","Content, title, template slug, and source metadata persist."]),
case("TC_DOC_007","TS-41","Reopen saved document","Citizen","High","Regression",["A sourced document was saved."],["Open My Documents.","Open the saved item."],"Previously saved draft",["Content is unchanged.","Legal source cards and links are retained.","Empty/error states allow retry."]),

case("TC_LIB_001","TS-42","Browse curated Rights Guides","Citizen/Attorney","High","Positive",["Supabase rights categories/articles are seeded."],["Open Legal Library > Rights Guides.","Select topic chips.","Expand articles."],"Labor and Family topics",["Stable plain-language categories load.","Filtering and expansion work.","Content is not replaced by random research results."]),
case("TC_LIB_002","TS-43","Search rights guides and no-result state","Citizen/Attorney","High","Positive/Negative",["Rights Guides is open."],["Search a known synonym/topic.","Search a nonexistent string.","Clear search."],"sahod; xyznonexistent999",["Relevant guide/category appears for known term.","Clear no-results message appears for unknown term.","Clearing restores guides."]),
case("TC_LIB_003","TS-44","Search Juris cases","Citizen/Attorney","Critical","Integration",["Authenticated user; Juris available."],["Open Cases.","Search a legal issue.","Review results."],"illegal dismissal security of tenure",["Relevant jurisprudence cards appear.","Case title/citation/summary are normalized.","Summary is labeled AI-generated research aid."]),
case("TC_LIB_004","TS-45","Search Republic Acts","Citizen/Attorney","Critical","Integration",["Authenticated user; Juris available."],["Open Laws.","Search by concept and RA number."],"data privacy; RA 10173",["Relevant Republic Acts appear.","Citation/title and authoritative links are correct."]),
case("TC_LIB_005","TS-46","Browse pending legislation","Citizen/Attorney","High","Regression/Integration",["Open Congress is available."],["Open Pending Bills.","Switch House/Senate where available.","Search a bill topic and open a record."],"flood control",["Only pending-bill data comes from Open Congress.","Bill number/title/status/date display.","External record opens."]),
case("TC_LIB_006","TS-47","Library loading, outage, and retry states","Citizen/Attorney","High","Resilience",["Ability to throttle or disable APIs."],["Open each tab on slow network.","Simulate Juris/Open Congress failure.","Restore network and Retry."],"Slow/offline/503",["Loading indicator/skeleton appears.","Existing guides remain usable during Juris outage.","Retry recovers without app restart."]),
case("TC_LIB_007","TS-48","Open legal source links safely","Citizen/Attorney","High","Positive/Security",["Search result includes Juris/source/PDF URLs."],["Open each available link.","Return to app."],"Valid result links",["Correct external target opens.","JusticeLink session/navigation remains intact.","Relevance score is not presented as authority."]),
case("TC_LIB_008","TS-49","Library access for both roles","Citizen/Attorney","Critical","Authorization",["Citizen and verified attorney sessions exist."],["Open library from citizen tools.","Open it from attorney quick action.","Use all tabs."],"Two emulator accounts",["Both roles have equivalent research access.","No admin-only or other role data is exposed."]),

case("TC_NOTIF_001","TS-50","Create event notifications and badge","Citizen/Attorney","High","Realtime",["Both roles are logged in; notifications are enabled."],["Trigger case acceptance, message, and status update.","Observe bell badge."],"Three event types",["Correct recipient receives one meaningful notification per event.","Unread count updates without logout."]),
case("TC_NOTIF_002","TS-51","Open and mark notification read","Citizen/Attorney","High","Positive",["Unread actionable notification exists."],["Open Notifications.","Tap the item.","Return to list/dashboard."],"Case/message notification",["Correct destination opens.","Item becomes read.","Badge count decreases accurately."]),
case("TC_PROFILE_001","TS-52","View and update profile","Citizen/Attorney","High","Positive",["Authenticated profile exists."],["Open Profile.","Edit allowed fields.","Save and reopen."],"Name/contact/address or attorney bio/firm",["Valid changes persist and render correctly.","Role/verification fields cannot be self-escalated."]),
case("TC_PROFILE_002","TS-53","Reject invalid profile/avatar update","Citizen/Attorney","High","Negative",["Profile edit is open."],["Enter malformed values.","Select unsupported/oversized avatar.","Simulate upload failure."],"Invalid phone/email and file",["Inline validation/error appears.","Existing valid data/avatar remains unchanged.","Retry is possible."]),
case("TC_SETTINGS_001","TS-54","Update security and notification settings","Citizen/Attorney","High","Positive/Security",["Authenticated account exists."],["Change a notification preference.","Open Security and perform supported password action.","Reopen settings."],"Valid preference/password inputs",["Settings persist.","Sensitive values are masked.","Security action requires valid authentication rules."]),
case("TC_PROFILE_003","TS-55","Logout only from Profile","Citizen/Attorney","Critical","Positive/Security",["Authenticated user is on Profile."],["Scroll to the bottom.","Tap Log Out and confirm if prompted.","Press Back or reopen app."],"Active session",["Session is terminated.","Authentication screen appears.","Protected screens cannot be restored.","Other ordinary headers contain no logout button."]),
case("TC_NFR_001","TS-56","Accessibility and temporary-network usability","Citizen/Attorney","Medium","Non-functional",["Device accessibility/font controls and network throttling are available."],["Enable large text and screen reader.","Navigate dashboards, forms, tabs, and buttons.","Show/hide keyboard.","Briefly disconnect/reconnect network."],"Largest practical font; TalkBack; offline/online",["Text does not hide critical actions.","Icon controls have meaningful labels and touch targets.","Keyboard does not block submission.","Recoverable network states do not lose entered data."]),
]

# Results from the 2026-09-22 two-emulator smoke execution. Cases needing
# destructive, provider-sandbox, outage, or fresh-account conditions remain
# explicitly unexecuted rather than being assigned an unsupported pass result.
EXECUTED_RESULTS = {
    "TS-07": ("Partial", "A previously verified citizen profile was observed, including uploaded ID and selfie-verification records. A new Didit session was not executed.", "E14_citizen_profile.png"),
    "TS-12": ("Pass", "Citizen dashboard loaded with the primary legal-help assessment, Document Drafter, Legal Library, active-case area, notifications, and role-appropriate navigation.", "E01_citizen_dashboard.png"),
    "TS-13": ("Pass", "Attorney workspace loaded with case statistics, quick actions, active cases, direct requests, and attorney navigation.", "E02_attorney_dashboard.png"),
    "TS-14": ("Pass", "Citizen and attorney bottom navigation displayed the correct Home, Cases, Messages, and Profile destinations while retaining each role's dashboard.", "E02_attorney_dashboard.png"),
    "TS-15": ("Pass", "Legal Help Assessment opened at Step 1 and requested a description of the concern before showing any retrieved legal sources.", "E13_ai_triage_start.png"),
    "TS-22": ("Pass", "The citizen Cases screen loaded successfully and separated active, completed, and withdrawn case states; the test account currently had no active case.", "E17_citizen_cases.png"),
    "TS-25": ("Partial", "Both role-specific case screens loaded and exposed different citizen and attorney controls. Confidential-field isolation was not penetration-tested.", "E18_attorney_cases.png"),
    "TS-29": ("Pass", "Citizen and attorney message inboxes showed the same three case conversations and matching latest-message previews.", "E07_citizen_messages.png"),
    "TS-30": ("Pass", "The selected conversation showed the citizen message and attorney reply on both emulators, confirming the shared conversation history.", "E10_attorney_chat.png"),
    "TS-35": ("Pass", "Document Drafter opened at Step 1 of 3 and asked the user to describe the required legal document before drafting.", "E11_document_drafter.png"),
    "TS-40": ("Partial", "The saved-document shortcut opened My Documents and displayed a previously saved agreement. Source-card persistence was not visible from the list view.", "E12_saved_documents.png"),
    "TS-41": ("Pass", "My Documents successfully loaded a previously saved document entry with its title and saved date.", "E12_saved_documents.png"),
    "TS-42": ("Pass", "Legal Library opened to Rights Guides and displayed categorized plain-language labor and family-law guides from the curated library.", "E03_legal_library_guides.png"),
    "TS-43": ("Pass", "A Cases search for 'Illegal dismissal' returned Juris jurisprudence results with citations, summaries, Juris links, and authoritative-source links.", "E04_juris_cases_search.png"),
    "TS-44": ("Partial", "The Laws tab loaded its Republic Act search interface and privacy guidance. A result-producing law query was not completed during this run.", "E05_juris_laws_search.png"),
    "TS-45": ("Pass", "Pending Bills opened the Open Congress legislation tracker, displayed provider attribution, bill totals, House/Senate tabs, and pending bill records.", "E06_pending_bills.png"),
    "TS-47": ("Pass", "Juris results were explicitly labeled as AI-generated research aids and exposed both 'View on Juris' and 'Authoritative source' actions.", "E04_juris_cases_search.png"),
    "TS-49": ("Partial", "Citizen access to Legal Library and attorney access to the Legal Research entry point were observed. Every tab was not repeated under the attorney role.", "E02_attorney_dashboard.png"),
    "TS-53": ("Pass", "Citizen and attorney profiles loaded role-appropriate identity and account information; the citizen profile showed verified-account status.", "E15_attorney_profile.png"),
    "TS-55": ("Partial", "Log Out was found at the bottom of Profile and was absent from the ordinary screens sampled. Logout was not tapped to preserve the active test session.", "E16_profile_logout_location.png"),
}

# Activity scope begins with existing, already verified accounts after login.
# Authentication, registration, Didit identity/professional verification,
# protected-route, and logout checks are intentionally excluded.
REMOVED_SCENARIOS = {f"TS-{number:02d}" for number in range(1, 12)} | {"TS-55"}
remaining_ids = [f"TS-{number:02d}" for number in range(1, 57) if f"TS-{number:02d}" not in REMOVED_SCENARIOS]
SCENARIO_RENUMBER = {old_id: f"TS-{index:02d}" for index, old_id in enumerate(remaining_ids, 1)}
GROUPS = [
    (group_name, [(SCENARIO_RENUMBER[scenario_id], description) for scenario_id, description in scenarios if scenario_id in SCENARIO_RENUMBER])
    for group_name, scenarios in GROUPS
    if any(scenario_id in SCENARIO_RENUMBER for scenario_id, _ in scenarios)
]
CASES = [case_item for case_item in CASES if case_item["scenario"] in SCENARIO_RENUMBER]
for case_item in CASES:
    case_item["scenario"] = SCENARIO_RENUMBER[case_item["scenario"]]
EXECUTED_RESULTS = {
    SCENARIO_RENUMBER[scenario_id]: result
    for scenario_id, result in EXECUTED_RESULTS.items()
    if scenario_id in SCENARIO_RENUMBER
}

def execution_for(scenario):
    if not ANSWERED:
        return ("Not Run", "_______________________________________________<br/>_______________________________________________", None)
    return EXECUTED_RESULTS.get(scenario, (
        "Not Executed",
        "Not executed in this smoke run. This case requires destructive data changes, forced outage conditions, upload fixtures, event-generation setup, or dedicated accessibility/security instrumentation.",
        None,
    ))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=30, textColor=colors.HexColor("#17365D"), alignment=TA_CENTER, spaceAfter=16))
styles.add(ParagraphStyle(name="H1Blue", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor("#17365D"), spaceBefore=10, spaceAfter=8))
styles.add(ParagraphStyle(name="H2Blue", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#2563EB"), spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle(name="BodySmall", parent=styles["BodyText"], fontSize=8.5, leading=12, spaceAfter=4))
styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontSize=7.2, leading=9))
styles.add(ParagraphStyle(name="CellBold", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=9))
styles.add(ParagraphStyle(name="CaseTitle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#17365D"), spaceAfter=6))

def P(text, style="BodySmall"):
    safe_text = str(text).replace(chr(0x2022), "-").replace(chr(0x2014), "-")
    return Paragraph(safe_text.replace("&", "&amp;"), styles[style])

def numbered(items):
    return "<br/>".join(f"{i}. {str(v)}" for i, v in enumerate(items, 1))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D9E2F3"))
    canvas.line(16*mm, 13*mm, A4[0]-16*mm, 13*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(16*mm, 8*mm, "Software Testing / Software Quality Assurance | Activity 1 - JusticeLink Mobile")
    canvas.drawRightString(A4[0]-16*mm, 8*mm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=16*mm, leftMargin=16*mm, topMargin=16*mm, bottomMargin=18*mm, title="Uy Activity 1 - Test Scenarios and Test Cases", author="Uy")
story = []
story += [Spacer(1, 24*mm), P("ACTIVITY 1 - FINALS", "H2Blue"), P("Test Scenarios and Test Cases Development", "CoverTitle"), Spacer(1, 5*mm), P("JusticeLink / LAYA Mobile Legal-Aid Application", "H1Blue"), Spacer(1, 4*mm)]
cover = Table([
    [P("Prepared by", "CellBold"), P("Uy", "Cell")],
    [P("Document", "CellBold"), P("Executed Mobile System Test Report" if ANSWERED else "Comprehensive Mobile System Test Specification", "Cell")],
    [P("Prepared", "CellBold"), P(date.today().isoformat(), "Cell")],
    [P("Primary roles", "CellBold"), P("Citizen and Volunteer Attorney", "Cell")],
    [P("Target platforms", "CellBold"), P("Android mobile application; Pixel 9 Pro and Pixel 10 Pro emulators", "Cell")],
], colWidths=[38*mm, 125*mm])
cover.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#B4C6E7")),("BACKGROUND",(0,0),(0,-1),colors.HexColor("#EAF2F8")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story += [cover, PageBreak()]

story += [P("Learning Outcomes", "H1Blue")]
for x in ["Identify all JusticeLink mobile functions that require verification.","Write high-level test scenarios describing what must be tested.","Derive repeatable test cases with preconditions, steps, data, and expected outcomes.","Cover positive, negative, security, privacy, integration, and recovery paths.","Create a reusable checklist for two-emulator citizen/attorney system testing."]:
    story.append(P("• " + x))

story += [P("Part 1: Application Information", "H1Blue")]
info = [
    ("Application Name", "JusticeLink / LAYA"),
    ("Application Type/Category", "Cross-platform mobile legal-aid and legal-research application"),
    ("Primary Users", "Citizen/Public User and Verified Volunteer Attorney"),
    ("Existing Test Accounts", "Citizen: uylancejr@gmail.com; Attorney: uylance67@gmail.com; both accounts are already verified and logged in before testing begins"),
    ("External Services", "Supabase Database/Storage/Realtime, Groq AI, Juris API, Open Congress API"),
    ("Main Features/Modules", "Role dashboards; AI Legal Help Assessment; attorney matching and case lifecycle; messaging and file sharing; Document Drafter and saved documents; Rights Guides; Juris Cases and Laws; Pending Bills; notifications; profiles, settings, and security."),
]
t = Table([[P("Item","CellBold"),P("Details","CellBold")]] + [[P(a,"CellBold"),P(b,"Cell")] for a,b in info], colWidths=[43*mm,120*mm], repeatRows=1)
t.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.45,colors.HexColor("#AAB7C4")),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#D9EAF7")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story += [t, PageBreak()]

story += [P("Part 2: Test Scenarios", "H1Blue")]
all_scenarios = [x for _,items in GROUPS for x in items]
for group, items in GROUPS:
    story.append(P(group, "H2Blue"))
    rows = [[P("Scenario ID","CellBold"),P("Test Scenario","CellBold")]] + [[P(i,"CellBold"),P(s,"Cell")] for i,s in items]
    tab = LongTable(rows, colWidths=[25*mm,138*mm], repeatRows=1)
    tab.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#B8C4CE")),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#EAF2F8")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story += [tab, Spacer(1,3*mm)]
story.append(PageBreak())

story += [P("Part 3: Detailed Test Cases", "H1Blue")]
for idx, c in enumerate(CASES):
    execution_status, actual_result, evidence_file = execution_for(c["scenario"])
    rows = [
        [P("Field","CellBold"), P("Details","CellBold")],
        [P("Test Case ID","CellBold"), P(c["id"],"Cell")],
        [P("Title" if ANSWERED else "Test Case Title","CellBold"), P(c["title"],"Cell")],
        [P("Related Scenario","CellBold"), P(c["scenario"],"Cell")],
        [P("Preconditions","CellBold"), P(numbered(c["pre"]),"Cell")],
        [P("Test Steps","CellBold"), P(numbered(c["steps"]),"Cell")],
        [P("Test Data","CellBold"), P(c["data"],"Cell")],
        [P("Expected Result","CellBold"), P(numbered(c["expected"]),"Cell")],
    ]
    if ANSWERED:
        rows.insert(4, [P("Role / Priority / Type","CellBold"), P(f'{c["role"]} / {c["priority"]} / {c["kind"]}',"Cell")])
        rows += [
            [P("Actual Result","CellBold"), P(actual_result,"Cell")],
            [P("Status / Evidence","CellBold"), P(f"{execution_status} | {evidence_file}" if evidence_file else f"{execution_status} | No screenshot captured", "Cell")],
        ]
    tab = Table(rows, colWidths=[38*mm,125*mm], repeatRows=1)
    tab.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.45,colors.HexColor("#9EADB8")),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#D9EAF7")),("BACKGROUND",(0,1),(0,-1),colors.HexColor("#F3F7FA")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    case_content = [P(f'{c["id"]}: {c["title"]}', "CaseTitle"), tab]
    if ANSWERED and evidence_file:
        evidence_path = EVIDENCE_DIR / evidence_file
        if evidence_path.exists():
            proof = Image(str(evidence_path))
            proof._restrictSize(55*mm, 105*mm)
            case_content += [Spacer(1, 3*mm), P(f"Screenshot proof: {evidence_file}", "CellBold"), proof]
    story += [KeepTogether(case_content), Spacer(1,5*mm)]
    if idx < len(CASES)-1:
        story.append(PageBreak())

if not ANSWERED:
    story += [
        PageBreak(),
        P("Part 4: Reflection", "H1Blue"),
        P("1. What is the difference between a Test Scenario and a Test Case?", "H2Blue"),
        P("A Test Scenario is a high-level statement describing what feature or workflow must be verified. A Test Case provides the specific preconditions, steps, data, and expected results needed to verify that scenario."),
        P("2. Why is it important to create test cases before testing an application?", "H2Blue"),
        P("Preparing test cases makes testing systematic and repeatable. It helps ensure that important workflows, negative paths, integrations, and expected outcomes are not overlooked."),
        P("3. Which JusticeLink feature may be the most challenging to test, and why?", "H2Blue"),
        P("The AI Legal Help Assessment is among the most challenging because its responses may vary while still needing to remain relevant, private, grounded in legal sources, and safe when an external research service is unavailable. Messaging also requires coordinated testing between the existing citizen and attorney accounts."),
        Spacer(1,8*mm),
        P("- End of Activity 1 -", "H2Blue"),
    ]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"Created {OUT} ({OUT.stat().st_size} bytes)")
    raise SystemExit(0)

story += [PageBreak(), P("Part 4: Requirements Traceability and Execution Summary", "H1Blue")]
trace_rows = [[P("Module","CellBold"),P("Scenario Range","CellBold"),P("Test Case Range","CellBold"),P("Coverage","CellBold")]]
mapping = [
    ("Dashboard/Navigation","TS-01 to TS-03","TC_NAV_001 to 003","Both roles and navigation state"),
    ("AI Triage","TS-04 to TS-10","TC_TRIAGE_001 to 007","Question flow, grounding, fallback, privacy, submission"),
    ("Cases/Attorney Workflow","TS-11 to TS-17","TC_CASE_001 to 007","Lifecycle, access, hours, similar cases"),
    ("Messaging","TS-18 to TS-23","TC_MSG_001 to 006","Realtime, files, errors, authorization"),
    ("Document Drafter","TS-24 to TS-30","TC_DOC_001 to 007","Collection, grounding, safety, export, persistence"),
    ("Legal Library","TS-31 to TS-38","TC_LIB_001 to 008","Rights guides, Juris, bills, links, resilience, roles"),
    ("Notifications/Profile/Settings","TS-39 to TS-44","TC_NOTIF/PROFILE/SETTINGS/NFR","Realtime, profile, settings, accessibility"),
]
trace_rows += [[P(a,"Cell"),P(b,"Cell"),P(c,"Cell"),P(d,"Cell")] for a,b,c,d in mapping]
tab=LongTable(trace_rows,colWidths=[37*mm,34*mm,45*mm,47*mm],repeatRows=1)
tab.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.45,colors.HexColor("#AAB7C4")),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#D9EAF7")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
story += [tab, Spacer(1,6*mm), P("Execution summary", "H2Blue")]
if ANSWERED:
    status_counts = {"Pass": 0, "Partial": 0, "Fail": 0, "Not Executed": 0}
    for case_item in CASES:
        case_status = execution_for(case_item["scenario"])[0]
        status_counts[case_status] = status_counts.get(case_status, 0) + 1
    summary_rows = [
        [P("Total","CellBold"),P("Pass","CellBold"),P("Partial","CellBold"),P("Fail","CellBold"),P("Not Executed","CellBold")],
        [P(str(len(CASES)),"Cell"),P(str(status_counts["Pass"]),"Cell"),P(str(status_counts["Partial"]),"Cell"),P(str(status_counts["Fail"]),"Cell"),P(str(status_counts["Not Executed"]),"Cell")],
    ]
else:
    summary_rows = [[P("Total","CellBold"),P("Pass","CellBold"),P("Fail","CellBold"),P("Blocked","CellBold"),P("Not Run","CellBold")],[P(str(len(CASES)),"Cell"),P("","Cell"),P("","Cell"),P("","Cell"),P("","Cell")]]
summary = Table(summary_rows,colWidths=[32.6*mm]*5)
summary.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#9EADB8")),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#EAF2F8")),("ALIGN",(0,0),(-1,-1),"CENTER"),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
story += [summary, PageBreak(), P("Part 5: Reflection", "H1Blue"), P("1. What is the difference between a Test Scenario and a Test Case?", "H2Blue"), P("A Test Scenario is a high-level statement of what must be verified, normally representing a user goal, feature, risk, or workflow. A Test Case explains exactly how to perform that verification through defined preconditions, data, numbered steps, and observable expected results. One scenario may require several positive, negative, security, boundary, or recovery cases."), P("2. Why should test cases be prepared before mobile system testing?", "H2Blue"), P("Prepared cases make execution repeatable across devices and testers. They prevent important negative paths from being forgotten, define objective pass/fail criteria, document test data, and create evidence for regression testing after changes to the AI, backend, database policies, or mobile interface."), P("3. What is most challenging in testing JusticeLink?", "H2Blue"), P("The greatest challenge is validating multi-user and external-service behavior. A single citizen action can affect Supabase data, attorney dashboards, realtime messages, notifications, AI output, and Juris research. AI results are probabilistic, so tests must validate structure, grounding, privacy, and safe fallback rather than demand identical prose. Didit must be tested with synthetic provider-approved fixtures rather than real personal identity documents."), P("4. Testing principle for legal AI", "H2Blue"), P("Juris summaries and generated assessments are research aids, not legal authority. Tests must confirm that consequential claims link to authoritative sources, that failures never fabricate citations, and that private case identifiers are removed before external research requests."), Spacer(1,8*mm), P("— End of Activity 1 —", "H2Blue")]

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(f"Created {OUT} ({OUT.stat().st_size} bytes)")
