"""PERSON and ADDRESS detection (task 8, tuned in task 19).

Primary: GLiNER (urchade/gliner_multi_pii-v1), offline, multilingual, so it
copes with Hinglish. Long texts are split into overlapping word windows.

Always on: an Indian postal-address rule (premises word such as Flat /
Plot / House No. / Unit ... comma-separated parts ... 6-digit PIN). Tuning
on the dataset showed GLiNER misses addresses in the "House No. 401, ...,
Delhi - 110017" layout, so the rule and the model run together and the
merge step joins their spans.

Fallback (the plan's 6:50 checkpoint rule): if GLiNER cannot load, or
PII_NER=spacy is set, use spaCy's PERSON entities plus the address rules.

Filters drop generic words the model sometimes tags ("Hi Team",
"Technical Support", a lone "Address").
"""
from __future__ import annotations

import os
import re
from functools import lru_cache

from .contracts import Entity

GLINER_MODEL = "urchade/gliner_multi_pii-v1"
GLINER_LABELS = {"person": "PERSON", "address": "ADDRESS"}
GLINER_THRESHOLD = 0.45
WINDOW_WORDS = 200   # GLiNER sees at most ~384 tokens; stay well under
OVERLAP_WORDS = 30   # so a name on a window edge is still seen whole once

ADDRESS_KEYWORDS = (
    r"Nagar|Road|Rd|Marg|Sector|Colony|Street|St|Lane|Chowk|Layout|Enclave|Vihar|Bagh|"
    r"Puram|Gali|Society|Apartments?|Apts?|Residency|Complex|Phase|Block|Mohalla|Basti|"
    r"Gaon|Village|Taluka|Tehsil|District|Dist|Cross|Main|Salai|Rasta|Gallu|Bazaar|Bazar|"
    r"Market|Nivas|Niwas|Bhavan|Bhawan|Tower|Towers|Hills|Lakeview|Park|Heights|Villa|Gardens|Estate"
)
_ADDRESS_RE = re.compile(
    r"(?:\b(?:Flat|House|H\.?\s?No\.?|Plot|Door|Shop)\s*[\w/-]+,?\s*)?"
    r"(?:\b\d{1,5}[A-Za-z]?(?:/\d+)?,?\s+)?"
    r"(?:[A-Z][\w.'-]*\s+){0,4}"
    r"(?:" + ADDRESS_KEYWORDS + r")\b"
    r"(?:[ ,]+[A-Z0-9][\w.'-]*){0,6}"
    r"(?:[ ,-]+[1-9][0-9]{2}\s?[0-9]{3})?",
)
_PIN_RE = re.compile(r"\b[1-9][0-9]{2}\s?[0-9]{3}\b")

# Premises word + number, 1-8 comma-separated parts, then a 6-digit PIN.
_PREMISES = (r"House|H\.?\s?No|Flat|Plot|Unit|Door|Shop|Block|Bldg|Building|Apt|Apartment|"
             r"Room|Office|Survey|Khasra|Ward|Quarters?|Qtr|Villa|Bungalow|Wing|Site|Premises|Floor|Tower")
POSTAL_ADDRESS_RE = re.compile(
    r"\b(?:" + _PREMISES + r")\.?(?:\s*No\.?)?\s*#?[A-Za-z0-9][A-Za-z0-9/-]*"
    r"(?:,\s*[^,\n]{2,60}?){1,8}?"
    r"[\s,–-]*[1-9][0-9]{2}\s?[0-9]{3}\b",
    re.IGNORECASE,
)

_NON_PERSON_PHRASES = {
    "govt of india", "government of india", "income tax department", "tax department",
    "election commission of india", "election commission", "republic of india",
    "unique identification authority of india", "uidai", "state government",
    "central government", "customer support", "technical support", "help desk",
    "helpdesk", "fathers name", "mothers name", "husbands name", "date of birth",
    "authorized signatory", "signature of holder", "permanent account number",
}

_NOT_A_PERSON = {
    "hi", "hello", "dear", "team", "support", "technical", "customer", "care", "service",
    "sir", "madam", "maam", "manager", "officer", "desk", "department", "dept", "bank",
    "branch", "applicant", "nominee", "owner", "agent", "executive", "helpdesk", "admin",
    "user", "client", "regards", "thanks", "ji",
    "aadhaar", "aadhar", "adhaar", "adhar", "pan", "gstin", "voter", "passport", "epic",
    "uid", "uidai", "govt", "government", "india", "bharat", "sarkar", "state", "ministry",
    "income", "tax", "commission", "election", "authority", "card", "cardholder", "signatory",
}
_NOT_AN_ADDRESS = {"address", "addresses", "residence", "office", "home", "permanent",
                   "current", "communication", "residential", "mailing", "delivery"}


def _plausible(e: Entity) -> bool:
    clean_text = re.sub(r"[^\w\s]", "", e.text.casefold()).strip()
    if clean_text in _NON_PERSON_PHRASES:
        return False
    words = re.findall(r"[^\W\d_]+", e.text.casefold())
    if not words:
        return False
    if e.type == "PERSON":
        if any(p in clean_text for p in _NON_PERSON_PHRASES):
            return False
        if all(w in _NOT_A_PERSON for w in words):
            return False
        if len(words) == 1 and (words[0] in _NOT_A_PERSON or len(words[0]) < 2):
            return False
        return True
    if e.type == "ADDRESS":
        return not all(w in _NOT_AN_ADDRESS for w in words) and len(e.text.strip()) >= 4
    return True


def _detect_postal(text: str) -> list[Entity]:
    return [Entity(type="ADDRESS", start=m.start(), end=m.end(), text=m.group(),
                   score=0.9, source="regex")
            for m in POSTAL_ADDRESS_RE.finditer(text)]


@lru_cache(maxsize=1)
def _gliner():
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    from gliner import GLiNER

    return GLiNER.from_pretrained(GLINER_MODEL)


def ner_backend() -> str:
    """'gliner' when the model is usable, otherwise 'spacy-fallback'."""
    if os.environ.get("PII_NER", "").lower() == "spacy":
        return "spacy-fallback"
    try:
        _gliner()
        return "gliner"
    except Exception:  # noqa: BLE001 - any load failure means fallback
        return "spacy-fallback"


def _windows(text: str):
    """Yield (char_offset, chunk) word windows that overlap a little."""
    words = list(re.finditer(r"\S+", text))
    if not words:
        return
    step = WINDOW_WORDS - OVERLAP_WORDS
    for i in range(0, len(words), step):
        chunk = words[i:i + WINDOW_WORDS]
        start, end = chunk[0].start(), chunk[-1].end()
        yield start, text[start:end]
        if i + WINDOW_WORDS >= len(words):
            break


def _split_multiline_person(ent: Entity, text: str) -> list[Entity]:
    if "\n" not in ent.text and "\r" not in ent.text:
        return [ent]
    res = []
    lines = re.split(r"[\r\n]+", ent.text)
    curr_offset = ent.start
    for line in lines:
        if not line.strip():
            continue
        idx = text.find(line, curr_offset)
        if idx != -1:
            start = idx
            end = start + len(line)
            trimmed = line.strip(" \t,;:-.")
            if trimmed:
                t_start = start + line.find(trimmed)
                t_end = t_start + len(trimmed)
                res.append(Entity(type="PERSON", start=t_start, end=t_end,
                                  text=text[t_start:t_end], score=ent.score, source=ent.source))
            curr_offset = end
    return res


def _detect_gliner(text: str) -> list[Entity]:
    model = _gliner()
    out = []
    for offset, chunk in _windows(text):
        for p in model.predict_entities(chunk, list(GLINER_LABELS), threshold=GLINER_THRESHOLD):
            s, e = offset + p["start"], offset + p["end"]
            ent = Entity(type=GLINER_LABELS[p["label"]], start=s, end=e,
                         text=text[s:e], score=float(p["score"]), source="gliner")
            if ent.type == "PERSON" and ("\n" in ent.text or "\r" in ent.text):
                out.extend(_split_multiline_person(ent, text))
            else:
                out.append(ent)
    return out


def _detect_fallback(text: str) -> list[Entity]:
    from .recognizers import get_analyzer

    out = []
    artifacts = get_analyzer().nlp_engine.process_text(text, "en")
    for ent in artifacts.entities:
        if ent.label_ == "PERSON":
            out.append(Entity(type="PERSON", start=ent.start_char, end=ent.end_char,
                              text=ent.text, score=0.6, source="spacy"))
    for m in _ADDRESS_RE.finditer(text):
        out.append(Entity(type="ADDRESS", start=m.start(), end=m.end(),
                          text=m.group(), score=0.6, source="regex"))
    for m in _PIN_RE.finditer(text):  # a bare PIN code still narrows down a home
        out.append(Entity(type="ADDRESS", start=m.start(), end=m.end(),
                          text=m.group(), score=0.4, source="regex"))
    return out


def detect_names_addresses(text: str) -> list[Entity]:
    found = _detect_gliner(text) if ner_backend() == "gliner" else _detect_fallback(text)
    found += _detect_postal(text)
    return [e for e in found if _plausible(e)]
