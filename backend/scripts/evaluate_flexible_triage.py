"""Manual live-model evaluation using synthetic concerns only (no account writes).

Run: python backend/scripts/evaluate_flexible_triage.py
Calls the configured AI provider; outputs conversational replies for human review.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from triage_service import generate_interactive_triage, parse_triage_turn


SCENARIOS = [
    ("explicit_english", "seek_attorney", ["My neighbor punched me yesterday outside my house. I want to press charges."]),
    ("explicit_filipino", "seek_attorney", ["Sinuntok ako ng kapitbahay kahapon. Gusto kong magsampa ng kaso."]),
    ("negation", "guidance_only", ["Hindi pa nababayaran ang sweldo ko. Ayokong magsampa ng kaso. Gusto ko lang malaman ang rights ko."]),
    ("question", "undecided", ["My employer hasn't paid my wages for two months. Should I press charges? I am not sure what to do."]),
    ("quotation", "undecided", ['My friend said "I want to press charges" about my unpaid salary, but I am undecided.']),
    ("change_mind", "guidance_only", ["Gusto kong magsampa ng kaso dahil hindi binayaran ang sweldo ko.", "Nagbago ang isip ko. Ayoko munang magsampa. Gusto ko lang malaman ang rights ko."]),
    ("unknown_facts", "guidance_only", ["Hindi pa binayaran ng employer ang final salary ko. Gusto ko lang ng guidance. Hindi ko alam ang eksaktong petsa, wala akong dokumento, at ayokong sabihin ang location."]),
    ("safety", {"undecided", "guidance_only"}, ["My partner threatened to hurt me and is outside my door right now. I'm scared and don't know what to do."]),
]


def main():
    passed = 0
    selected = [scenario for scenario in SCENARIOS if len(sys.argv) == 1 or scenario[0] in sys.argv[1:]]
    for name, expected, turns in selected:
        history = []
        for text in turns:
            history.append({"role": "user", "content": text})
            try:
                turn = parse_triage_turn(generate_interactive_triage(history, action="continue"), "continue")
            except Exception as error:
                print(json.dumps({"scenario": name, "unavailable": True, "error_type": type(error).__name__}), flush=True)
                return 2
            history.append({"role": "assistant", "content": turn["reply"]})
        valid = (turn["intent"] in expected if isinstance(expected, set) else turn["intent"] == expected) and turn["assessment"] is None
        passed += int(valid)
        print(json.dumps({"scenario": name, "passed": valid, **turn}, ensure_ascii=True), flush=True)
        if name == "explicit_filipino" and turn["review_ready"]:
            reviewed = parse_triage_turn(generate_interactive_triage(history, action="assess"), "assess")
            assert reviewed["assessment"] is not None
            assert reviewed["assessment"]["possible_options"] == []
            print(json.dumps({"scenario": "explicit_assessment", **reviewed}, ensure_ascii=True), flush=True)
    print(f"Intent and no-premature-assessment checks: {passed}/{len(selected)}", flush=True)
    return 0 if passed == len(selected) else 1


if __name__ == "__main__":
    raise SystemExit(main())
