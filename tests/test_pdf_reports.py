"""Tests for Final PDF Report Generation (Internal Risk Assessment Report).

Verifies:
1. Internal report layout contains:
   - Page 1 Overview: Report title ("PII Risk Assessment Report"),
     "Confidential – For Authorised Employees Only", Request ID, timestamp,
     overall document risk score & severity, total detected entities,
     category-wise findings summary.
   - Main Section: Clean findings table with serial number, PII category,
     exact detected sensitive value, individual risk score, severity,
     confidence, and recommended action.
   - Final Section: 7-stage processing summary (detect, validate, mask,
     leak guard, AI call, reinsert, audit).
2. Report generation is strictly the final step and suppressed for failed/blocked requests.
3. Access restrictions: internal report requires authorized employee role (403 for unauthorized).
4. Multi-page formatting, clean table layout, and "Page X of Y" page numbering.
5. Frontend UI has only one button: Download Internal Risk Assessment (PDF), with
   no external PDF button or risk badge pill.
"""
from __future__ import annotations

import io
import os
import pytest
import pymupdf

from gateway.backends import MockBackend
from gateway.contracts import Entity, ProcessResult, ReinsertResult, LeakCheck
from gateway.pipeline import process
from gateway.reports import (
    generate_internal_risk_report,
    generate_and_store_reports,
    get_cached_report,
    is_workflow_successful,
)
from gateway.risk import assess_document_risk, assess_entity_risk


@pytest.fixture
def sample_result() -> ProcessResult:
    """A realistic completed ProcessResult with multiple PII entities."""
    text = "Mera naam Rahul Sharma hai. PAN BNZPM2501F, Aadhaar 4991 1866 5246. Mobile 9876543210."
    return process(text, backend=MockBackend("echo"), audit=False)


def test_risk_assessment_engine(sample_result):
    """Verify deterministic risk scoring and compliance recommendations."""
    doc_risk = assess_document_risk(sample_result)
    assert doc_risk.total_findings >= 3
    assert doc_risk.overall_risk_score >= 80  # Aadhaar + PAN are critical/high
    assert doc_risk.overall_risk_level in ("CRITICAL", "HIGH")

    # Check entity risks
    categories = {f.category for f in doc_risk.findings}
    assert "PAN" in categories
    assert "AADHAAR" in categories

    for f in doc_risk.findings:
        assert f.risk_score > 0
        assert f.risk_level in ("CRITICAL", "HIGH", "MEDIUM", "LOW")
        assert len(f.recommendation) > 10
        assert f.source_location.startswith("Offset")


def test_internal_risk_report_content_and_sections(sample_result):
    """Verify enterprise internal risk assessment PDF contains all required sections."""
    pdf_bytes = generate_internal_risk_report(sample_result)
    assert len(pdf_bytes) > 1000

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count >= 1

    extracted_text = ""
    for page in doc:
        extracted_text += page.get_text()

    # 1. Page 1 - Report Overview
    assert "PII Risk Assessment Report" in extracted_text
    assert "CONFIDENTIAL" in extracted_text and "FOR AUTHORISED EMPLOYEES ONLY" in extracted_text
    assert sample_result.request_id in extracted_text
    assert "Total Detected PII" in extracted_text
    assert "CATEGORY-WISE FINDINGS SUMMARY" in extracted_text or "Category-Wise Findings Summary" in extracted_text
    assert "IDENTIFIED ENTITY BREAKDOWN" in extracted_text

    # 2. Detailed Findings - Main Section Table (Location and Risk Level removed, Source Page added)
    assert "DETAILED FINDINGS" in extracted_text
    assert "Source Page" in extracted_text
    assert "Category" in extracted_text
    assert "Detected Value" in extracted_text
    assert "Confidence" in extracted_text
    assert "Recommendation" in extracted_text

    # Confirm Location and Risk Level column headers are removed from the findings table
    table_lines = [l.strip() for l in extracted_text.splitlines()]
    assert "Location" not in table_lines
    assert "Risk Level" not in table_lines

    # Exact detected sensitive values for authorized employees
    assert "BNZPM2501F" in extracted_text
    assert "4991 1866 5246" in extracted_text
    assert "Rahul Sharma" in extracted_text

    # Recommended action and compliance text wrapped with official portal names
    assert "UIDAI Aadhaar update service" in extracted_text
    assert "Income Tax e-Filing portal" in extracted_text

    # Embedded clickable hyperlinks to official Indian government portals (.gov.in)
    links = doc[0].get_links()
    assert len(links) >= 2
    link_uris = [l["uri"] for l in links if "uri" in l]
    assert any("myaadhaar.uidai.gov.in" in u for u in link_uris)
    assert any("eportal.incometax.gov.in" in u for u in link_uris)
    assert all(".gov.in" in u or ".nic.in" in u for u in link_uris)

    # 3. Final Section - Processing Summary
    assert "PROCESSING & GATEWAY PIPELINE VERIFICATION SUMMARY" in extracted_text or "Processing & Gateway Pipeline Verification Summary" in extracted_text
    assert "Detection & Entity Merging" in extracted_text
    assert "ID Validation" in extracted_text
    assert "Masking & Tokenization" in extracted_text
    assert "Outbound Leak Guard" in extracted_text
    assert "AI Model Processing" in extracted_text
    assert "Response Validation & Reinsertion" in extracted_text
    assert "Audit Logging" in extracted_text

    # 4. Header & Footer
    assert "Page 1 of" in extracted_text
    assert "ENTERPRISE COMPLIANCE NOTICE" in extracted_text


def test_report_workflow_ordering_and_suppression():
    """Verify reports are NOT generated if validation fails or leak guard blocks."""
    # 1. Invalid ID scenario (needs_correction)
    invalid_text = "Mera naam Rahul Sharma hai. PAN ABCDE1234F, Aadhaar 1234 5678 901."
    res_invalid = process(invalid_text, backend=MockBackend("echo"), audit=False, validate_ids=True)
    assert res_invalid.needs_correction is True
    assert res_invalid.reports.get("available") is False

    # Attempt to fetch cached report
    pdf, status = get_cached_report(res_invalid.request_id, "internal")
    assert pdf is None
    assert status == "failed"

    # 2. Blocked scenario (leak guard tripped)
    text_normal = "Call Rahul Sharma at 9876543210."
    res_mock_blocked = ProcessResult(
        request_id="test_blocked_01",
        original_text=text_normal,
        sanitized_text=text_normal,
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=False, leaked_types=["PHONE"]),
        backend="mock",
        model="mock",
        gateway_ms=5.0,
        llm_ms=0.0,
        blocked=True,
    )
    assert is_workflow_successful(res_mock_blocked) is False
    reports = generate_and_store_reports(res_mock_blocked)
    assert reports == {}
    pdf, status = get_cached_report("test_blocked_01", "internal")
    assert pdf is None
    assert status == "failed"


def test_api_report_endpoints_and_access_control(tmp_path):
    """Verify FastAPI endpoints for report download, access control, and error handling."""
    from fastapi import HTTPException
    from gateway.api import (
        ProcessRequest,
        process_endpoint,
        download_internal_risk_report,
    )
    import gateway.audit as audit

    old_db = audit.DEFAULT_DB
    audit.DEFAULT_DB = str(tmp_path / "report_test_audit.db")
    try:
        req = ProcessRequest(
            text="Mera naam Rahul Sharma hai. PAN BNZPM2501F, Aadhaar 4991 1866 5246.",
            backend="mock",
            mock_mode="echo",
        )
        res = process_endpoint(req)
        req_id = res["request_id"]
        assert "reports" in res
        assert res["reports"]["available"] is True
        assert "internal_url" in res["reports"]
        # Confirm external_url is not in reports metadata
        assert "external_url" not in res["reports"]

        # 1. Download internal report - Authorized (200 OK)
        res_int = download_internal_risk_report(request_id=req_id, role="authorized")
        assert res_int.media_type == "application/pdf"
        assert len(res_int.body) > 1000

        # 2. Download internal report - Unauthorized (403 Forbidden)
        with pytest.raises(HTTPException) as exc_unauth:
            download_internal_risk_report(request_id=req_id, role="unauthorized")
        assert exc_unauth.value.status_code == 403
        assert "Access denied" in exc_unauth.value.detail

        # 3. Unknown request ID (404 Not Found)
        with pytest.raises(HTTPException) as exc_404:
            download_internal_risk_report(request_id="non_existent_id", role="authorized")
        assert exc_404.value.status_code == 404
    finally:
        audit.DEFAULT_DB = old_db


def test_multi_page_formatting():
    """Verify multi-page handling for documents with many findings."""
    long_text = "\n".join([
        f"Record {i}: Person Customer{i}, PAN BNZPM{i:04d}F, Aadhaar 4991 1866 {5000+i:04d}, Phone 98765{i:05d}."
        for i in range(12)
    ])
    result = process(long_text, backend=MockBackend("echo"), audit=False, validate_ids=False)
    assert len(result.entities) >= 12

    pdf_bytes = generate_internal_risk_report(result)
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    # With 12+ records and multiple entities per record, it spans multiple pages
    assert doc.page_count >= 2

    # Check that each page has consistent running headers & footers
    p1_text = doc[0].get_text()
    assert "Page 1 of " in p1_text

    p2_text = doc[1].get_text()
    assert "RESTRICTED / INTERNAL AUDIT" in p2_text
    assert "Page 2 of " in p2_text


def test_frontend_single_button_and_clean_ui():
    """Verify frontend HTML has only one button and no external report button or risk pill badge."""
    html_path = os.path.join(os.path.dirname(__file__), "..", "gateway", "static", "demo.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Must contain the single internal download button
    assert 'id="btn-report-internal"' in html
    assert "Download Internal Risk Assessment (PDF)" in html

    # Must NOT contain external report button or risk badge pill
    assert 'id="btn-report-external"' not in html
    assert "Download External Sanitized Document" not in html
    assert 'id="risk-pill"' not in html
    assert "MEDIUM RISK" not in html


def test_comparison_panels_layout_and_scrolling():
    """Verify comparison panels layout: fixed 450px height, sticky header, independent scrolling, and scrollbars."""
    html_path = os.path.join(os.path.dirname(__file__), "..", "gateway", "static", "demo.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Three panels markup structure
    assert 'class="three"' in html
    assert '<h2>Detected on the laptop</h2>' in html
    assert '<h2>Exactly what the AI receives</h2>' in html
    assert '<h2>Final answer for the user</h2>' in html

    # 2. Fixed maximum height (approx 450px) and flex column
    assert "height:450px" in html
    assert "max-height:450px" in html
    assert "display:flex" in html
    assert "flex-direction:column" in html

    # 3. Sticky header visible while scrolling
    assert "position:sticky" in html
    assert "top:0" in html
    assert "background:var(--surface)" in html

    # 4. Content area independent vertical scrolling with overflow-y: auto
    assert "overflow-y:auto" in html
    assert "overflow-x:hidden" in html
    assert "min-height:0" in html

    # 5. Clean scrollbar styling
    assert "scrollbar-width:thin" in html
    assert "::-webkit-scrollbar" in html
    assert "::-webkit-scrollbar-thumb" in html

    # 6. Word break and line wrapping
    assert "white-space:pre-wrap" in html
    assert "overflow-wrap:anywhere" in html
    assert "word-break:break-word" in html

    # 7. Responsive stacking on smaller screens
    assert "grid-template-columns:1fr!important" in html


def test_report_omits_images_section_when_no_images(sample_result):
    """When the input document contains no images, the section is completely omitted."""
    pdf_bytes = generate_internal_risk_report(sample_result, source_images=[])
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    all_text = "".join(page.get_text() for page in doc)
    assert "Source Document Images" not in all_text
    assert "SOURCE DOCUMENT IMAGES" not in all_text


def test_report_with_embedded_images():
    """Verify PDF with multiple embedded images preserves images, page numbers, and separate blocks."""
    from PIL import Image, ImageDraw
    from gateway.document import extract_images_from_pdf

    # Create synthetic PDF with 2 embedded images on Page 1
    doc = pymupdf.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 50), "Employee Verification Document. PAN BNZPM2501F.")

    im1 = Image.new("RGB", (300, 200), color=(180, 210, 240))
    d1 = ImageDraw.Draw(im1)
    d1.text((30, 80), "Embedded PAN Card Photo", fill=(10, 30, 80))
    b1 = io.BytesIO()
    im1.save(b1, format="PNG")
    p1.insert_image(pymupdf.Rect(50, 70, 250, 200), stream=b1.getvalue())

    im2 = Image.new("RGB", (250, 150), color=(240, 210, 180))
    d2 = ImageDraw.Draw(im2)
    d2.text((20, 60), "Authorized Signature", fill=(80, 30, 10))
    b2 = io.BytesIO()
    im2.save(b2, format="PNG")
    p1.insert_image(pymupdf.Rect(300, 70, 480, 180), stream=b2.getvalue())

    pdf_bytes = doc.tobytes()
    doc.close()

    # 1. Verify extraction logic
    extracted_imgs = extract_images_from_pdf(pdf_bytes)
    assert len(extracted_imgs) == 2
    assert extracted_imgs[0]["page"] == 1
    assert extracted_imgs[0]["image_index"] == 1
    assert extracted_imgs[1]["page"] == 1
    assert extracted_imgs[1]["image_index"] == 2
    assert extracted_imgs[0]["width"] == 300
    assert extracted_imgs[0]["height"] == 200

    # 2. Process and generate internal report
    text = "Employee Verification Document. PAN BNZPM2501F."
    res = process(text, backend=MockBackend("echo"), audit=False, source_images=extracted_imgs)
    assert len(res.source_images) == 2

    # Check security: images NOT present in result.to_dict()
    out_dict = res.to_dict()
    assert "source_images" not in out_dict

    # 3. Verify generated report contains the dedicated section
    cached_pdf, status = get_cached_report(res.request_id, "internal")
    assert status == "ok"
    assert cached_pdf is not None

    rep_doc = pymupdf.open(stream=cached_pdf, filetype="pdf")
    all_text = "".join(p.get_text() for p in rep_doc)

    assert "SOURCE DOCUMENT IMAGES" in all_text or "Source Document Images" in all_text
    assert "Original PDF Page 1 · Embedded Image 1" in all_text
    assert "Original PDF Page 1 · Embedded Image 2" in all_text
    assert "300 × 200 px" in all_text
    assert "250 × 150 px" in all_text

    # Verify report contains embedded images
    total_imgs = sum(len(p.get_images()) for p in rep_doc)
    assert total_imgs >= 2


def test_report_with_scanned_page():
    """Verify complete scanned pages are captured and labeled for visual inspection."""
    from PIL import Image, ImageDraw
    from gateway.document import extract_images_from_pdf

    # Create synthetic scanned PDF (full page scan with no extractable text)
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    scan_img = Image.new("RGB", (600, 800), color=(245, 245, 245))
    d = ImageDraw.Draw(scan_img)
    d.rectangle([30, 30, 570, 770], outline=(40, 40, 40), width=2)
    d.text((60, 100), "AADHAAR ENROLMENT APPLICATION FORM - SCANNED COPY", fill=(0, 0, 0))
    bio = io.BytesIO()
    scan_img.save(bio, format="PNG")
    p.insert_image(p.rect, stream=bio.getvalue())

    pdf_bytes = doc.tobytes()
    doc.close()

    extracted_imgs = extract_images_from_pdf(pdf_bytes)
    assert len(extracted_imgs) == 1
    assert extracted_imgs[0]["is_scanned_page"] is True
    assert extracted_imgs[0]["page"] == 1
    assert "Complete Scanned Page" in extracted_imgs[0]["label"]

    res = process("Aadhaar Enrolment Application Form. Aadhaar 4991 1866 5246.",
                  backend=MockBackend("echo"), audit=False, source_images=extracted_imgs)
    cached_pdf, status = get_cached_report(res.request_id, "internal")
    rep_doc = pymupdf.open(stream=cached_pdf, filetype="pdf")
    all_text = "".join(page.get_text() for page in rep_doc)

    assert "SOURCE DOCUMENT IMAGES" in all_text or "Source Document Images" in all_text
    assert "Original PDF Page 1 · Complete Scanned Page" in all_text


def test_large_images_and_multi_page_layout():
    """Verify unusually large images scale properly without breaking PDF multi-page layout."""
    from PIL import Image

    # Create 2 very large images (3000 x 2000 px and 2000 x 3000 px)
    large_imgs = [
        {
            "page": 1,
            "image_index": 1,
            "bytes": io.BytesIO(b"").getvalue(),
            "format": "png",
            "width": 3000,
            "height": 2000,
            "is_scanned_page": False,
            "label": "Original PDF Page 1 · High Resolution Scan 1",
        },
        {
            "page": 2,
            "image_index": 1,
            "bytes": io.BytesIO(b"").getvalue(),
            "format": "png",
            "width": 2000,
            "height": 3000,
            "is_scanned_page": False,
            "label": "Original PDF Page 2 · High Resolution Scan 2",
        },
    ]

    # Generate test image bytes
    for item in large_imgs:
        im = Image.new("RGB", (400, 300), color="blue")
        bio = io.BytesIO()
        im.save(bio, format="PNG")
        item["bytes"] = bio.getvalue()

    res = process("Customer Verification Record. PAN BNZPM2501F, Phone 9876543210.",
                  backend=MockBackend("echo"), audit=False, source_images=large_imgs)
    pdf_bytes, status = get_cached_report(res.request_id, "internal")
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    # Document renders cleanly across multiple pages
    assert doc.page_count >= 2
    all_text = "".join(p.get_text() for p in doc)
    assert "Original PDF Page 1 · High Resolution Scan 1" in all_text
    assert "Original PDF Page 2 · High Resolution Scan 2" in all_text
    # Running footers maintain Page X of Y
    assert f"Page {doc.page_count} of {doc.page_count}" in doc[-1].get_text()


def test_duplicate_image_deduplication():
    """Verify duplicate images across pages (such as logos) are extracted only once."""
    from PIL import Image
    from gateway.document import extract_images_from_pdf

    # Create 2-page PDF with identical logo embedded on both pages
    doc = pymupdf.open()
    logo = Image.new("RGB", (120, 60), color="green")
    b_logo = io.BytesIO()
    logo.save(b_logo, format="PNG")
    logo_bytes = b_logo.getvalue()

    # Page 1
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 50), "Page 1 Document Content")
    p1.insert_image(pymupdf.Rect(50, 70, 170, 130), stream=logo_bytes)

    # Page 2
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((50, 50), "Page 2 Document Content")
    p2.insert_image(pymupdf.Rect(50, 70, 170, 130), stream=logo_bytes)

    pdf_bytes = doc.tobytes()
    doc.close()

    extracted = extract_images_from_pdf(pdf_bytes)
    # Identical logo should be deduplicated
    assert len(extracted) == 1
    assert extracted[0]["page"] == 1



def test_report_omits_images_section_when_no_images(sample_result):
    """When the input document contains no images, the section is completely omitted."""
    pdf_bytes = generate_internal_risk_report(sample_result, source_images=[])
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    all_text = "".join(page.get_text() for page in doc)
    assert "Source Document Images" not in all_text
    assert "SOURCE DOCUMENT IMAGES" not in all_text


def test_report_with_embedded_images():
    """Verify PDF with multiple embedded images preserves images, page numbers, and separate blocks."""
    from PIL import Image, ImageDraw
    from gateway.document import extract_images_from_pdf

    # Create synthetic PDF with 2 embedded images on Page 1
    doc = pymupdf.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 50), "Employee Verification Document. PAN BNZPM2501F.")

    im1 = Image.new("RGB", (300, 200), color=(180, 210, 240))
    d1 = ImageDraw.Draw(im1)
    d1.text((30, 80), "Embedded PAN Card Photo", fill=(10, 30, 80))
    b1 = io.BytesIO()
    im1.save(b1, format="PNG")
    p1.insert_image(pymupdf.Rect(50, 70, 250, 200), stream=b1.getvalue())

    im2 = Image.new("RGB", (250, 150), color=(240, 210, 180))
    d2 = ImageDraw.Draw(im2)
    d2.text((20, 60), "Authorized Signature", fill=(80, 30, 10))
    b2 = io.BytesIO()
    im2.save(b2, format="PNG")
    p1.insert_image(pymupdf.Rect(300, 70, 480, 180), stream=b2.getvalue())

    pdf_bytes = doc.tobytes()
    doc.close()

    # 1. Verify extraction logic
    extracted_imgs = extract_images_from_pdf(pdf_bytes)
    assert len(extracted_imgs) == 2
    assert extracted_imgs[0]["page"] == 1
    assert extracted_imgs[0]["image_index"] == 1
    assert extracted_imgs[1]["page"] == 1
    assert extracted_imgs[1]["image_index"] == 2
    assert extracted_imgs[0]["width"] == 300
    assert extracted_imgs[0]["height"] == 200

    # 2. Process and generate internal report
    text = "Employee Verification Document. PAN BNZPM2501F."
    res = process(text, backend=MockBackend("echo"), audit=False, source_images=extracted_imgs)
    assert len(res.source_images) == 2

    # Check security: images NOT present in result.to_dict()
    out_dict = res.to_dict()
    assert "source_images" not in out_dict

    # 3. Verify generated report contains the dedicated section
    cached_pdf, status = get_cached_report(res.request_id, "internal")
    assert status == "ok"
    assert cached_pdf is not None

    rep_doc = pymupdf.open(stream=cached_pdf, filetype="pdf")
    all_text = "".join(p.get_text() for p in rep_doc)

    assert "SOURCE DOCUMENT IMAGES" in all_text or "Source Document Images" in all_text
    assert "Original PDF Page 1 · Embedded Image 1" in all_text
    assert "Original PDF Page 1 · Embedded Image 2" in all_text
    assert "300 × 200 px" in all_text
    assert "250 × 150 px" in all_text

    # Verify report contains embedded images
    total_imgs = sum(len(p.get_images()) for p in rep_doc)
    assert total_imgs >= 2


def test_report_with_scanned_page():
    """Verify complete scanned pages are captured and labeled for visual inspection."""
    from PIL import Image, ImageDraw
    from gateway.document import extract_images_from_pdf

    # Create synthetic scanned PDF (full page scan with no extractable text)
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    scan_img = Image.new("RGB", (600, 800), color=(245, 245, 245))
    d = ImageDraw.Draw(scan_img)
    d.rectangle([30, 30, 570, 770], outline=(40, 40, 40), width=2)
    d.text((60, 100), "AADHAAR ENROLMENT APPLICATION FORM - SCANNED COPY", fill=(0, 0, 0))
    bio = io.BytesIO()
    scan_img.save(bio, format="PNG")
    p.insert_image(p.rect, stream=bio.getvalue())

    pdf_bytes = doc.tobytes()
    doc.close()

    extracted_imgs = extract_images_from_pdf(pdf_bytes)
    assert len(extracted_imgs) == 1
    assert extracted_imgs[0]["is_scanned_page"] is True
    assert extracted_imgs[0]["page"] == 1
    assert "Complete Scanned Page" in extracted_imgs[0]["label"]

    res = process("Aadhaar Enrolment Application Form. Aadhaar 4991 1866 5246.",
                  backend=MockBackend("echo"), audit=False, source_images=extracted_imgs)
    cached_pdf, status = get_cached_report(res.request_id, "internal")
    rep_doc = pymupdf.open(stream=cached_pdf, filetype="pdf")
    all_text = "".join(page.get_text() for page in rep_doc)

    assert "SOURCE DOCUMENT IMAGES" in all_text or "Source Document Images" in all_text
    assert "Original PDF Page 1 · Complete Scanned Page" in all_text


def test_large_images_and_multi_page_layout():
    """Verify unusually large images scale properly without breaking PDF multi-page layout."""
    from PIL import Image

    # Create 2 very large images (3000 x 2000 px and 2000 x 3000 px)
    large_imgs = [
        {
            "page": 1,
            "image_index": 1,
            "bytes": io.BytesIO(b"").getvalue(),
            "format": "png",
            "width": 3000,
            "height": 2000,
            "is_scanned_page": False,
            "label": "Original PDF Page 1 · High Resolution Scan 1",
        },
        {
            "page": 2,
            "image_index": 1,
            "bytes": io.BytesIO(b"").getvalue(),
            "format": "png",
            "width": 2000,
            "height": 3000,
            "is_scanned_page": False,
            "label": "Original PDF Page 2 · High Resolution Scan 2",
        },
    ]

    # Generate test image bytes
    for item in large_imgs:
        im = Image.new("RGB", (400, 300), color="blue")
        bio = io.BytesIO()
        im.save(bio, format="PNG")
        item["bytes"] = bio.getvalue()

    res = process("Customer Verification Record. PAN BNZPM2501F, Phone 9876543210.",
                  backend=MockBackend("echo"), audit=False, source_images=large_imgs)
    pdf_bytes, status = get_cached_report(res.request_id, "internal")
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    # Document renders cleanly across multiple pages
    assert doc.page_count >= 2
    all_text = "".join(p.get_text() for p in doc)
    assert "Original PDF Page 1 · High Resolution Scan 1" in all_text
    assert "Original PDF Page 2 · High Resolution Scan 2" in all_text
    # Running footers maintain Page X of Y
    assert f"Page {doc.page_count} of {doc.page_count}" in doc[-1].get_text()


def test_duplicate_image_deduplication():
    """Verify duplicate images across pages (such as logos) are extracted only once."""
    from PIL import Image
    from gateway.document import extract_images_from_pdf

    # Create 2-page PDF with identical logo embedded on both pages
    doc = pymupdf.open()
    logo = Image.new("RGB", (120, 60), color="green")
    b_logo = io.BytesIO()
    logo.save(b_logo, format="PNG")
    logo_bytes = b_logo.getvalue()

    # Page 1
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 50), "Page 1 Document Content")
    p1.insert_image(pymupdf.Rect(50, 70, 170, 130), stream=logo_bytes)

    # Page 2
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((50, 50), "Page 2 Document Content")
    p2.insert_image(pymupdf.Rect(50, 70, 170, 130), stream=logo_bytes)

    pdf_bytes = doc.tobytes()
    doc.close()

    extracted = extract_images_from_pdf(pdf_bytes)
    # Identical logo should be deduplicated
    assert len(extracted) == 1
    assert extracted[0]["page"] == 1



def test_source_page_tracking_multi_page():
    """Verify source page numbers are tracked for every PII occurrence, including repeated entities."""
    from gateway.document import extract_from_pdf
    import pymupdf

    # Create 2-page PDF
    doc = pymupdf.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 50), "Customer Profile: Rahul Sharma. PAN BNZPM2501F. Mobile 9876543210.")

    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((50, 50), "Billing Profile: Rahul Sharma. Aadhaar 4991 1866 5246. Address 12 MG Road.")

    pdf_bytes = doc.tobytes()
    doc.close()

    extracted = extract_from_pdf(pdf_bytes, "test_multi.pdf")
    assert extracted.page_count == 2
    assert len(extracted.page_spans) == 2
    assert extracted.page_spans[0]["page"] == 1
    assert extracted.page_spans[1]["page"] == 2

    res = process(
        extracted.text,
        backend=MockBackend("echo"),
        audit=False,
        page_spans=extracted.page_spans,
        original_doc_bytes=pdf_bytes,
    )

    doc_risk = assess_document_risk(res)
    pages_found = {f.source_page for f in doc_risk.findings}
    assert 1 in pages_found
    assert 2 in pages_found

    # Repeated entity 'Rahul Sharma' appears on both pages
    rahul_findings = [f for f in doc_risk.findings if "Rahul Sharma" in f.original_value]
    assert len(rahul_findings) >= 2
    rahul_pages = {f.source_page for f in rahul_findings}
    assert rahul_pages == {1, 2}
    assert any(f.source_page_display == "Page 1" for f in rahul_findings)
    assert any(f.source_page_display == "Page 2" for f in rahul_findings)

    # Generate internal risk assessment PDF report
    pdf_out, status = get_cached_report(res.request_id, "internal")
    assert status == "ok"
    assert pdf_out is not None

    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")
    all_text = "".join(p.get_text() for p in rep_doc)

    assert "Source Page" in all_text
    assert "Page 1" in all_text
    assert "Page 2" in all_text
    rep_doc.close()


def test_visual_risk_mapping_and_legend():
    """Verify Original Document - Visual PII Risk Mapping section with risk legend and highlights."""
    import pymupdf

    doc = pymupdf.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 100), "Identity Verification: Rahul Sharma, PAN BNZPM2501F, Phone 9876543210.")

    pdf_bytes = doc.tobytes()
    doc.close()

    res = process(
        "Identity Verification: Rahul Sharma, PAN BNZPM2501F, Phone 9876543210.",
        backend=MockBackend("echo"),
        audit=False,
        original_doc_bytes=pdf_bytes,
    )

    pdf_out, status = get_cached_report(res.request_id, "internal")
    assert status == "ok"
    assert pdf_out is not None

    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")
    all_text = "".join(p.get_text() for p in rep_doc)

    # 1. Section heading
    assert "QUICK ASSESSMENT" in all_text or "Quick Assessment" in all_text
    assert "VISUAL PII RISK MAPPING" in all_text or "Visual PII Risk Mapping" in all_text

    # 2. Risk Legend presence
    assert "COLOUR LEGEND" in all_text or "Colour Legend" in all_text
    assert "CRITICAL" in all_text or "HIGH" in all_text
    assert "MEDIUM" in all_text
    assert "LOW / SAFE" in all_text or "LOW" in all_text

    # 3. Running header banner on original document page
    assert "ORIGINAL DOCUMENT PAGE 1 OF 1 · VISUAL PII RISK MAPPING" in all_text

    # 4. Check that highlights or drawings were added to original page
    orig_rep_page = rep_doc[-1]
    drawings = orig_rep_page.get_drawings()
    assert len(drawings) >= 1  # Highlights drawn

    rep_doc.close()


def test_person_photo_extraction_and_rejections():
    """Verify person photo extraction, caption, and rejection of logos, signatures, and thumbnails."""
    import numpy as np
    import cv2
    from gateway.document import identify_person_photo

    # 1. Synthetic person photo: standard portrait aspect ratio 0.8, skin tones in YCrCb range
    photo_arr = np.zeros((200, 160, 3), dtype=np.uint8)
    photo_arr[40:160, 30:130] = [140, 175, 215]  # BGR skin color
    photo_arr[0:40, :] = [30, 40, 50]  # dark hair / background
    photo_arr[160:, :] = [180, 80, 40]  # clothing / collar

    is_success, buf = cv2.imencode(".png", photo_arr)
    person_bytes = buf.tobytes()

    # 2. Synthetic signature: wide aspect ratio (3.0), monochrome black & white
    sig_arr = np.ones((60, 180, 3), dtype=np.uint8) * 255
    cv2.line(sig_arr, (10, 40), (170, 20), (0, 0, 0), 2)
    cv2.line(sig_arr, (20, 20), (160, 50), (0, 0, 0), 2)
    _, sig_buf = cv2.imencode(".png", sig_arr)
    sig_bytes = sig_buf.tobytes()

    # 3. Synthetic logo: corporate emblem (flat blue color, zero skin tones)
    logo_arr = np.zeros((100, 100, 3), dtype=np.uint8)
    logo_arr[:, :] = [220, 50, 20]  # flat blue
    _, logo_buf = cv2.imencode(".png", logo_arr)
    logo_bytes = logo_buf.tobytes()

    # 4. Tiny thumbnail (< 60 px)
    thumb_arr = np.zeros((40, 40, 3), dtype=np.uint8)
    _, thumb_buf = cv2.imencode(".png", thumb_arr)
    thumb_bytes = thumb_buf.tobytes()

    # Test identify_person_photo rejections
    # a. Signature rejected
    sig_cand, _ = identify_person_photo([{
        "page": 1, "image_index": 1, "bytes": sig_bytes, "width": 180, "height": 60, "format": "png", "is_scanned_page": False,
    }])
    assert sig_cand is None

    # b. Logo rejected
    logo_cand, _ = identify_person_photo([{
        "page": 1, "image_index": 1, "bytes": logo_bytes, "width": 100, "height": 100, "format": "png", "is_scanned_page": False,
    }])
    assert logo_cand is None

    # c. Tiny thumbnail rejected
    thumb_cand, _ = identify_person_photo([{
        "page": 1, "image_index": 1, "bytes": thumb_bytes, "width": 40, "height": 40, "format": "png", "is_scanned_page": False,
    }])
    assert thumb_cand is None

    # d. Person photo identified
    person_img_dict = {
        "page": 1, "image_index": 1, "bytes": person_bytes, "width": 160, "height": 200, "format": "png", "is_scanned_page": False,
    }
    found_photo, is_ambig = identify_person_photo([person_img_dict, {
        "page": 1, "image_index": 2, "bytes": sig_bytes, "width": 180, "height": 60, "format": "png", "is_scanned_page": False,
    }])
    assert found_photo is not None
    assert is_ambig is False

    # 5. Verify Page 1 placement with caption
    res = process(
        "Verification File. PAN BNZPM2501F.",
        backend=MockBackend("echo"),
        audit=False,
        source_images=[person_img_dict],
    )
    pdf_out, status = get_cached_report(res.request_id, "internal")
    assert status == "ok"
    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")
    p1_text = rep_doc[0].get_text()
    assert "Extracted from Original Document" in p1_text

    # When no photo found, area is empty and caption is absent
    res_no_photo = process("Verification File. PAN BNZPM2501F.", backend=MockBackend("echo"), audit=False, source_images=[])
    pdf_no_photo, _ = get_cached_report(res_no_photo.request_id, "internal")
    rep_no_photo = pymupdf.open(stream=pdf_no_photo, filetype="pdf")
    p1_no_photo_text = rep_no_photo[0].get_text()
    assert "Extracted from Original Document" not in p1_no_photo_text

    rep_doc.close()
    rep_no_photo.close()


def test_zero_leakage_and_security():
    """Verify original document bytes and source images are never leaked in API JSON or audit logs."""
    from gateway.contracts import Entity, ProcessResult, ReinsertResult, LeakCheck

    doc_bytes = b"%PDF-1.4 test document content"
    img_data = [{"page": 1, "bytes": b"img", "width": 100, "height": 100}]

    res = ProcessResult(
        request_id="sec_test_01",
        original_text="Test",
        sanitized_text="Test",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
        source_images=img_data,
        original_doc_bytes=doc_bytes,
    )

    out = res.to_dict()
    assert "source_images" not in out
    assert "original_doc_bytes" not in out


def test_visual_risk_mapping_three_color_levels_and_overlaps():
    """Verify exact color mapping (Red: High/Critical, Amber: Medium, Green: Low/Safe) and multiple findings on one page."""
    import pymupdf
    from gateway.reports import generate_internal_risk_report
    from gateway.risk import assess_document_risk

    # Page containing 3 distinct risk levels:
    # 1. LOW: Person name (Rahul Sharma) -> Green
    # 2. MEDIUM: Phone number (9876543210) -> Amber
    # 3. HIGH: PAN card (BNZPM2501F) -> Red
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    p.insert_text((50, 100), "Verification Record: Rahul Sharma. PAN BNZPM2501F. Mobile 9876543210.")
    pdf_bytes = doc.tobytes()
    doc.close()

    res = process(
        "Verification Record: Rahul Sharma. PAN BNZPM2501F. Mobile 9876543210.",
        backend=MockBackend("echo"),
        audit=False,
        original_doc_bytes=pdf_bytes,
    )

    pdf_out = generate_internal_risk_report(res, original_doc_bytes=pdf_bytes)
    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")
    
    # Legend page checks
    legend_text = "".join(p.get_text() for p in rep_doc)
    assert "Quick Assessment – Visual PII Risk Mapping" in legend_text or "QUICK ASSESSMENT" in legend_text
    assert "LOW / SAFE" in legend_text
    assert "MEDIUM" in legend_text
    assert "HIGH / CRITICAL" in legend_text

    # Check original document page reproduced at the end
    orig_page = rep_doc[-1]
    drawings = orig_page.get_drawings()
    assert len(drawings) >= 3  # At least 3 highlights drawn (banner + 3 entities)

    # Inspect highlight colors present in page drawings
    found_red = False
    found_amber = False
    found_green = False
    for d in drawings:
        fill = d.get("fill")
        if fill:
            r, g, b = fill[:3]
            # Red: r > 0.8, g < 0.3
            if r > 0.8 and g < 0.3:
                found_red = True
            # Amber: r > 0.8, g between 0.5 and 0.8, b < 0.2
            elif r > 0.8 and 0.5 <= g <= 0.8 and b < 0.2:
                found_amber = True
            # Green: g > 0.6, r < 0.4
            elif g > 0.6 and r < 0.4:
                found_green = True

    assert found_red, "Expected RED highlight for PAN (HIGH/CRITICAL)"
    assert found_amber, "Expected AMBER highlight for Phone (MEDIUM)"
    assert found_green, "Expected GREEN highlight for Person (LOW/SAFE)"
    rep_doc.close()


def test_visual_risk_mapping_scanned_pdf_using_ocr():
    """Verify visual risk mapping uses OCR coordinates on scanned PDFs with no native text layer."""
    import pymupdf
    from PIL import Image
    from gateway.reports import generate_internal_risk_report

    # Create synthetic scanned PDF (pure bitmap, zero vector text)
    doc = pymupdf.open()
    temp_doc = pymupdf.open()
    tp = temp_doc.new_page(width=595, height=842)
    tp.insert_text((80, 160), "Application Form for Tax Verification", fontsize=12)
    tp.insert_text((80, 200), "Identity: Rahul Sharma", fontsize=12)
    tp.insert_text((80, 240), "PAN: BNZPM2501F", fontsize=14)
    tp.insert_text((80, 280), "Phone: 9876543210", fontsize=12)
    pix = tp.get_pixmap(dpi=150)
    temp_doc.close()

    p = doc.new_page(width=595, height=842)
    p.insert_image(p.rect, stream=pix.tobytes())
    pdf_bytes = doc.tobytes()
    doc.close()

    # Verify native text on page is completely empty
    check_doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    assert check_doc[0].get_text().strip() == ""
    check_doc.close()

    # Process scanned PDF text
    res = process(
        "Application Form. Identity: Rahul Sharma. PAN: BNZPM2501F. Phone: 9876543210.",
        backend=MockBackend("echo"),
        audit=False,
        original_doc_bytes=pdf_bytes,
    )

    pdf_out = generate_internal_risk_report(res, original_doc_bytes=pdf_bytes)
    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")

    # Verify original page was reproduced and has OCR highlights
    orig_page = rep_doc[-1]
    drawings = orig_page.get_drawings()
    # Should have highlights located by OCR
    assert len(drawings) >= 2
    rep_doc.close()


def test_visual_risk_mapping_rotated_pages():
    """Verify visual risk mapping preserves orientation and correctly highlights rotated pages."""
    import pymupdf
    from gateway.reports import generate_internal_risk_report

    # Create 90-degree rotated PDF page
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    p.insert_text((100, 200), "Tax Dossier. PAN BNZPM2501F.", fontsize=12)
    p.set_rotation(90)
    pdf_bytes = doc.tobytes()
    doc.close()

    res = process(
        "Tax Dossier. PAN BNZPM2501F.",
        backend=MockBackend("echo"),
        audit=False,
        original_doc_bytes=pdf_bytes,
    )

    pdf_out = generate_internal_risk_report(res, original_doc_bytes=pdf_bytes)
    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")

    orig_page = rep_doc[-1]
    # Verify rotation preserved
    assert orig_page.rotation == 90
    assert orig_page.rect.width == 842
    assert orig_page.rect.height == 595

    # Verify highlight was drawn
    drawings = orig_page.get_drawings()
    assert len(drawings) >= 1
    rep_doc.close()


def test_visual_risk_mapping_unresolved_flag_no_invented_coords():
    """Verify findings with missing/inaccurate document coordinates are flagged for review and never invent fake boxes."""
    import pymupdf
    from gateway.reports import generate_internal_risk_report

    # Document has only "General Form Document" without the actual ID string
    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    p.insert_text((100, 200), "General Form Document without personal data.", fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()

    # Pass an entity that does NOT exist in the PDF
    from gateway.contracts import Entity, ProcessResult, ReinsertResult, LeakCheck

    res = ProcessResult(
        request_id="unmapped_test_01",
        original_text="Tax record with missing PAN BNZPM2501F",
        sanitized_text="Tax record with missing PAN <PAN_1>",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[Entity(type="PAN", start=28, end=38, text="BNZPM2501F", score=1.0, page=1)],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
        original_doc_bytes=pdf_bytes,
    )

    pdf_out = generate_internal_risk_report(res, original_doc_bytes=pdf_bytes)
    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")

    orig_page = rep_doc[-1]
    all_text = orig_page.get_text()

    # Verify flagged for review rather than inventing coordinates
    assert "Review Required" in all_text or "MANUAL REVIEW REQUIRED" in all_text
    assert "BNZPM2501F" in all_text

    rep_doc.close()


def test_document_information_summary_all_seven_scenarios():
    """Verify all 7 extraction scenarios for Document Information Summary in sentence form:
    1. Person name, phone, email, DOB, education
    2. Multiple people (no arbitrary ownership assumption)
    3. Missing fields (no invented values)
    4. Scanned / OCR PDF
    5. Multi-page PDF with source page references
    6. Unreadable or uncertain text indication
    7. Repeated personal information (deduplication)
    """
    import re
    import pymupdf
    from gateway.contracts import Entity, ProcessResult, ReinsertResult, LeakCheck
    from gateway.reports import generate_document_information_summary

    # --- Scenario 1: Name, phone, email, DOB, educational details ---
    r1 = ProcessResult(
        request_id="sc1",
        original_text=(
            "Verification for Vijay Kumar KN. Candidate Name: Vijay Kumar KN.\n"
            "DOB: 16 April 2005\nPhone: 9008181187, Email: vijay@example.com\n"
            "College: Bapuji Institute of Engineering and Technology, USN: 4BD21CS100\n"
        ),
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 17, 31, "Vijay Kumar KN", page=1),
            Entity("PHONE", 76, 86, "9008181187", page=1),
            Entity("EMAIL", 95, 112, "vijay@example.com", page=1),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
    )
    s1 = generate_document_information_summary(r1)
    assert "belongs to Vijay Kumar KN (Page 1)." in s1
    assert "mobile number 9008181187 (Page 1)" in s1
    assert "email address vijay@example.com (Page 1)" in s1
    assert "date of birth 16 April 2005 (Page 1)" in s1
    assert "Bapuji Institute of Engineering and Technology (Page 1)" in s1
    assert "contains educational identification details." in s1
    assert "These details were extracted from the uploaded document." in s1

    # --- Scenario 2: Multiple people's information (never assume ownership) ---
    r2 = ProcessResult(
        request_id="sc2",
        original_text="Consultation between Dr. Ramesh Rao and patient Suresh Kumar. Contact: 9876543210.",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 21, 35, "Dr. Ramesh Rao", page=1),
            Entity("PERSON", 48, 60, "Suresh Kumar", page=1),
            Entity("PHONE", 70, 80, "9876543210", page=1),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
    )
    s2 = generate_document_information_summary(r2)
    assert "multiple individuals, including Dr. Ramesh Rao (Page 1) and Suresh Kumar (Page 1)" in s2
    assert "belongs to" not in s2

    # --- Scenario 3: Missing fields (never invent information) ---
    r3 = ProcessResult(
        request_id="sc3",
        original_text="Tax invoice. PAN: BNZPM2501F. Registered Address: SSM Cultural Hall, Davangere.",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PAN", 18, 28, "BNZPM2501F", page=1),
            Entity("ADDRESS", 50, 79, "SSM Cultural Hall, Davangere", page=1),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
    )
    s3 = generate_document_information_summary(r3)
    assert "does not contain an identified individual's name" in s3
    assert "PAN number BNZPM2501F (Page 1)" in s3
    assert "residential address SSM Cultural Hall, Davangere (Page 1)" in s3
    assert "email" not in s3
    assert "mobile" not in s3
    assert "date of birth" not in s3

    # --- Scenario 4: Scanned PDF / Document ---
    doc_scan = pymupdf.open()
    ps = doc_scan.new_page(width=595, height=842)
    ps.insert_text((50, 100), "Identity Record: Priya Sharma", fontsize=12)
    ps.insert_text((50, 130), "Mobile: 9123456780", fontsize=12)
    scan_bytes = doc_scan.tobytes()
    doc_scan.close()

    r4 = ProcessResult(
        request_id="sc4",
        original_text="Identity Record: Priya Sharma. Mobile: 9123456780.",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 17, 29, "Priya Sharma", page=1),
            Entity("PHONE", 39, 49, "9123456780", page=1),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
        original_doc_bytes=scan_bytes,
    )
    s4 = generate_document_information_summary(r4, original_doc_bytes=scan_bytes)
    assert "belongs to Priya Sharma (Page 1)" in s4
    assert "mobile number 9123456780 (Page 1)" in s4

    # --- Scenario 5: Multi-page PDF (Source page tracking) ---
    r5 = ProcessResult(
        request_id="sc5",
        original_text="Employee file. Candidate: Rahul Kumar (page 1). Phone 9008181187 (page 1). Email on page 2: rahul@example.com.",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 26, 37, "Rahul Kumar", page=1),
            Entity("PHONE", 53, 63, "9008181187", page=1),
            Entity("EMAIL", 93, 110, "rahul@example.com", page=2),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
    )
    s5 = generate_document_information_summary(r5)
    assert "belongs to Rahul Kumar (Page 1)" in s5
    assert "mobile number 9008181187 (Page 1)" in s5
    assert "email address rahul@example.com (Page 2)" in s5

    # --- Scenario 6: PDF with unreadable or uncertain text ---
    r6 = ProcessResult(
        request_id="sc6",
        original_text="Applicant: Vijay Kumar KN. Mobile: 9008181187. Address: [unreadable].",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 11, 25, "Vijay Kumar KN", page=1),
            Entity("PHONE", 35, 45, "9008181187", page=1),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
    )
    s6 = generate_document_information_summary(r6)
    assert "could not be reliably extracted" in s6
    assert "unreadable text or scanning artifacts" in s6

    # --- Scenario 7: Repeated personal information (deduplication) ---
    r7 = ProcessResult(
        request_id="sc7",
        original_text="Candidate: Rahul Sharma. Primary phone: 9876543210. Billing phone: 9876543210. Alt: 9876543210.",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 11, 23, "Rahul Sharma", page=1),
            Entity("PHONE", 39, 49, "9876543210", page=1),
            Entity("PHONE", 66, 76, "9876543210", page=1),
            Entity("PHONE", 84, 94, "9876543210", page=2),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
    )
    s7 = generate_document_information_summary(r7)
    assert s7.count("9876543210") == 1  # Exactly ONE occurrence
    assert "Pages 1, 2" in s7


def test_document_information_summary_pdf_placement_and_no_tables():
    """Verify Document Information Summary section placement in Internal PDF:
    - Appears AFTER Processing & Gateway Pipeline Verification Summary
    - Appears IMMEDIATELY BEFORE Source Document Images / Visual PII Risk Mapping
    - Written as natural language sentences (NO table cells, NO bullet lists)
    """
    import re
    import pymupdf
    from gateway.contracts import Entity, ProcessResult, ReinsertResult, LeakCheck
    from gateway.reports import generate_internal_risk_report

    doc = pymupdf.open()
    p = doc.new_page(width=595, height=842)
    p.insert_text((50, 100), "Candidate Name: Vijay Kumar KN", fontsize=12)
    p.insert_text((50, 130), "Mobile: 9008181187", fontsize=12)
    p.insert_text((50, 160), "Email: vijay@example.com", fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()

    res = ProcessResult(
        request_id="placement_test_01",
        original_text="Verification Document. Candidate Name: Vijay Kumar KN. Mobile: 9008181187. Email: vijay@example.com.",
        sanitized_text="",
        outbound_payload="",
        llm_output="",
        final_text="",
        entities=[
            Entity("PERSON", 39, 53, "Vijay Kumar KN", page=1),
            Entity("PHONE", 62, 72, "9008181187", page=1),
            Entity("EMAIL", 80, 97, "vijay@example.com", page=1),
        ],
        reinsertion=ReinsertResult(text=""),
        leak_check=LeakCheck(passed=True),
        backend="mock",
        model="mock",
        gateway_ms=1.0,
        llm_ms=0.0,
        original_doc_bytes=pdf_bytes,
    )

    pdf_out = generate_internal_risk_report(res, original_doc_bytes=pdf_bytes)
    rep_doc = pymupdf.open(stream=pdf_out, filetype="pdf")

    all_text = "\n--- PAGE ---\n".join(page.get_text() for page in rep_doc)
    norm_text = re.sub(r"\s+", " ", all_text)

    # 1. Section presence
    assert "DOCUMENT INFORMATION SUMMARY" in all_text

    # 2. Section ordering
    pos_proc = all_text.find("PROCESSING & GATEWAY PIPELINE VERIFICATION SUMMARY")
    pos_doc = all_text.find("DOCUMENT INFORMATION SUMMARY")
    pos_vis = all_text.find("QUICK ASSESSMENT · VISUAL PII RISK MAPPING")

    assert pos_proc != -1
    assert pos_doc != -1
    assert pos_vis != -1
    assert pos_proc < pos_doc, "Processing Summary must appear BEFORE Document Information Summary"
    assert pos_doc < pos_vis, "Document Information Summary must appear BEFORE Visual Risk Mapping"

    # 3. Natural-language sentence form verification (no bullet points or tables)
    assert "The uploaded document belongs to Vijay Kumar KN (Page 1)." in norm_text
    assert "mobile number 9008181187 (Page 1)" in norm_text
    assert "email address vijay@example.com (Page 1)" in norm_text
    assert "These details were extracted from the uploaded document." in norm_text

    rep_doc.close()
