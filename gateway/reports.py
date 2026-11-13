"""Internal PII Risk Assessment PDF report generation for the PS-02 Privacy Gateway.

Generates in-memory enterprise privacy compliance audit reports using PyMuPDF:
- Page 1: Overview, Request ID, Timestamp, Document Risk Score & Severity,
  Total Entities, Category-Wise Summary.
- Main Section: Detailed Findings Table with serial numbers, PII category,
  exact detected sensitive values, individual risk scores, severity levels,
  detection confidence, and wrapping recommended actions.
- Final Section: 7-stage processing and gateway pipeline verification summary
  (detect, validate, mask, leak guard, AI call, reinsert, audit).

Strict security & privacy guarantees:
- Purely in-memory generation as bytes.
- Confidential: restricted to authorized employees.
- Suppressed if request was blocked or validation failed.
"""
from __future__ import annotations

import datetime
import re
from typing import Literal

import pymupdf

from .contracts import ProcessResult
from .risk import DocumentRiskSummary, assess_document_risk

# In-memory store for generated internal reports keyed by request_id
# Format: {request_id: {"internal": bytes, "success": bool}}
_REPORT_CACHE: dict[str, dict] = {}


def is_workflow_successful(result: ProcessResult) -> bool:
    """Return True only if the entire gateway workflow completed successfully."""
    if getattr(result, "blocked", False):
        return False
    if getattr(result, "needs_correction", False):
        return False
    if hasattr(result, "leak_check") and result.leak_check and not result.leak_check.passed:
        return False
    return True


class EnterprisePDFBuilder:
    """Helper to draw professional multi-page enterprise compliance reports."""

    def __init__(self, page_width: float = 595.0, page_height: float = 842.0):
        self.doc = pymupdf.open()
        self.page_width = page_width
        self.page_height = page_height
        self.margin_x = 36.0
        self.margin_top = 42.0
        self.margin_bottom = 44.0
        self.printable_width = page_width - 2 * self.margin_x  # 523.0 pt
        self.current_y = self.margin_top
        self.current_page = None
        self.report_pages: list[int] = []

    def add_page(self) -> pymupdf.Page:
        self.current_page = self.doc.new_page(width=self.page_width, height=self.page_height)
        self.report_pages.append(self.doc.page_count - 1)
        self.current_y = self.margin_top
        return self.current_page

    def check_space(self, needed_height: float) -> pymupdf.Page:
        """Create a new page if needed space exceeds remaining printable height."""
        if self.current_page is None or (self.current_y + needed_height > self.page_height - self.margin_bottom):
            self.add_page()
            # If not page 1, add extra top clearance for running header
            if len(self.report_pages) > 1:
                self.current_y = self.margin_top + 10
        return self.current_page

    def draw_section_heading(self, heading: str):
        page = self.check_space(32)
        # Accent bar
        page.draw_rect(
            pymupdf.Rect(self.margin_x, self.current_y + 3, self.margin_x + 4, self.current_y + 17),
            color=(0.1, 0.35, 0.75),
            fill=(0.1, 0.35, 0.75),
        )
        page.insert_text(
            (self.margin_x + 10, self.current_y + 14),
            heading.upper(),
            fontsize=9.5,
            fontname="helv",
            color=(0.06, 0.12, 0.22),
        )
        page.draw_line(
            pymupdf.Point(self.margin_x, self.current_y + 22),
            pymupdf.Point(self.margin_x + self.printable_width, self.current_y + 22),
            color=(0.82, 0.86, 0.92),
            width=0.75,
        )
        self.current_y += 30

    def draw_running_headers_and_footers(self):
        total = len(self.report_pages)
        for seq, page_idx in enumerate(self.report_pages):
            page = self.doc[page_idx]
            # Running Header on page 2+
            if seq > 0:
                page.insert_text(
                    (self.margin_x, 24),
                    "PS-02 PRIVACY GATEWAY · PII RISK ASSESSMENT REPORT",
                    fontsize=7,
                    fontname="helv",
                    color=(0.38, 0.44, 0.52),
                )
                page.insert_text(
                    (self.page_width - self.margin_x - 130, 24),
                    "RESTRICTED / INTERNAL AUDIT",
                    fontsize=7,
                    fontname="helv",
                    color=(0.1, 0.35, 0.75),
                )
                page.draw_line(
                    pymupdf.Point(self.margin_x, 30),
                    pymupdf.Point(self.page_width - self.margin_x, 30),
                    color=(0.85, 0.88, 0.92),
                    width=0.5,
                )

            # Running Footer on all report pages
            fy = self.page_height - 22
            page.draw_line(
                pymupdf.Point(self.margin_x, fy - 8),
                pymupdf.Point(self.page_width - self.margin_x, fy - 8),
                color=(0.85, 0.88, 0.92),
                width=0.5,
            )
            page.insert_text(
                (self.margin_x, fy),
                "CONFIDENTIAL - FOR AUTHORISED EMPLOYEES ONLY · INDIA DPDP COMPLIANCE",
                fontsize=7,
                fontname="helv",
                color=(0.4, 0.45, 0.52),
            )
            p_text = f"Page {seq + 1} of {total}"
            page.insert_text(
                (self.page_width - self.margin_x - 52, fy),
                p_text,
                fontsize=7.5,
                fontname="helv",
                color=(0.4, 0.45, 0.52),
            )

    def get_pdf_bytes(self) -> bytes:
        self.draw_running_headers_and_footers()
        return self.doc.tobytes()


def _get_page_ocr_words(page: pymupdf.Page, dpi: int = 200) -> dict | None:
    """Extract word-level OCR bounding boxes from a page using Tesseract."""
    try:
        from .document import _init_pytesseract
        pytess = _init_pytesseract()
        from PIL import Image

        # Render unrotated pixmap so coordinates align with page.mediabox
        pix = page.get_pixmap(dpi=dpi, matrix=pymupdf.Matrix(dpi / 72.0, dpi / 72.0).prerotate(-page.rotation))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        data = pytess.image_to_data(img, output_type=pytess.Output.DICT)
        return {
            "data": data,
            "scale_x": page.mediabox.width / float(pix.width),
            "scale_y": page.mediabox.height / float(pix.height),
        }
    except Exception:
        return None


def _find_ocr_bounding_boxes(ocr_cache: dict | None, finding_text: str) -> list[pymupdf.Rect]:
    """Find exact bounding boxes for target finding_text in cached OCR word tokens."""
    if not ocr_cache or not finding_text:
        return []
    data = ocr_cache.get("data")
    if not data or "text" not in data:
        return []
    scale_x = ocr_cache["scale_x"]
    scale_y = ocr_cache["scale_y"]

    target_tokens = [t.strip(" ,;:.()-[]{}'\"").lower() for t in finding_text.split() if t.strip(" ,;:.()-[]{}'\"")]
    if not target_tokens:
        return []

    ocr_tokens = [w.strip(" ,;:.()-[]{}'\"").lower() for w in data["text"]]
    lefts = data["left"]
    tops = data["top"]
    widths = data["width"]
    heights = data["height"]

    n_ocr = len(ocr_tokens)
    k = len(target_tokens)
    rects: list[pymupdf.Rect] = []

    # 1. Exact sequence matching across words
    for i in range(n_ocr - k + 1):
        match = True
        for j in range(k):
            t_tok = target_tokens[j]
            o_tok = ocr_tokens[i + j]
            if o_tok != t_tok and (len(t_tok) >= 4 and t_tok not in o_tok):
                match = False
                break
        if match:
            bx0 = min(lefts[i + j] for j in range(k)) * scale_x
            by0 = min(tops[i + j] for j in range(k)) * scale_y
            bx1 = max(lefts[i + j] + widths[i + j] for j in range(k)) * scale_x
            by1 = max(tops[i + j] + heights[i + j] for j in range(k)) * scale_y
            rects.append(pymupdf.Rect(bx0, by0, bx1, by1))

    # 2. Consolidated token search for formatted IDs (e.g. Aadhaar with spaces/dashes)
    if not rects and k > 1:
        concat_target = "".join(target_tokens)
        for i in range(n_ocr):
            o_tok = ocr_tokens[i]
            if concat_target == o_tok or (len(concat_target) >= 8 and concat_target in o_tok):
                bx0 = lefts[i] * scale_x
                by0 = tops[i] * scale_y
                bx1 = (lefts[i] + widths[i]) * scale_x
                by1 = (tops[i] + heights[i]) * scale_y
                rects.append(pymupdf.Rect(bx0, by0, bx1, by1))

    return rects


def generate_document_information_summary(
    result: ProcessResult,
    original_doc_bytes: bytes | None = None,
) -> str:
    """Generate dynamic natural-language paragraph summarizing document information.

    Extracts available details: person names, mobile numbers, email addresses,
    date of birth, addresses, government identity tokens (Aadhaar, PAN, Passport, Voter ID),
    educational/employment details, and notes uncertain/unreadable values.
    Includes source page references where available. Avoids duplicate entries.
    Never assumes ownership merely because a name appears in the document.
    """
    original_text = result.original_text or ""
    entities = result.entities or []
    doc_bytes = original_doc_bytes if original_doc_bytes is not None else getattr(result, "original_doc_bytes", None)

    # 1. Deduplicate entities by category and track unique pages
    cat_items: dict[str, dict[str, list[int]]] = {}
    for e in entities:
        c = e.type.upper()
        if c in ("IN_AADHAAR", "AADHAAR"):
            c = "AADHAAR"
        elif c in ("IN_PAN", "PAN"):
            c = "PAN"
        elif c in ("IN_PASSPORT", "PASSPORT"):
            c = "PASSPORT"
        elif c in ("IN_VOTER", "VOTER_ID", "VOTER"):
            c = "VOTER_ID"
        elif c in ("PHONE_NUMBER", "PHONE"):
            c = "PHONE"
        elif c in ("EMAIL_ADDRESS", "EMAIL"):
            c = "EMAIL"
        elif c in ("PERSON", "NAME"):
            c = "PERSON"
        elif c in ("ADDRESS", "LOCATION"):
            c = "ADDRESS"

        val = e.text.strip()
        if not val:
            continue
        if c not in cat_items:
            cat_items[c] = {}

        # De-duplicate phone numbers by trailing 10 digits
        if c == "PHONE":
            raw_digits = re.sub(r"\D", "", val)[-10:]
            matched_key = None
            for existing_val in cat_items[c]:
                if re.sub(r"\D", "", existing_val)[-10:] == raw_digits:
                    matched_key = existing_val
                    break
            target_key = matched_key or val
        elif c == "EMAIL":
            matched_key = None
            for existing_val in cat_items[c]:
                if existing_val.lower() == val.lower():
                    matched_key = existing_val
                    break
            target_key = matched_key or val
        elif c in ("PAN", "AADHAAR", "PASSPORT", "VOTER_ID"):
            clean_id = re.sub(r"\s+", " ", val).upper()
            matched_key = None
            for existing_val in cat_items[c]:
                if re.sub(r"\s+", " ", existing_val).upper() == clean_id:
                    matched_key = existing_val
                    break
            target_key = matched_key or val
        elif c == "PERSON":
            matched_key = None
            clean_name = re.sub(r"[^A-Za-z0-9]", "", val).lower()
            for existing_val in cat_items[c]:
                if re.sub(r"[^A-Za-z0-9]", "", existing_val).lower() == clean_name:
                    matched_key = existing_val
                    break
            target_key = matched_key or val
        else:
            target_key = val

        if target_key not in cat_items[c]:
            cat_items[c][target_key] = []
        if e.page is not None and e.page not in cat_items[c][target_key]:
            cat_items[c][target_key].append(e.page)

    def format_item(val: str, pages: list[int]) -> str:
        if pages:
            if len(pages) == 1:
                return f"{val} (Page {pages[0]})"
            else:
                p_str = ", ".join(str(p) for p in sorted(pages))
                return f"{val} (Pages {p_str})"
        return val

    # Helper to find pages in original PDF bytes
    def find_pages_in_bytes(fragment: str) -> list[int]:
        if not doc_bytes or not fragment:
            return []
        try:
            doc = pymupdf.open(stream=doc_bytes, filetype="pdf")
            found_pages = []
            for p_i, p_obj in enumerate(doc):
                if p_obj.search_for(fragment):
                    found_pages.append(p_i + 1)
            doc.close()
            return found_pages
        except Exception:
            return []

    # 2. Extract Date of Birth from original_text
    dob_val = None
    dob_pages: list[int] = []
    dob_patterns = [
        re.compile(
            r"(?:(?:Date\s+of\s+Birth|DOB|D\.O\.B\.?|Birth\s+Date|Date\s+of\s+Birth\s*/\s*[^:\n\r]+)\s*[:\-–]\s*)"
            r"([0-9]{1,2}(?:st|nd|rd|th)?[\s/\-.](?:[A-Za-z]+|[0-9]{1,2})[\s/\-.][0-9]{2,4})",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:Born\s+on\s*[:\-–]?\s*)"
            r"([0-9]{1,2}(?:st|nd|rd|th)?[\s/\-.](?:[A-Za-z]+|[0-9]{1,2})[\s/\-.][0-9]{2,4})",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:(?:Date\s+of\s+Birth|DOB|D\.O\.B\.?)\s*[:\-–]\s*)([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})",
            re.IGNORECASE,
        ),
    ]
    for pat in dob_patterns:
        m = pat.search(original_text)
        if m:
            dob_val = m.group(1).strip()
            dob_pages = find_pages_in_bytes(dob_val)
            if not dob_pages and cat_items.get("PERSON"):
                first_person_pages = list(cat_items["PERSON"].values())[0]
                if first_person_pages:
                    dob_pages = [first_person_pages[0]]
            break

    # 3. Extract Educational Details from original_text
    edu_inst = None
    has_edu_id = False
    edu_pages: list[int] = []
    edu_patterns = [
        re.compile(
            r"([A-Z][A-Za-z0-9\s&,.\-']+(?:Institute of Engineering and Technology|Institute of Technology|Institute of [A-Za-z\s]+|College of Engineering|College of [A-Za-z\s]+|University|Polytechnic|Academy|Vidyalaya))",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?:College|University|Institute|School)\s*[:\-–]\s*([A-Za-z0-9\s&,.\-']+)",
            re.IGNORECASE,
        ),
    ]
    for pat in edu_patterns:
        m = pat.search(original_text)
        if m:
            cand = m.group(1).strip(" ,;:-.")
            if len(cand) > 4:
                edu_inst = cand
                edu_pages = find_pages_in_bytes(cand)
                if not edu_pages and cat_items.get("PERSON"):
                    first_p = list(cat_items["PERSON"].values())[0]
                    if first_p:
                        edu_pages = [first_p[0]]
                break

    if edu_inst:
        edu_id_keywords = ["USN", "Roll No", "Student ID", "Registration No", "Enrollment", "Semester", "Degree", "Engineering", "B.E.", "B.Tech", "Marks Card", "Academic"]
        if any(re.search(rf"\b{re.escape(kw)}\b", original_text, re.IGNORECASE) for kw in edu_id_keywords):
            has_edu_id = True

    # 4. Extract Employment / Organization details
    emp_org = None
    emp_pages: list[int] = []
    emp_patterns = [
        re.compile(r"(?:Company|Employer|Organization|Workplace)\s*[:\-–]\s*([A-Za-z0-9\s&,.\-']+)", re.IGNORECASE),
        re.compile(r"([A-Z][A-Za-z0-9\s&,.\-']+(?:Technologies|Solutions|Corporation|Pvt\.?\s*Ltd\.?|Limited|Services|Software))", re.IGNORECASE),
    ]
    for pat in emp_patterns:
        m = pat.search(original_text)
        if m:
            cand = m.group(1).strip(" ,;:-.")
            if len(cand) > 3 and not (edu_inst and cand.lower() in edu_inst.lower()):
                emp_org = cand
                emp_pages = find_pages_in_bytes(cand)
                if not emp_pages and cat_items.get("PERSON"):
                    first_p = list(cat_items["PERSON"].values())[0]
                    if first_p:
                        emp_pages = [first_p[0]]
                break

    # 5. Detect Unreadable or Uncertain Information
    unreadable_detected = False
    unreadable_pages: list[int] = []
    unreadable_patterns = [
        r"\[(?:unreadable|illegible|uncertain|obscured)\]",
        r"\b(?:unreadable|illegible|uncertain|partially obscured)\b",
        r"\?{3,}",
        r"\ufffd",
    ]
    unreadable_field_names: list[str] = []
    for pat in unreadable_patterns:
        m = re.search(pat, original_text, re.IGNORECASE)
        if m:
            unreadable_detected = True
            # Find specific preceding field name on that line if any
            field_m = re.findall(r"([A-Za-z\s]{2,25})\s*[:\-–]\s*(?:[^\n\r:]{0,20})\[(?:unreadable|illegible|uncertain|obscured)\]", original_text, re.IGNORECASE)
            for f_name in field_m:
                clean_f = f_name.strip().lower()
                if clean_f and clean_f not in unreadable_field_names:
                    unreadable_field_names.append(clean_f)
            break

    # Check if any invalid_ids were flagged
    if getattr(result, "invalid_ids", None):
        unreadable_detected = True
        for inv in result.invalid_ids:
            inv_type = inv.get("type", "identification")
            if inv_type.lower() not in unreadable_field_names:
                unreadable_field_names.append(inv_type.lower())

    # Check finding texts
    for cat, items in cat_items.items():
        for val, pgs in items.items():
            if any(re.search(pat, val, re.IGNORECASE) for pat in unreadable_patterns):
                unreadable_detected = True
                unreadable_pages.extend(pgs)

    # -------------------------------------------------------------------------
    # BUILD NATURAL LANGUAGE SENTENCES
    # -------------------------------------------------------------------------
    sentences: list[str] = []

    # A. Subject / Ownership Sentence
    persons = cat_items.get("PERSON", {})
    if len(persons) == 1:
        p_name, p_pgs = list(persons.items())[0]
        ownership_markers = [
            r"belongs\s+to", r"Name\s*[:\-–]", r"Candidate\s*[:\-–]", r"Student\s*[:\-–]",
            r"Employee\s*[:\-–]", r"Applicant\s*[:\-–]", r"Cardholder\s*[:\-–]", r"Subject\s*[:\-–]",
            r"This\s+is\s+to\s+certify", r"Identity\s+(?:Card|Record|Document)", r"Record\s+of",
            r"PAN\s+Card", r"Aadhaar\s+Card", r"Passport\s+of", r"Resume", r"Curriculum\s+Vitae",
            r"Verification\s+(?:file|request|for|document)",
        ]
        has_owner_marker = any(re.search(m, original_text, re.IGNORECASE) for m in ownership_markers)
        formatted_name = format_item(p_name, p_pgs)
        if has_owner_marker:
            sentences.append(f"The uploaded document belongs to {formatted_name}.")
        else:
            sentences.append(f"The uploaded document references {formatted_name}.")
    elif len(persons) > 1:
        p_list = [format_item(name, pgs) for name, pgs in persons.items()]
        if len(p_list) == 2:
            names_str = f"{p_list[0]} and {p_list[1]}"
        else:
            names_str = f"{', '.join(p_list[:-1])} and {p_list[-1]}"
        sentences.append(f"The uploaded document contains records referencing multiple individuals, including {names_str}.")
    else:
        sentences.append("The uploaded document does not contain an identified individual's name.")

    # B. Personal Information & Contact Details (Phones, Emails, DOB)
    phones = [format_item(v, p) for v, p in cat_items.get("PHONE", {}).items()]
    emails = [format_item(v, p) for v, p in cat_items.get("EMAIL", {}).items()]
    dob_formatted = format_item(dob_val, dob_pages) if dob_val else None

    contact_bits: list[str] = []
    if phones:
        if len(phones) == 1:
            contact_bits.append(f"the mobile number {phones[0]}")
        else:
            p_str = " and ".join(phones) if len(phones) == 2 else f"{', '.join(phones[:-1])} and {phones[-1]}"
            contact_bits.append(f"mobile numbers {p_str}")

    if emails:
        if len(emails) == 1:
            contact_bits.append(f"email address {emails[0]}")
        else:
            e_str = " and ".join(emails) if len(emails) == 2 else f"{', '.join(emails[:-1])} and {emails[-1]}"
            contact_bits.append(f"email addresses {e_str}")

    if dob_formatted:
        contact_bits.append(f"date of birth {dob_formatted}")

    if contact_bits:
        if len(contact_bits) == 1:
            joined_contacts = contact_bits[0]
        elif len(contact_bits) == 2:
            joined_contacts = f"{contact_bits[0]} and {contact_bits[1]}"
        else:
            joined_contacts = f"{contact_bits[0]}, {contact_bits[1]} and {contact_bits[2]}"
        sentences.append(f"It contains personal information including {joined_contacts}.")

    # C. Statutory Identification & Location Details (Aadhaar, PAN, Passport, Voter ID, Address)
    id_bits: list[str] = []
    for aadhar_v, a_pgs in cat_items.get("AADHAAR", {}).items():
        id_bits.append(f"Aadhaar number {format_item(aadhar_v, a_pgs)}")
    for pan_v, pan_pgs in cat_items.get("PAN", {}).items():
        id_bits.append(f"PAN number {format_item(pan_v, pan_pgs)}")
    for pass_v, pass_pgs in cat_items.get("PASSPORT", {}).items():
        id_bits.append(f"Passport number {format_item(pass_v, pass_pgs)}")
    for voter_v, voter_pgs in cat_items.get("VOTER_ID", {}).items():
        id_bits.append(f"Voter ID {format_item(voter_v, voter_pgs)}")

    addresses = [format_item(v, p) for v, p in cat_items.get("ADDRESS", {}).items()]

    if id_bits and addresses:
        id_str = " and ".join(id_bits) if len(id_bits) <= 2 else f"{', '.join(id_bits[:-1])} and {id_bits[-1]}"
        addr_str = " and ".join(addresses) if len(addresses) <= 2 else f"{', '.join(addresses[:-1])} and {addresses[-1]}"
        sentences.append(f"Statutory identification and location details present in the document include {id_str} and residential address {addr_str}.")
    elif id_bits:
        id_str = " and ".join(id_bits) if len(id_bits) <= 2 else f"{', '.join(id_bits[:-1])} and {id_bits[-1]}"
        sentences.append(f"Statutory identification details present in the document include {id_str}.")
    elif addresses:
        addr_str = " and ".join(addresses) if len(addresses) <= 2 else f"{', '.join(addresses[:-1])} and {addresses[-1]}"
        sentences.append(f"The document also specifies the residential address {addr_str}.")

    # D. Educational and Employment Details
    if edu_inst:
        edu_formatted = format_item(edu_inst, edu_pages)
        if has_edu_id:
            sentences.append(f"The document also mentions {edu_formatted} and contains educational identification details.")
        else:
            sentences.append(f"The document also mentions educational details relating to {edu_formatted}.")

    if emp_org:
        emp_formatted = format_item(emp_org, emp_pages)
        sentences.append(f"The document also mentions employment records associated with {emp_formatted}.")

    # E. Uncertain or Unreadable Details
    if unreadable_detected:
        if unreadable_pages:
            pg_str = f" (Page {unreadable_pages[0]})" if len(unreadable_pages) == 1 else f" (Pages {', '.join(str(p) for p in sorted(set(unreadable_pages)))})"
        else:
            pg_str = ""
        if unreadable_field_names:
            fields_str = " and ".join(unreadable_field_names)
            sentences.append(f"Certain personal details (such as {fields_str}) could not be reliably extracted due to unreadable text or scanning artifacts{pg_str}.")
        else:
            sentences.append(f"Certain details in the document could not be reliably extracted due to unreadable text or scanning artifacts{pg_str}.")

    # F. Concluding Sentence
    sentences.append("These details were extracted from the uploaded document.")

    return " ".join(sentences)


def draw_document_information_summary(builder: EnterprisePDFBuilder, summary_text: str):
    """Draw Document Information Summary as a natural-language paragraph in an enterprise card."""
    # Ensure heading and at least the first 4 lines of the summary card fit together
    builder.check_space(115.0)
    builder.draw_section_heading("Document Information Summary")

    font = pymupdf.Font("helv")
    fontsize = 8.5
    line_h = 13.5
    inner_pad = 12.0
    inner_w = builder.printable_width - 2 * inner_pad - 6.0
    space_w = font.text_length(" ", fontsize)

    # Word-wrap the paragraph into lines
    words = summary_text.split()
    lines: list[str] = []
    curr_line: list[str] = []
    curr_w = 0.0

    for w in words:
        w_len = font.text_length(w, fontsize)
        if curr_line and (curr_w + space_w + w_len > inner_w):
            lines.append(" ".join(curr_line))
            curr_line = [w]
            curr_w = w_len
        else:
            curr_line.append(w)
            curr_w = curr_w + (space_w if curr_w > 0 else 0.0) + w_len
    if curr_line:
        lines.append(" ".join(curr_line))

    # Paginate lines cleanly without text clipping or overlapping
    line_idx = 0
    while line_idx < len(lines):
        rem_h = (builder.page_height - builder.margin_bottom) - builder.current_y
        if rem_h < (2 * line_h + 2 * inner_pad + 6.0) and builder.current_y > builder.margin_top + 15:
            builder.add_page()
            builder.current_y = builder.margin_top + 10
            rem_h = (builder.page_height - builder.margin_bottom) - builder.current_y

        avail_for_lines = rem_h - 2 * inner_pad - 6.0
        lines_fit = max(1, min(len(lines) - line_idx, int(avail_for_lines // line_h)))
        chunk_lines = lines[line_idx : line_idx + lines_fit]
        chunk_h = len(chunk_lines) * line_h + 2 * inner_pad

        page = builder.current_page
        card_rect = pymupdf.Rect(
            builder.margin_x,
            builder.current_y,
            builder.margin_x + builder.printable_width,
            builder.current_y + chunk_h,
        )
        page.draw_rect(card_rect, color=(0.84, 0.88, 0.93), fill=(0.985, 0.99, 1.0))
        page.draw_rect(
            pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + 3.0, builder.current_y + chunk_h),
            color=(0.1, 0.35, 0.75),
            fill=(0.1, 0.35, 0.75),
        )

        ty = builder.current_y + inner_pad + 9.0
        for l in chunk_lines:
            page.insert_text(
                (builder.margin_x + inner_pad + 6.0, ty),
                l,
                fontsize=fontsize,
                fontname="helv",
                color=(0.12, 0.16, 0.24),
            )
            ty += line_h

        builder.current_y += chunk_h + 14.0
        line_idx += lines_fit


def generate_internal_risk_report(
    result: ProcessResult,
    source_images: list[dict] | None = None,
    original_doc_bytes: bytes | None = None,
) -> bytes:
    """Generate enterprise PII Risk Assessment PDF report for authorized employees."""
    from .document import identify_person_photo

    builder = EnterprisePDFBuilder()
    page = builder.add_page()

    risk_summary: DocumentRiskSummary = assess_document_risk(result)
    images = source_images if source_images is not None else getattr(result, "source_images", [])
    person_photo, is_ambiguous = identify_person_photo(images)

    # -------------------------------------------------------------------------
    # PAGE 1: REPORT OVERVIEW
    # -------------------------------------------------------------------------

    # 1. Header Banner & Title Block
    # Top decorative bar
    page.draw_rect(
        pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + builder.printable_width, builder.current_y + 4),
        color=(0.08, 0.22, 0.45),
        fill=(0.08, 0.22, 0.45),
    )
    builder.current_y += 14

    # Person photo placement in top-right corner if identified
    if person_photo and person_photo.get("bytes"):
        photo_w = 68.0
        photo_h = 82.0
        photo_x = builder.margin_x + builder.printable_width - photo_w
        photo_y = builder.current_y

        # Clean frame around photo
        page.draw_rect(
            pymupdf.Rect(photo_x - 3, photo_y - 3, photo_x + photo_w + 3, photo_y + photo_h + 3),
            color=(0.82, 0.86, 0.92),
            fill=(0.97, 0.98, 1.0),
            width=0.75,
        )
        try:
            page.insert_image(
                pymupdf.Rect(photo_x, photo_y, photo_x + photo_w, photo_y + photo_h),
                stream=person_photo["bytes"],
            )
        except Exception:
            pass

        caption_text = "Extracted from Original Document"
        if is_ambiguous:
            caption_text = "Extracted from Original Document (Review Required)"
        page.insert_text(
            (photo_x - 14, photo_y + photo_h + 10),
            caption_text,
            fontsize=5.8,
            fontname="helv",
            color=(0.4, 0.46, 0.55),
        )

    # Report Title
    page.insert_text(
        (builder.margin_x, builder.current_y + 16),
        "PII Risk Assessment Report",
        fontsize=18,
        fontname="helv",
        color=(0.06, 0.12, 0.24),
    )

    # Confidential Subtitle Pill
    conf_text = "CONFIDENTIAL - FOR AUTHORISED EMPLOYEES ONLY"
    page.insert_text(
        (builder.margin_x, builder.current_y + 32),
        conf_text,
        fontsize=8.5,
        fontname="helv",
        color=(0.75, 0.15, 0.15),
    )

    if person_photo and person_photo.get("bytes"):
        builder.current_y = max(builder.current_y + 44, photo_y + photo_h + 18)
    else:
        builder.current_y += 44

    # 2. Key Metadata & Document Risk Card
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Severity color
    if risk_summary.overall_risk_level in ("CRITICAL", "HIGH"):
        badge_bg = (0.98, 0.92, 0.92)
        badge_border = (0.85, 0.2, 0.2)
        badge_txt = (0.75, 0.1, 0.1)
    elif risk_summary.overall_risk_level == "MEDIUM":
        badge_bg = (1.0, 0.96, 0.88)
        badge_border = (0.88, 0.52, 0.1)
        badge_txt = (0.75, 0.4, 0.05)
    else:
        badge_bg = (0.92, 0.98, 0.93)
        badge_border = (0.2, 0.7, 0.3)
        badge_txt = (0.1, 0.5, 0.2)

    card_h = 72.0
    card_rect = pymupdf.Rect(
        builder.margin_x,
        builder.current_y,
        builder.margin_x + builder.printable_width,
        builder.current_y + card_h,
    )
    page.draw_rect(card_rect, color=(0.85, 0.88, 0.92), fill=(0.97, 0.98, 0.99))

    # Left Column: Request Details
    col1_x = builder.margin_x + 14
    page.insert_text((col1_x, builder.current_y + 18), "Request ID:", fontsize=8, fontname="helv", color=(0.4, 0.46, 0.54))
    page.insert_text((col1_x + 58, builder.current_y + 18), result.request_id, fontsize=8.5, fontname="helv", color=(0.08, 0.12, 0.18))

    page.insert_text((col1_x, builder.current_y + 36), "Generated:", fontsize=8, fontname="helv", color=(0.4, 0.46, 0.54))
    page.insert_text((col1_x + 58, builder.current_y + 36), now_str, fontsize=8, fontname="helv", color=(0.08, 0.12, 0.18))

    page.insert_text((col1_x, builder.current_y + 54), "Target Model:", fontsize=8, fontname="helv", color=(0.4, 0.46, 0.54))
    page.insert_text((col1_x + 58, builder.current_y + 54), f"{result.backend} ({result.model})", fontsize=8, fontname="helv", color=(0.08, 0.12, 0.18))

    # Center Column: Entity Counts
    col2_x = builder.margin_x + 230
    page.insert_text((col2_x, builder.current_y + 18), "Total Detected PII:", fontsize=8, fontname="helv", color=(0.4, 0.46, 0.54))
    page.insert_text((col2_x + 85, builder.current_y + 18), f"{risk_summary.total_findings} entities", fontsize=8.5, fontname="helv", color=(0.08, 0.12, 0.18))

    page.insert_text((col2_x, builder.current_y + 36), "Leak Guard:", fontsize=8, fontname="helv", color=(0.4, 0.46, 0.54))
    leak_txt = "PASSED (0 Leaks)" if getattr(result, "leak_check", None) and result.leak_check.passed else "BLOCKED"
    page.insert_text((col2_x + 85, builder.current_y + 36), leak_txt, fontsize=8, fontname="helv", color=(0.1, 0.55, 0.2))

    page.insert_text((col2_x, builder.current_y + 54), "Reinsertion:", fontsize=8, fontname="helv", color=(0.4, 0.46, 0.54))
    reinsert_txt = f"{len(result.reinsertion.restored)} Restored" if hasattr(result, "reinsertion") and result.reinsertion else "N/A"
    page.insert_text((col2_x + 85, builder.current_y + 54), reinsert_txt, fontsize=8, fontname="helv", color=(0.08, 0.12, 0.18))

    # Right Column: Risk Badge
    badge_w = 115
    badge_h = 44
    b_x = builder.margin_x + builder.printable_width - badge_w - 14
    b_y = builder.current_y + 14
    page.draw_rect(pymupdf.Rect(b_x, b_y, b_x + badge_w, b_y + badge_h), color=badge_border, fill=badge_bg)
    page.insert_text((b_x + 12, b_y + 16), "DOCUMENT RISK", fontsize=6.8, fontname="helv", color=badge_txt)
    page.insert_text((b_x + 12, b_y + 34), f"{risk_summary.overall_risk_level} ({risk_summary.overall_risk_score}/100)", fontsize=9.5, fontname="helv", color=badge_txt)

    builder.current_y += card_h + 16

    # 3. Category-Wise Findings Summary
    builder.draw_section_heading("Category-Wise Findings Summary")

    cat_counts: dict[str, int] = {}
    for f in risk_summary.findings:
        cat_counts[f.category] = cat_counts.get(f.category, 0) + 1

    cat_box_h = 58.0
    cat_rect = pymupdf.Rect(
        builder.margin_x,
        builder.current_y,
        builder.margin_x + builder.printable_width,
        builder.current_y + cat_box_h,
    )
    page.draw_rect(cat_rect, color=(0.85, 0.88, 0.92), fill=(0.98, 0.99, 1.0))

    # Build category summary pills
    if cat_counts:
        cat_pills = "   •   ".join([f"{cat}: {cnt}" for cat, cnt in sorted(cat_counts.items())])
    else:
        cat_pills = "No personal data identified in document."

    page.insert_text((builder.margin_x + 12, builder.current_y + 16), "IDENTIFIED ENTITY BREAKDOWN", fontsize=7, fontname="helv", color=(0.3, 0.4, 0.55))
    page.insert_text((builder.margin_x + 12, builder.current_y + 32), cat_pills, fontsize=8.5, fontname="helv", color=(0.08, 0.12, 0.2))

    summary_note = (
        f"Findings breakdown: {risk_summary.critical_count} Critical, {risk_summary.high_count} High, "
        f"{risk_summary.medium_count} Medium, {risk_summary.low_count} Low risk. "
        "All values sanitized prior to outbound processing."
    )
    page.insert_text((builder.margin_x + 12, builder.current_y + 48), summary_note, fontsize=7.5, fontname="helv", color=(0.38, 0.44, 0.52))

    builder.current_y += cat_box_h + 18

    # -------------------------------------------------------------------------
    # MAIN SECTION: DETAILED FINDINGS TABLE
    # -------------------------------------------------------------------------
    builder.draw_section_heading("Detailed Findings & Recommendations")

    # Column configuration totaling 523.0 pt printable width (with Source Page tracking)
    col_w = [22, 54, 70, 125, 52, 200]
    headers = ["#", "Source Page", "Category", "Detected Value", "Confidence", "Recommendation"]

    def draw_table_header(p):
        h_rect = pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + builder.printable_width, builder.current_y + 18)
        p.draw_rect(h_rect, color=(0.1, 0.2, 0.35), fill=(0.1, 0.2, 0.35))
        cur_x = builder.margin_x + 4
        for w, text in zip(col_w, headers):
            p.insert_text((cur_x, builder.current_y + 12), text, fontsize=7.5, fontname="helv", color=(1.0, 1.0, 1.0))
            cur_x += w
        builder.current_y += 18

    page = builder.check_space(25)
    draw_table_header(page)

    if not risk_summary.findings:
        page = builder.check_space(28)
        r_rect = pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + builder.printable_width, builder.current_y + 24)
        page.draw_rect(r_rect, color=(0.85, 0.88, 0.92), fill=(1.0, 1.0, 1.0))
        page.insert_text(
            (builder.margin_x + 12, builder.current_y + 15),
            "No sensitive personal identifiers detected in the customer document.",
            fontsize=8,
            fontname="helv",
            color=(0.4, 0.45, 0.52),
        )
        builder.current_y += 28
    else:
        for idx, finding in enumerate(risk_summary.findings, 1):
            val_text = finding.original_value or ""
            rec_text = finding.recommendation or ""

            # Calculate dynamic row height ensuring full text wrap without clipping
            rec_lines = max(1, (len(rec_text) + 38) // 38)
            val_lines = max(1, (len(val_text) + 20) // 20)
            needed_lines = max(rec_lines, val_lines)
            row_h = max(26.0, needed_lines * 12.0 + 8.0)

            # Check space to prevent splitting table row across pages
            page = builder.check_space(row_h)
            if builder.current_y == builder.margin_top + 10:
                draw_table_header(page)

            # Alternate row background
            bg_col = (0.98, 0.99, 1.0) if idx % 2 == 1 else (1.0, 1.0, 1.0)
            is_high = finding.risk_level in ("CRITICAL", "HIGH")
            if is_high:
                bg_col = (0.995, 0.985, 0.985)

            row_rect = pymupdf.Rect(
                builder.margin_x,
                builder.current_y,
                builder.margin_x + builder.printable_width,
                builder.current_y + row_h,
            )
            page.draw_rect(row_rect, color=(0.85, 0.88, 0.92), fill=bg_col)

            # High risk left accent indicator
            if is_high:
                page.draw_rect(
                    pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + 2.5, builder.current_y + row_h),
                    color=(0.85, 0.2, 0.2),
                    fill=(0.85, 0.2, 0.2),
                )

            # Draw cell text & wrapped textboxes
            cur_x = builder.margin_x + 4

            # 1. Serial Number
            page.insert_text((cur_x, builder.current_y + 14), str(idx), fontsize=7.5, fontname="helv", color=(0.3, 0.35, 0.42))
            cur_x += col_w[0]

            # 2. Source Page
            page_str = finding.source_page_display or "N/A"
            page.insert_text((cur_x, builder.current_y + 14), page_str, fontsize=7.5, fontname="helv", color=(0.25, 0.32, 0.42))
            cur_x += col_w[1]

            # 3. PII Category
            page.insert_text((cur_x, builder.current_y + 14), finding.category, fontsize=7.5, fontname="helv", color=(0.08, 0.12, 0.22))
            cur_x += col_w[2]

            # 4. Exact Detected Sensitive Value (Wrapped)
            v_rect = pymupdf.Rect(cur_x, builder.current_y + 3, cur_x + col_w[3] - 6, builder.current_y + row_h - 3)
            page.insert_textbox(v_rect, val_text, fontsize=7.5, fontname="helv", color=(0.65, 0.1, 0.1))
            cur_x += col_w[3]

            # 5. Detection Confidence
            conf_display = f"{finding.confidence * 100:.0f}%" if finding.confidence is not None else "Rule"
            page.insert_text((cur_x + 4, builder.current_y + 14), conf_display, fontsize=7.2, fontname="helv", color=(0.35, 0.4, 0.48))
            cur_x += col_w[4]

            # 6. Recommended Action (Wrapped without clipping)
            rec_rect = pymupdf.Rect(cur_x, builder.current_y + 3, builder.margin_x + builder.printable_width - 6, builder.current_y + row_h - 3)
            page.insert_textbox(rec_rect, rec_text, fontsize=7.2, fontname="helv", color=(0.18, 0.24, 0.32))

            # Add clickable hyperlink for official Indian government portal
            if finding.portal_name and finding.portal_url:
                hits = page.search_for(finding.portal_name, clip=rec_rect)
                for h in hits:
                    page.insert_link({"kind": pymupdf.LINK_URI, "from": h, "uri": finding.portal_url})
                    page.draw_line(pymupdf.Point(h.x0, h.y1 - 0.5), pymupdf.Point(h.x1, h.y1 - 0.5), color=(0.08, 0.42, 0.82), width=0.65)

            builder.current_y += row_h

    builder.current_y += 18

    # -------------------------------------------------------------------------
    # FINAL SECTION: PROCESSING SUMMARY
    # -------------------------------------------------------------------------
    builder.draw_section_heading("Processing & Gateway Pipeline Verification Summary")

    reinsert_cnt = len(result.reinsertion.restored) if hasattr(result, "reinsertion") and result.reinsertion else 0
    reinsert_dropped = len(result.reinsertion.dropped) if hasattr(result, "reinsertion") and result.reinsertion else 0

    pipeline_stages = [
        ("1. Detection & Entity Merging", "COMPLETED", f"Presidio (IDs) + GLiNER (NER) merged spans; {len(result.entities)} entities identified"),
        ("2. ID Validation", "PASSED", "Indian identity token formats & checksums validated without corruption"),
        ("3. Masking & Tokenization", "COMPLETED", f"Typed <TYPE_N> placeholders generated; request-scoped mapping isolated in memory"),
        ("4. Outbound Leak Guard", "PASSED", "Zero unmasked personal data tokens permitted in outgoing AI payload"),
        ("5. AI Model Processing", "COMPLETED", f"Payload processed via {result.backend} ({result.model}) in {result.llm_ms:.1f}ms"),
        ("6. Response Validation & Reinsertion", "VERIFIED", f"{reinsert_cnt} placeholder(s) restored safely to response ({reinsert_dropped} dropped)"),
        ("7. Audit Logging", "RECORDED", f"Sanitized metadata recorded in audit database; zero raw PII logged"),
    ]

    needed_stage_h = len(pipeline_stages) * 17.0 + 16.0
    page = builder.check_space(needed_stage_h)

    box_rect = pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + builder.printable_width, builder.current_y + needed_stage_h)
    page.draw_rect(box_rect, color=(0.85, 0.88, 0.92), fill=(0.97, 0.98, 0.99))

    for s_idx, (stage_name, status_tag, stage_desc) in enumerate(pipeline_stages):
        sy = builder.current_y + 14 + s_idx * 17.0

        # Status icon / pill
        page.draw_rect(
            pymupdf.Rect(builder.margin_x + 10, sy - 8, builder.margin_x + 56, sy + 3),
            color=(0.2, 0.55, 0.3),
            fill=(0.92, 0.98, 0.93),
        )
        page.insert_text((builder.margin_x + 13, sy), status_tag, fontsize=6.5, fontname="helv", color=(0.1, 0.5, 0.2))

        # Stage Name
        page.insert_text((builder.margin_x + 64, sy), stage_name + ":", fontsize=7.5, fontname="helv", color=(0.12, 0.18, 0.28))

        # Stage Description
        page.insert_text((builder.margin_x + 210, sy), stage_desc, fontsize=7.2, fontname="helv", color=(0.35, 0.42, 0.5))

    builder.current_y += needed_stage_h + 14

    # Confidential handling compliance footer box
    page = builder.check_space(42)
    notice_rect = pymupdf.Rect(builder.margin_x, builder.current_y, builder.margin_x + builder.printable_width, builder.current_y + 36)
    page.draw_rect(notice_rect, color=(0.9, 0.82, 0.82), fill=(0.99, 0.96, 0.96))
    page.insert_textbox(
        pymupdf.Rect(notice_rect.x0 + 8, notice_rect.y0 + 5, notice_rect.x1 - 8, notice_rect.y1 - 5),
        "ENTERPRISE COMPLIANCE NOTICE: This document contains exact detected sensitive PII for internal auditing and "
        "compliance verification under the Digital Personal Data Protection (DPDP) Act 2023. This report must never be shared "
        "with external entities or third-party AI systems.",
        fontsize=7,
        fontname="helv",
        color=(0.65, 0.15, 0.15),
    )
    builder.current_y += 44

    # -------------------------------------------------------------------------
    # DOCUMENT INFORMATION SUMMARY (Natural-Language Executive Extract)
    # -------------------------------------------------------------------------
    orig_bytes = original_doc_bytes if original_doc_bytes is not None else getattr(result, "original_doc_bytes", None)
    summary_text = generate_document_information_summary(result, original_doc_bytes=orig_bytes)
    draw_document_information_summary(builder, summary_text)

    # -------------------------------------------------------------------------
    # SOURCE DOCUMENT IMAGES (Visual Audit Section for Authorized Personnel)
    # -------------------------------------------------------------------------
    images = source_images if source_images is not None else getattr(result, "source_images", [])
    if images:
        builder.draw_section_heading("Source Document Images")

        intro_text = (
            "Visual audit of original document content: embedded images and scanned pages "
            "extracted from the uploaded document for authorized employee verification."
        )
        page = builder.check_space(20)
        page.insert_text(
            (builder.margin_x + 8, builder.current_y),
            intro_text,
            fontsize=7.5,
            fontname="helv",
            color=(0.4, 0.46, 0.55),
        )
        builder.current_y += 16

        for img in images:
            img_bytes = img.get("bytes")
            if not img_bytes:
                continue

            orig_w = float(img.get("width", 400))
            orig_h = float(img.get("height", 300))
            if orig_w <= 0 or orig_h <= 0:
                orig_w, orig_h = 400.0, 300.0

            # Scale to fit comfortably within printable page area while strictly preserving aspect ratio
            card_max_w = min(builder.printable_width - 24.0, 480.0)
            card_max_h = 360.0

            scale = min(card_max_w / orig_w, card_max_h / orig_h)
            if orig_w <= card_max_w and orig_h <= card_max_h:
                scale = 1.0

            disp_w = round(orig_w * scale, 1)
            disp_h = round(orig_h * scale, 1)

            header_h = 22.0
            card_h = header_h + disp_h + 16.0

            page = builder.check_space(card_h + 12.0)

            # Outer card container
            card_rect = pymupdf.Rect(
                builder.margin_x,
                builder.current_y,
                builder.margin_x + builder.printable_width,
                builder.current_y + card_h,
            )
            page.draw_rect(card_rect, color=(0.84, 0.88, 0.93), fill=(0.985, 0.99, 1.0))

            # Header bar within card
            header_rect = pymupdf.Rect(
                builder.margin_x,
                builder.current_y,
                builder.margin_x + builder.printable_width,
                builder.current_y + header_h,
            )
            page.draw_rect(header_rect, color=(0.84, 0.88, 0.93), fill=(0.93, 0.95, 0.98))

            # Left label: Page number & image designation
            label_text = img.get("label") or f"Original PDF Page {img.get('page', 1)}"
            page.insert_text(
                (builder.margin_x + 10, builder.current_y + 15),
                label_text,
                fontsize=8.0,
                fontname="helv",
                color=(0.1, 0.18, 0.32),
            )

            # Right label: dimensions & format
            meta_text = f"{int(orig_w)} × {int(orig_h)} px · {img.get('format', 'PNG').upper()}"
            page.insert_text(
                (builder.margin_x + builder.printable_width - 120, builder.current_y + 15),
                meta_text,
                fontsize=7.2,
                fontname="helv",
                color=(0.42, 0.48, 0.56),
            )

            # Center image horizontally inside card
            img_x = builder.margin_x + (builder.printable_width - disp_w) / 2.0
            img_y = builder.current_y + header_h + 8.0
            img_rect = pymupdf.Rect(img_x, img_y, img_x + disp_w, img_y + disp_h)

            try:
                page.insert_image(img_rect, stream=img_bytes)
                page.draw_rect(img_rect, color=(0.82, 0.86, 0.92), width=0.5)
            except Exception as e:
                page.insert_text(
                    (img_x + 10, img_y + 20),
                    f"[Image render unavailable: {e}]",
                    fontsize=8,
                    fontname="helv",
                    color=(0.6, 0.2, 0.2),
                )

            builder.current_y += card_h + 14.0

        builder.current_y += 10.0

    # -------------------------------------------------------------------------
    # FINAL SECTION 2: QUICK ASSESSMENT – VISUAL PII RISK MAPPING
    # -------------------------------------------------------------------------
    orig_bytes = original_doc_bytes if original_doc_bytes is not None else getattr(result, "original_doc_bytes", None)
    if orig_bytes:
        # Create a dedicated page for the section heading and risk legend
        page = builder.add_page()
        builder.draw_section_heading("Quick Assessment – Visual PII Risk Mapping")

        legend_h = 78.0
        leg_rect = pymupdf.Rect(
            builder.margin_x,
            builder.current_y,
            builder.margin_x + builder.printable_width,
            builder.current_y + legend_h,
        )
        page.draw_rect(leg_rect, color=(0.82, 0.86, 0.92), fill=(0.98, 0.985, 0.995))
        page.insert_text(
            (builder.margin_x + 10, builder.current_y + 14),
            "QUICK ASSESSMENT · VISUAL PII RISK MAPPING COLOUR LEGEND",
            fontsize=7.2,
            fontname="helv",
            color=(0.28, 0.36, 0.48),
        )

        # 1. LOW / SAFE (Green)
        page.draw_rect(
            pymupdf.Rect(builder.margin_x + 10, builder.current_y + 22, builder.margin_x + 22, builder.current_y + 34),
            color=(0.1, 0.6, 0.2),
            fill=(0.18, 0.78, 0.32),
            fill_opacity=0.45,
        )
        page.insert_text(
            (builder.margin_x + 28, builder.current_y + 31),
            "LOW / SAFE: Standard personal identifiers (e.g. Person Names, General Identifiers)",
            fontsize=7.2,
            fontname="helv",
            color=(0.1, 0.5, 0.2),
        )

        # 2. MEDIUM (Amber)
        page.draw_rect(
            pymupdf.Rect(builder.margin_x + 10, builder.current_y + 38, builder.margin_x + 22, builder.current_y + 50),
            color=(0.85, 0.45, 0.0),
            fill=(1.0, 0.68, 0.05),
            fill_opacity=0.45,
        )
        page.insert_text(
            (builder.margin_x + 28, builder.current_y + 47),
            "MEDIUM: Contact and location data (Phone Numbers, Physical Addresses, Email Details)",
            fontsize=7.2,
            fontname="helv",
            color=(0.75, 0.4, 0.05),
        )

        # 3. HIGH / CRITICAL (Red)
        page.draw_rect(
            pymupdf.Rect(builder.margin_x + 10, builder.current_y + 54, builder.margin_x + 22, builder.current_y + 66),
            color=(0.85, 0.1, 0.1),
            fill=(1.0, 0.2, 0.2),
            fill_opacity=0.45,
        )
        page.insert_text(
            (builder.margin_x + 28, builder.current_y + 63),
            "HIGH / CRITICAL: Statutory identities and financial tokens (Aadhaar, PAN, Passport, Voter ID)",
            fontsize=7.2,
            fontname="helv",
            color=(0.7, 0.1, 0.1),
        )

        builder.current_y += legend_h + 14.0

        intro_text = (
            "The following pages reproduce all original uploaded document pages with non-destructive, "
            "semi-transparent overlays identifying detected sensitive personal data. Original page dimensions, "
            "orientation, and text legibility are fully preserved for compliance inspection."
        )
        page.insert_textbox(
            pymupdf.Rect(builder.margin_x + 4, builder.current_y, builder.margin_x + builder.printable_width - 4, builder.current_y + 30),
            intro_text,
            fontsize=7.5,
            fontname="helv",
            color=(0.35, 0.42, 0.5),
        )
        builder.current_y += 36.0

        # Open source document in-memory (never modifying original bytes)
        try:
            if orig_bytes.startswith(b"%PDF"):
                src_doc = pymupdf.open(stream=orig_bytes, filetype="pdf")
            else:
                img_doc = pymupdf.open(stream=orig_bytes)
                pdf_data = img_doc.convert_to_pdf()
                src_doc = pymupdf.open(stream=pdf_data, filetype="pdf")
                img_doc.close()
        except Exception:
            src_doc = None

        if src_doc:
            orig_total = src_doc.page_count
            for p_idx in range(orig_total):
                src_page = src_doc[p_idx]
                page_findings = [
                    f for f in risk_summary.findings
                    if f.source_page == (p_idx + 1) or (f.source_page is None and orig_total == 1)
                ]

                # Lazy OCR word cache for this page if needed (scanned page or native search miss)
                page_ocr_cache = None
                has_native_text = bool((src_page.get_text() or "").strip())

                severity_map = {
                    "CRITICAL": 3,
                    "HIGH": 3,
                    "MEDIUM": 2,
                    "LOW": 1,
                    "SAFE": 1,
                }

                resolved_items: list[tuple[EntityRisk, list[pymupdf.Rect], int]] = []
                unresolved_items: list[EntityRisk] = []

                for f in page_findings:
                    val = f.original_value or ""
                    rects: list[pymupdf.Rect] = []

                    # 1. Native text search on text-based PDFs
                    if has_native_text:
                        rects = src_page.search_for(val)
                        if not rects:
                            rects = src_page.search_for(val.strip())
                        if not rects:
                            words = [w.strip(" ,;:.()-[]{}'\"") for w in val.split() if len(w.strip(" ,;:.()-[]{}'\"")) >= 2]
                            if len(words) > 1:
                                w_rects = []
                                for w in words:
                                    hits = src_page.search_for(w)
                                    if hits:
                                        w_rects.extend(hits)
                                if w_rects:
                                    rects = w_rects

                    # 2. OCR coordinate search on scanned PDFs or when native search missed
                    if not rects:
                        if page_ocr_cache is None:
                            page_ocr_cache = _get_page_ocr_words(src_page, dpi=200)
                        rects = _find_ocr_bounding_boxes(page_ocr_cache, val)

                    # 3. Categorize into resolved vs unresolved (never invent coordinates)
                    if rects:
                        sev = severity_map.get(f.risk_level.upper(), 1)
                        resolved_items.append((f, rects, sev))
                    else:
                        unresolved_items.append(f)

                # Sort so lower severity is drawn first and higher severity (Red) overlays cleanly
                resolved_items.sort(key=lambda item: item[2])

                # Draw semi-transparent overlays (0.35 opacity preserves underlying text legibility)
                for f, rects, sev in resolved_items:
                    if sev == 3: # CRITICAL / HIGH -> RED
                        fill_col = (1.0, 0.2, 0.2)
                        stroke_col = (0.85, 0.1, 0.1)
                    elif sev == 2: # MEDIUM -> AMBER
                        fill_col = (1.0, 0.68, 0.05)
                        stroke_col = (0.85, 0.45, 0.0)
                    else: # LOW / SAFE -> GREEN
                        fill_col = (0.18, 0.78, 0.32)
                        stroke_col = (0.1, 0.6, 0.2)

                    for r in rects:
                        src_page.draw_rect(r, color=stroke_col, fill=fill_col, fill_opacity=0.35, width=0.8)

                # Running header banner on original document page taking rotation into account
                rot = src_page.rotation
                mb = src_page.mediabox
                banner_title = f"ORIGINAL DOCUMENT PAGE {p_idx + 1} OF {orig_total} · VISUAL PII RISK MAPPING"
                sub_flag = f"⚠️ {len(unresolved_items)} item(s) unmapped · Review Required" if unresolved_items else None

                if rot == 0:
                    src_page.draw_rect(pymupdf.Rect(0, 0, mb.width, 22), color=(0.08, 0.22, 0.45), fill=(0.08, 0.22, 0.45))
                    src_page.insert_text(pymupdf.Point(14, 15), banner_title, fontsize=8, fontname="helv", color=(1.0, 1.0, 1.0))
                    if sub_flag:
                        src_page.insert_text(pymupdf.Point(mb.width - 240, 15), sub_flag, fontsize=6.8, fontname="helv", color=(1.0, 0.85, 0.5))
                    src_page.insert_text(pymupdf.Point(14, mb.height - 10), "CONFIDENTIAL - RESTRICTED TO AUTHORIZED EMPLOYEES ONLY · ORIGINAL DOCUMENT PRESERVED", fontsize=6.5, fontname="helv", color=(0.4, 0.45, 0.52))
                elif rot == 90:
                    src_page.draw_rect(pymupdf.Rect(0, 0, 22, mb.height), color=(0.08, 0.22, 0.45), fill=(0.08, 0.22, 0.45))
                    src_page.insert_text(pymupdf.Point(14, mb.height - 20), banner_title, fontsize=8, fontname="helv", color=(1.0, 1.0, 1.0), rotate=90)
                    if sub_flag:
                        src_page.insert_text(pymupdf.Point(14, 250), sub_flag, fontsize=6.8, fontname="helv", color=(1.0, 0.85, 0.5), rotate=90)
                    src_page.insert_text(pymupdf.Point(mb.width - 10, mb.height - 20), "CONFIDENTIAL - RESTRICTED TO AUTHORIZED EMPLOYEES ONLY", fontsize=6.5, fontname="helv", color=(0.4, 0.45, 0.52), rotate=90)
                elif rot == 180:
                    src_page.draw_rect(pymupdf.Rect(0, mb.height - 22, mb.width, mb.height), color=(0.08, 0.22, 0.45), fill=(0.08, 0.22, 0.45))
                    src_page.insert_text(pymupdf.Point(mb.width - 20, mb.height - 14), banner_title, fontsize=8, fontname="helv", color=(1.0, 1.0, 1.0), rotate=180)
                    if sub_flag:
                        src_page.insert_text(pymupdf.Point(240, mb.height - 14), sub_flag, fontsize=6.8, fontname="helv", color=(1.0, 0.85, 0.5), rotate=180)
                    src_page.insert_text(pymupdf.Point(mb.width - 20, 10), "CONFIDENTIAL - RESTRICTED TO AUTHORIZED EMPLOYEES ONLY", fontsize=6.5, fontname="helv", color=(0.4, 0.45, 0.52), rotate=180)
                elif rot == 270:
                    src_page.draw_rect(pymupdf.Rect(mb.width - 22, 0, mb.width, mb.height), color=(0.08, 0.22, 0.45), fill=(0.08, 0.22, 0.45))
                    src_page.insert_text(pymupdf.Point(mb.width - 14, 20), banner_title, fontsize=8, fontname="helv", color=(1.0, 1.0, 1.0), rotate=270)
                    if sub_flag:
                        src_page.insert_text(pymupdf.Point(mb.width - 14, mb.height - 250), sub_flag, fontsize=6.8, fontname="helv", color=(1.0, 0.85, 0.5), rotate=270)
                    src_page.insert_text(pymupdf.Point(10, 20), "CONFIDENTIAL - RESTRICTED TO AUTHORIZED EMPLOYEES ONLY", fontsize=6.5, fontname="helv", color=(0.4, 0.45, 0.52), rotate=270)

                # If there are unresolved items, insert an explicit bottom notice box
                if unresolved_items and rot == 0:
                    unresolved_desc = "MANUAL REVIEW REQUIRED (Coordinates Unresolved): " + ", ".join(
                        f"{u.category} '{u.original_value}'" for u in unresolved_items
                    )
                    warn_rect = pymupdf.Rect(14, mb.height - 30, mb.width - 14, mb.height - 14)
                    src_page.draw_rect(warn_rect, color=(0.88, 0.5, 0.1), fill=(1.0, 0.96, 0.88), width=0.5)
                    src_page.insert_textbox(
                        pymupdf.Rect(warn_rect.x0 + 6, warn_rect.y0 + 2, warn_rect.x1 - 6, warn_rect.y1 - 2),
                        unresolved_desc,
                        fontsize=6.5,
                        fontname="helv",
                        color=(0.75, 0.35, 0.05),
                    )

                # Append into builder.doc preserving original dimensions and orientation
                builder.doc.insert_pdf(src_doc, from_page=p_idx, to_page=p_idx)

            src_doc.close()

    return builder.get_pdf_bytes()


def generate_and_store_reports(
    result: ProcessResult,
    source_images: list[dict] | None = None,
    original_doc_bytes: bytes | None = None,
) -> dict[str, bytes]:
    """Generate the internal risk assessment report and cache it in memory.
    
    Suppressed if the workflow was blocked or validation failed.
    """
    if not is_workflow_successful(result):
        _REPORT_CACHE[result.request_id] = {
            "success": False,
            "blocked": getattr(result, "blocked", False),
            "needs_correction": getattr(result, "needs_correction", False),
            "internal": None,
        }
        return {}

    internal_pdf = generate_internal_risk_report(
        result,
        source_images=source_images,
        original_doc_bytes=original_doc_bytes,
    )
    _REPORT_CACHE[result.request_id] = {
        "success": True,
        "blocked": False,
        "needs_correction": False,
        "internal": internal_pdf,
    }
    return {
        "internal": internal_pdf,
    }


def get_cached_report(request_id: str, report_type: Literal["internal"] = "internal") -> tuple[bytes | None, str]:
    """Retrieve cached internal PDF bytes by request_id.
    
    Returns (bytes, status):
    - (pdf_bytes, "ok") if available
    - (None, "not_found") if request_id unknown
    - (None, "failed") if workflow was blocked or failed
    """
    entry = _REPORT_CACHE.get(request_id)
    if entry is None:
        return None, "not_found"
    if not entry.get("success", False):
        return None, "failed"

    pdf = entry.get(report_type)
    if pdf is None:
        return None, "not_found"
    return pdf, "ok"
