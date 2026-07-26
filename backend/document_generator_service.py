from copy import deepcopy
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from config import config

DocumentTemplate = dict[str, Any]

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

AI_DRAFT_SYSTEM_PROMPT = (
    "You are a legal drafting assistant for JusticeLink Philippines. "
    "Draft professional, clear, and respectful letters in plain language for self-advocacy. "
    "Use only user-provided facts. Never invent names, dates, addresses, or amounts. "
    "Keep tone formal and practical. Do not claim the letter is legal advice."
)

_templates_synced = False

FALLBACK_TEMPLATES: list[DocumentTemplate] = [
    {
        "id": None,
        "slug": "demand-deposit",
        "title": "Demand Letter para sa Security Deposit",
        "description": "Formal na sulat para sa pagbawi ng security deposit mula sa landlord.",
        "category": "Housing",
        "estimated_minutes": 7,
        "law_basis": "RA 9653 (Rent Control Act), Civil Code obligations",
        "required_fields": [
            {"key": "sender_name", "label": "Iyong Buong Pangalan", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Pangalan ng Landlord", "type": "text", "required": True},
            {"key": "incident_date", "label": "Petsa ng Pangyayari", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Buod ng Isyu", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "sender_address", "label": "Iyong Address", "type": "textarea", "required": False},
            {"key": "amount_claimed", "label": "Halagang Kiniklaim", "type": "text", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n"
            "Address: {{sender_address}}\n\n"
            "Subject: Formal Demand for Return of Security Deposit\n\n"
            "Dear {{recipient_name}},\n\n"
            "I am writing regarding the return of my security deposit under our lease arrangement. "
            "The amount due is {{amount_claimed}}.\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "I respectfully request that the full deposit be returned within ten (10) days from receipt of this letter.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "wage-claim",
        "title": "Notice of Unpaid Wages",
        "description": "Notice para sa hindi nabayarang sahod, overtime, o final pay.",
        "category": "Labor",
        "estimated_minutes": 10,
        "law_basis": "Labor Code of the Philippines, DOLE labor standards",
        "required_fields": [
            {"key": "sender_name", "label": "Iyong Buong Pangalan", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Pangalan ng Employer/HR", "type": "text", "required": True},
            {"key": "incident_date", "label": "Petsa ng Pangyayari", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Detalyeng ng Hindi Nabayarang Sahod", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "amount_claimed", "label": "Halagang Kiniklaim", "type": "text", "required": False},
            {"key": "position_title", "label": "Trabaho/Posisyon", "type": "text", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n"
            "Position: {{position_title}}\n\n"
            "Subject: Notice of Unpaid Wages and Benefits\n\n"
            "Dear {{recipient_name}},\n\n"
            "This is a formal notice regarding unpaid wages and benefits in the amount of {{amount_claimed}}.\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "I request payment and written confirmation of compliance within five (5) working days.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "repair-demand",
        "title": "Request for Repairs",
        "description": "Request letter para ipaayos ang rental property defects.",
        "category": "Housing",
        "estimated_minutes": 6,
        "law_basis": "Civil Code obligations of lessor; implied habitability obligations",
        "required_fields": [
            {"key": "sender_name", "label": "Iyong Buong Pangalan", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Pangalan ng Landlord/Property Manager", "type": "text", "required": True},
            {"key": "incident_date", "label": "Petsa ng Request", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Mga Sira na Dapat Ayusin", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "property_address", "label": "Address ng Paupahan", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Formal Request for Repairs\n\n"
            "Dear {{recipient_name}},\n\n"
            "I respectfully request immediate repair and maintenance for the following issues in the leased premises:\n"
            "{{issue_summary}}\n\n"
            "Property address: {{property_address}}\n\n"
            "Please provide a repair schedule within five (5) days from receipt of this letter.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "barangay-sumbong",
        "title": "Barangay Complaint Draft",
        "description": "Template complaint para sa Barangay Lupon Tagapamayapa.",
        "category": "Barangay",
        "estimated_minutes": 9,
        "law_basis": "Katarungang Pambarangay Law and local barangay conciliation rules",
        "required_fields": [
            {"key": "sender_name", "label": "Iyong Buong Pangalan", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Pangalan ng Inirereklamo", "type": "text", "required": True},
            {"key": "incident_date", "label": "Petsa ng Pangyayari", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Buod ng Reklamo", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "relief_requested", "label": "Hinihiling na Aksyon", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: Barangay Office / Lupon Tagapamayapa\n\n"
            "Complainant: {{sender_name}}\n"
            "Respondent: {{recipient_name}}\n\n"
            "Subject: Barangay Complaint\n\n"
            "I respectfully submit this complaint for mediation and settlement with the following facts:\n{{issue_summary}}\n\n"
            "Relief requested:\n{{relief_requested}}\n\n"
            "I am requesting barangay mediation and appropriate action."
        ),
    },
    {
        "id": None,
        "slug": "illegal-dismissal-request",
        "title": "Request for Review of Illegal Dismissal",
        "description": "Formal request for reinstatement, due process review, or separation pay discussion.",
        "category": "Labor",
        "estimated_minutes": 12,
        "law_basis": "Labor Code of the Philippines (security of tenure, due process requirements)",
        "required_fields": [
            {"key": "sender_name", "label": "Employee Full Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Employer / HR Name", "type": "text", "required": True},
            {"key": "incident_date", "label": "Date of Dismissal", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Facts of Dismissal", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "position_title", "label": "Position", "type": "text", "required": False},
            {"key": "relief_requested", "label": "Requested Relief", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n"
            "Position: {{position_title}}\n\n"
            "Subject: Request for Review of Dismissal\n\n"
            "Dear {{recipient_name}},\n\n"
            "I am requesting a formal review of my dismissal and the process followed.\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "Requested relief:\n{{relief_requested}}\n\n"
            "I respectfully request a written response at the soonest possible time.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "workplace-harassment-complaint",
        "title": "Workplace Harassment Complaint",
        "description": "Professional complaint letter for workplace sexual harassment or hostile conduct.",
        "category": "Labor",
        "estimated_minutes": 14,
        "law_basis": "RA 7877 (Anti-Sexual Harassment Act), RA 11313 (Safe Spaces Act)",
        "required_fields": [
            {"key": "sender_name", "label": "Complainant Full Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "HR / Committee / Employer", "type": "text", "required": True},
            {"key": "incident_date", "label": "Date of Incident", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Detailed Incident Facts", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "respondent_name", "label": "Person Complained Against", "type": "text", "required": False},
            {"key": "relief_requested", "label": "Requested Protection/Action", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Workplace Harassment Complaint\n\n"
            "Dear {{recipient_name}},\n\n"
            "I respectfully file this complaint regarding harassment involving {{respondent_name}}.\n\n"
            "Incident details:\n{{issue_summary}}\n\n"
            "Requested action:\n{{relief_requested}}\n\n"
            "I request prompt investigation and written updates on this complaint.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "vawc-protection-request",
        "title": "VAWC Protection and Assistance Request",
        "description": "Draft request letter for immediate assistance and protection in VAWC situations.",
        "category": "Family",
        "estimated_minutes": 13,
        "law_basis": "RA 9262 (Anti-Violence Against Women and Their Children Act)",
        "required_fields": [
            {"key": "sender_name", "label": "Survivor/Complainant Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Barangay / PNP Women and Children Desk / Court", "type": "text", "required": True},
            {"key": "incident_date", "label": "Latest Incident Date", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Summary of Abuse/Threat", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "respondent_name", "label": "Respondent Name", "type": "text", "required": False},
            {"key": "relief_requested", "label": "Requested Protection", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Request for Immediate Protection and Assistance\n\n"
            "I respectfully request immediate protection and assistance regarding violence/threats committed by {{respondent_name}}.\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "Requested protection:\n{{relief_requested}}\n\n"
            "I request urgent action consistent with victim safety protocols.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "child-support-demand",
        "title": "Child Support Demand Letter",
        "description": "Formal demand for regular child support and reimbursement of necessary expenses.",
        "category": "Family",
        "estimated_minutes": 11,
        "law_basis": "Family Code of the Philippines (support obligations), RA 9262 where applicable",
        "required_fields": [
            {"key": "sender_name", "label": "Parent/Guardian Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Obligated Parent Name", "type": "text", "required": True},
            {"key": "incident_date", "label": "Demand Date", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Child Needs and Current Situation", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "amount_claimed", "label": "Monthly Support Amount Requested", "type": "text", "required": False},
            {"key": "child_name", "label": "Child Name", "type": "text", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Demand for Child Support\n\n"
            "Dear {{recipient_name}},\n\n"
            "I am formally requesting regular support for {{child_name}} in the amount of {{amount_claimed}} per month.\n\n"
            "Summary of needs:\n{{issue_summary}}\n\n"
            "Please provide written confirmation of support arrangements within five (5) days.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "consumer-refund-demand",
        "title": "Consumer Refund and Remedy Demand",
        "description": "Formal demand for refund, replacement, or repair due to defective goods/services.",
        "category": "Consumer",
        "estimated_minutes": 9,
        "law_basis": "RA 7394 (Consumer Act of the Philippines)",
        "required_fields": [
            {"key": "sender_name", "label": "Consumer Full Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Business / Seller Name", "type": "text", "required": True},
            {"key": "incident_date", "label": "Transaction or Incident Date", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Issue and Defect Details", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "amount_claimed", "label": "Purchase Price / Refund Amount", "type": "text", "required": False},
            {"key": "relief_requested", "label": "Preferred Remedy", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Demand for Consumer Remedy\n\n"
            "Dear {{recipient_name}},\n\n"
            "I write to request a remedy for a defective product/service with a value of {{amount_claimed}}.\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "Requested remedy:\n{{relief_requested}}\n\n"
            "Please resolve this matter within seven (7) days from receipt.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "cybercrime-complaint-draft",
        "title": "Cybercrime / Online Scam Complaint",
        "description": "Structured complaint draft for online scam, phishing, or unauthorized digital activity.",
        "category": "Cybercrime",
        "estimated_minutes": 10,
        "law_basis": "RA 10175 (Cybercrime Prevention Act), Revised Penal Code provisions on estafa",
        "required_fields": [
            {"key": "sender_name", "label": "Complainant Full Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Receiving Office (PNP/NBI/Prosecutor)", "type": "text", "required": True},
            {"key": "incident_date", "label": "Incident Date", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Scam or Cyber Incident Facts", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "amount_claimed", "label": "Estimated Loss Amount", "type": "text", "required": False},
            {"key": "evidence_list", "label": "Available Evidence", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Complaint on Online Scam / Cyber Incident\n\n"
            "I respectfully report an online scam/cyber incident that caused losses of approximately {{amount_claimed}}.\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "Evidence available:\n{{evidence_list}}\n\n"
            "I request investigation and guidance on filing the proper criminal complaint.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "debt-demand-letter",
        "title": "Debt Payment Demand Letter",
        "description": "Formal demand for payment of unpaid debt or obligation.",
        "category": "Civil",
        "estimated_minutes": 8,
        "law_basis": "Civil Code obligations and damages provisions",
        "required_fields": [
            {"key": "sender_name", "label": "Creditor Full Name", "type": "text", "required": True},
            {"key": "recipient_name", "label": "Debtor Name", "type": "text", "required": True},
            {"key": "incident_date", "label": "Demand Date", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Debt Background", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "amount_claimed", "label": "Total Debt Amount", "type": "text", "required": False},
            {"key": "deadline_date", "label": "Payment Deadline", "type": "date", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: Final Demand for Payment\n\n"
            "Dear {{recipient_name}},\n\n"
            "This is a formal demand for payment of your outstanding obligation in the amount of {{amount_claimed}}.\n\n"
            "Background:\n{{issue_summary}}\n\n"
            "Please settle the amount on or before {{deadline_date}} to avoid further legal action.\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "dole-complaint",
        "title": "DOLE Labor Standards Complaint",
        "description": "Formal complaint para sa DOLE Regional/Field Office tungkol sa paglabag sa labor standards.",
        "category": "Labor",
        "estimated_minutes": 12,
        "law_basis": "Labor Code of the Philippines, DOLE Labor Standards Enforcement Framework (LSEF), DOLE Department Order No. 183-17",
        "required_fields": [
            {"key": "sender_name", "label": "Iyong Buong Pangalan (Manggagawa)", "type": "text", "required": True},
            {"key": "employer_name", "label": "Pangalan ng Employer/Kumpanya", "type": "text", "required": True},
            {"key": "employer_address", "label": "Address ng Employer", "type": "textarea", "required": True},
            {"key": "incident_date", "label": "Petsa ng Paglabag / Huling Araw ng Trabaho", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Buod ng Paglabag sa Labor Standards", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "position_title", "label": "Posisyon/Trabaho", "type": "text", "required": False},
            {"key": "amount_claimed", "label": "Kabuuang Halagang Kiniklaim", "type": "text", "required": False},
            {"key": "period_of_employment", "label": "Panahon ng Pagtatrabaho (halimbawa: Jan 2022 – Mar 2024)", "type": "text", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: The Regional Director\n"
            "Department of Labor and Employment (DOLE)\n"
            "[Regional/Field Office]\n\n"
            "From: {{sender_name}}\n"
            "Position: {{position_title}}\n\n"
            "Subject: Labor Standards Complaint Against {{employer_name}}\n\n"
            "I, {{sender_name}}, respectfully file this complaint against my employer:\n\n"
            "Employer: {{employer_name}}\n"
            "Address: {{employer_address}}\n"
            "Period of Employment: {{period_of_employment}}\n\n"
            "Grounds for Complaint:\n{{issue_summary}}\n\n"
            "Amount of Unpaid Claims: {{amount_claimed}}\n\n"
            "I humbly request that the DOLE conduct a labor standards inspection and compel compliance "
            "with the applicable provisions of the Labor Code and its Implementing Rules and Regulations.\n\n"
            "Respectfully submitted,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "ofw-poea-complaint",
        "title": "OFW / POEA Recruitment Complaint",
        "description": "Complaint para sa POEA laban sa recruitment agency o employer na lumabag sa OFW rights.",
        "category": "OFW/Migrant",
        "estimated_minutes": 14,
        "law_basis": "RA 8042 (Migrant Workers and Overseas Filipinos Act), RA 10022, POEA Rules and Regulations",
        "required_fields": [
            {"key": "sender_name", "label": "Buong Pangalan ng OFW / Kamag-anak", "type": "text", "required": True},
            {"key": "agency_name", "label": "Pangalan ng Recruitment Agency", "type": "text", "required": True},
            {"key": "incident_date", "label": "Petsa ng Pangyayari", "type": "date", "required": True},
            {"key": "issue_summary", "label": "Buod ng Reklamo (e.g. contract substitution, overcharging, abandonment, maltreatment)", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "destination_country", "label": "Bansang Patutunguhan / Pinagtatrabahuhan", "type": "text", "required": False},
            {"key": "agency_license", "label": "License Number ng Agency (kung kilala)", "type": "text", "required": False},
            {"key": "amount_claimed", "label": "Halagang Kiniklaim / Bayad na Hindi Naibalik", "type": "text", "required": False},
            {"key": "relief_requested", "label": "Hinahinging Aksyon", "type": "textarea", "required": False},
        ],
        "body_template": (
            "Date: {{incident_date}}\n\n"
            "To: The Administrator\n"
            "Philippine Overseas Employment Administration (POEA)\n"
            "BF Condominium Building, Solana St. cor. Bernardo St., Intramuros, Manila\n\n"
            "From: {{sender_name}}\n\n"
            "Subject: Complaint Against {{agency_name}}\n"
            "License No.: {{agency_license}}\n"
            "Country of Destination: {{destination_country}}\n\n"
            "I respectfully submit this formal complaint against recruitment agency {{agency_name}} for the following:\n\n"
            "Facts:\n{{issue_summary}}\n\n"
            "Monetary Claim: {{amount_claimed}}\n\n"
            "Requested Action:\n{{relief_requested}}\n\n"
            "I request a formal investigation and appropriate sanctions consistent with POEA rules and the Migrant Workers Act.\n\n"
            "Respectfully submitted,\n{{sender_name}}"
        ),
    },
    {
        "id": None,
        "slug": "custom-document-request",
        "title": "Custom Legal Document",
        "description": "Kung wala sa listahan ang kailangan mo, ilarawan dito para subukang gawan ng draft gamit ang AI.",
        "category": "General",
        "estimated_minutes": 15,
        "law_basis": "General legal principles depending on request",
        "required_fields": [
            {"key": "sender_name", "label": "Iyong Buong Pangalan", "type": "text", "required": True},
            {"key": "document_type", "label": "Anong klaseng dokumento ito?", "type": "text", "required": True},
            {"key": "issue_summary", "label": "Buod ng sitwasyon at mga detalye", "type": "textarea", "required": True},
        ],
        "optional_fields": [
            {"key": "recipient_name", "label": "Pangalan ng Padadalhan (kung meron)", "type": "text", "required": False},
        ],
        "body_template": (
            "Date: {{current_date}}\n\n"
            "To: {{recipient_name}}\n"
            "From: {{sender_name}}\n\n"
            "Subject: {{document_type}}\n\n"
            "Details:\n{{issue_summary}}\n\n"
            "Sincerely,\n{{sender_name}}"
        ),
    },
]


def _is_supabase_ready() -> bool:
    return bool(config.supabase_url and config.supabase_service_role_key)


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


def _is_ai_ready() -> bool:
    return bool(config.groq_api_key)


def _normalize_template(row: dict[str, Any]) -> DocumentTemplate:
    return {
        "id": row.get("id"),
        "slug": row.get("slug"),
        "title": row.get("title"),
        "description": row.get("description"),
        "category": row.get("category") or "General",
        "estimated_minutes": row.get("estimated_minutes") or 10,
        "law_basis": row.get("law_basis") or "General legal guidance",
        "required_fields": row.get("required_fields") or [],
        "optional_fields": row.get("optional_fields") or [],
        "body_template": row.get("body_template") or "",
    }


def _db_upsert_payload(template: DocumentTemplate) -> dict[str, Any]:
    return {
        "slug": template.get("slug"),
        "title": template.get("title"),
        "description": template.get("description"),
        "category": template.get("category") or "General",
        "estimated_minutes": template.get("estimated_minutes") or 10,
        "law_basis": template.get("law_basis") or "General legal guidance",
        "body_template": template.get("body_template") or "",
        "required_fields": template.get("required_fields") or [],
        "optional_fields": template.get("optional_fields") or [],
        "is_active": True,
    }


def _sync_templates_to_supabase_once() -> None:
    global _templates_synced
    if _templates_synced or not _is_supabase_ready():
        return

    payload = [_db_upsert_payload(template) for template in FALLBACK_TEMPLATES]
    try:
        response = httpx.post(
            f"{config.supabase_url}/rest/v1/document_templates",
            headers={
                **_supabase_headers(),
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            params={"on_conflict": "slug"},
            json=payload,
            timeout=25,
        )
        if response.status_code < 400:
            _templates_synced = True
    except Exception:
        # Template sync is best effort. Listing still falls back to local templates.
        pass


def _merge_templates_with_fallback(db_templates: list[DocumentTemplate]) -> list[DocumentTemplate]:
    merged_by_slug: dict[str, DocumentTemplate] = {}

    for fallback_template in FALLBACK_TEMPLATES:
        slug = str(fallback_template.get("slug") or "").strip()
        if slug:
            merged_by_slug[slug] = deepcopy(fallback_template)

    for db_template in db_templates:
        slug = str(db_template.get("slug") or "").strip()
        if not slug:
            continue

        existing = merged_by_slug.get(slug)
        if existing:
            existing.update(db_template)
            merged_by_slug[slug] = existing
        else:
            merged_by_slug[slug] = deepcopy(db_template)

    templates = list(merged_by_slug.values())
    templates.sort(key=lambda template: str(template.get("title") or "").lower())
    return templates


def list_document_templates() -> list[DocumentTemplate]:
    _sync_templates_to_supabase_once()

    if _is_supabase_ready():
        try:
            response = httpx.get(
                f"{config.supabase_url}/rest/v1/document_templates",
                headers=_supabase_headers(),
                params={
                    "select": "id,slug,title,description,category,estimated_minutes,law_basis,required_fields,optional_fields,body_template,is_active",
                    "is_active": "eq.true",
                    "order": "title.asc",
                },
                timeout=20,
            )

            if response.status_code < 400:
                rows = response.json() if response.content else []
                normalized = [_normalize_template(row) for row in rows]
                return _merge_templates_with_fallback(normalized)
        except Exception:
            pass

    templates = [deepcopy(template) for template in FALLBACK_TEMPLATES]
    templates.sort(key=lambda template: str(template.get("title") or "").lower())
    return templates


def _find_template(template_id: str | None, template_slug: str | None) -> DocumentTemplate | None:
    templates = list_document_templates()

    if template_id:
        for template in templates:
            if template.get("id") == template_id:
                return template

    if template_slug:
        for template in templates:
            if template.get("slug") == template_slug:
                return template

    return None


def _clean_values(values: dict[str, str]) -> dict[str, str]:
    clean: dict[str, str] = {}
    for key, value in values.items():
        normalized_key = str(key).strip()
        clean[normalized_key] = str(value or "").strip()
    return clean


def _collect_required_keys(template: DocumentTemplate) -> list[str]:
    keys: list[str] = []
    for field in template.get("required_fields", []):
        key = str((field or {}).get("key") or "").strip()
        if key:
            keys.append(key)
    return keys


def _render_template(template_text: str, values: dict[str, str]) -> str:
    pattern = re.compile(r"{{\s*([a-zA-Z0-9_]+)\s*}}")

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        return values.get(key, "")

    rendered = pattern.sub(repl, template_text)
    rendered = re.sub(r"\n{3,}", "\n\n", rendered).strip()
    return rendered


def _format_values_for_prompt(values: dict[str, str]) -> str:
    lines: list[str] = []
    for key, value in values.items():
        if value:
            lines.append(f"- {key}: {value}")
    return "\n".join(lines) if lines else "- No additional values provided"


def _generate_ai_draft(
    template: DocumentTemplate,
    clean_values: dict[str, str],
    rendered_template: str,
) -> str | None:
    if not _is_ai_ready():
        return None

    law_basis = str(template.get("law_basis") or "General legal guidance")
    prompt = (
        f"Template title: {template.get('title')}\n"
        f"Template category: {template.get('category')}\n"
        f"Legal basis to reference: {law_basis}\n\n"
        "User provided values:\n"
        f"{_format_values_for_prompt(clean_values)}\n\n"
        "Structured fallback draft:\n"
        f"{rendered_template}\n\n"
        "Rewrite this as a professional Philippine legal letter draft with these rules:\n"
        "1) Keep all facts consistent with user values and fallback draft only.\n"
        "2) Include: heading/date, addressee, subject line, statement of facts, requested relief, and closing.\n"
        "3) Keep it practical, respectful, and clear for self-advocacy.\n"
        "4) Mention relevant legal basis naturally without giving definitive legal advice.\n"
        "5) Output plain text only."
    )

    payload = {
        "model": config.groq_model,
        "messages": [
            {"role": "system", "content": AI_DRAFT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.25,
        "max_tokens": 900,
    }

    headers = {
        "Authorization": f"Bearer {config.groq_api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            GROQ_CHAT_COMPLETIONS_URL,
            json=payload,
            headers=headers,
            timeout=45,
        )

        if response.status_code >= 400:
            return None

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            return None

        content = (((choices[0] or {}).get("message") or {}).get("content") or "").strip()
        if not content:
            return None

        return content
    except Exception:
        return None


def _persist_generated_document(
    template: DocumentTemplate,
    user_id: str | None,
    values: dict[str, str],
    rendered_content: str,
) -> str | None:
    if not _is_supabase_ready() or not user_id:
        return None

    template_id = template.get("id")
    template_slug = str(template.get("slug") or "").strip()

    if not template_id and template_slug:
        try:
            lookup_response = httpx.get(
                f"{config.supabase_url}/rest/v1/document_templates",
                headers=_supabase_headers(),
                params={
                    "select": "id,slug",
                    "slug": f"eq.{template_slug}",
                    "limit": "1",
                },
                timeout=15,
            )
            if lookup_response.status_code < 400:
                rows = lookup_response.json() if lookup_response.content else []
                if rows and isinstance(rows, list):
                    template_id = rows[0].get("id")
        except Exception:
            template_id = None

    if not template_id:
        return None

    try:
        payload = {
            "user_id": user_id,
            "template_id": template_id,
            "template_slug": template_slug,
            "input_payload": values,
            "generated_text": rendered_content,
            "status": "generated",
        }

        response = httpx.post(
            f"{config.supabase_url}/rest/v1/generated_documents",
            headers={
                **_supabase_headers(),
                "Prefer": "return=representation",
            },
            json=payload,
            timeout=20,
        )

        if response.status_code < 400:
            rows = response.json() if response.content else []
            if rows and isinstance(rows, list):
                return rows[0].get("id")
    except Exception:
        return None

    return None


def generate_document_draft(
    template_id: str | None,
    template_slug: str | None,
    user_id: str | None,
    values: dict[str, str],
) -> dict[str, Any]:
    template = _find_template(template_id=template_id, template_slug=template_slug)
    if not template:
        raise ValueError("Template not found.")

    clean_values = _clean_values(values)
    required_keys = _collect_required_keys(template)
    missing = [key for key in required_keys if not clean_values.get(key)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    rendered_template = _render_template(template.get("body_template", ""), clean_values)
    ai_content = _generate_ai_draft(
        template=template,
        clean_values=clean_values,
        rendered_template=rendered_template,
    )
    content = ai_content or rendered_template

    law_basis = template.get("law_basis") or "General legal guidance"
    content = (
        f"{content}\n\n"
        f"Legal Basis: {law_basis}\n"
        "Disclaimer: This draft is for general information and self-advocacy support. "
        "Consult a licensed lawyer for formal legal advice."
    )

    document_id = _persist_generated_document(
        template=template,
        user_id=user_id,
        values=clean_values,
        rendered_content=content,
    )

    warnings: list[str] = []
    issue_summary = clean_values.get("issue_summary", "")
    if issue_summary and len(issue_summary) < 30:
        warnings.append("Magdagdag pa ng detalye sa 'Buod ng Isyu' para mas malinaw ang dokumento.")

    if clean_values.get("amount_claimed", "").strip() == "" and template.get("slug") in {
        "demand-deposit",
        "wage-claim",
        "child-support-demand",
        "consumer-refund-demand",
        "cybercrime-complaint-draft",
        "debt-demand-letter",
    }:
        warnings.append("Add amount details if available to strengthen the claim.")

    if _is_ai_ready() and not ai_content:
        warnings.append("AI enhancement is temporarily unavailable. A structured template draft was generated.")

    timestamp = datetime.now(timezone.utc)
    file_name = f"{template.get('slug', 'document')}-{timestamp.strftime('%Y%m%d-%H%M')}.pdf"
    generation_mode = "ai" if ai_content else "template"

    return {
        "documentId": document_id,
        "templateTitle": template.get("title"),
        "fileName": file_name,
        "content": content,
        "warnings": warnings,
        "generatedAt": timestamp.isoformat(),
        "source": "database" if template.get("id") else "fallback",
        "generationMode": generation_mode,
        "aiAssisted": bool(ai_content),
    }
