"""Normalize model formatting before it becomes document or chat UI text."""
import re


def plain_ai_text(text: str) -> str:
    text = re.sub(r"(?m)^\s*(`{3,}|~{3,})[^\n]*\n?", "", text)
    text = re.sub(r"(?m)^\s*#{1,6}\s+", "", text)
    text = re.sub(r"(?m)^\s*(?:\*\s*){3,}$", "", text)
    text = re.sub(r"(?m)^\s*[*-]\s+", "• ", text)
    text = re.sub(r"(\*{1,3}|_{1,3})(\S[\s\S]*?\S|\S)\1", r"\2", text)
    text = re.sub(r"`+([^`]+)`+", r"\1", text)
    return text.strip()


def draft_response(reply: str) -> dict[str, str]:
    text = plain_ai_text(reply)
    match = re.match(r"^(DOCUMENT|QUESTION)\s*:\s*", text, re.I)
    kind = "document" if match and match.group(1).upper() == "DOCUMENT" else "question"
    content = text[match.end():].strip() if match else text
    return {"kind": kind, "content": content, "response": f"{kind.upper()}: {content}"}
