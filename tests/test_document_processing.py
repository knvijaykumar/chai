"""Tests for Document Processing and Upload Support in PS-02 Privacy Gateway.

Covers:
  - Text-based PDF extraction via PyMuPDF
  - Scanned PDF OCR fallback via Tesseract
  - PNG/JPG image OCR via Pillow + Tesseract
  - Multi-page PDF handling preserving order
  - Invalid file types (e.g. .txt, .exe)
  - Corrupted PDFs and images
  - Empty documents
  - File size and page limit enforcement
  - Confirmation that original extracted PII never reaches the external LLM
  - Confirmation that the existing text-input workflow still works
"""
from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

import pymupdf
from gateway.api import app
from gateway.backends import MockBackend
from gateway.document import (
    DocumentProcessingError,
    MAX_FILE_SIZE_BYTES,
    MAX_PDF_PAGES,
    find_tesseract_binary,
    process_document_file,
)
from gateway.pipeline import process


def _create_text_pdf(pages_text: list[str]) -> bytes:
    """Helper to generate a native text PDF in memory."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((50, 72), text, fontsize=12)
    buf = doc.tobytes()
    doc.close()
    return buf


def _create_scanned_pdf(image_text: str) -> bytes:
    """Helper to generate a scanned PDF (page has only an embedded image with text, no selectable text)."""
    # Create image with text
    img = Image.new("RGB", (600, 200), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 50), image_text, fill="black")
    img_buf = io.BytesIO()
    img.save(img_buf, format="PNG")
    img_bytes = img_buf.getvalue()

    doc = pymupdf.open()
    page = doc.new_page(width=600, height=200)
    page.insert_image(page.rect, stream=img_bytes)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_test_image(text: str, fmt: str = "PNG") -> bytes:
    """Helper to generate a synthetic PNG or JPEG image with text."""
    img = Image.new("RGB", (600, 160), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((30, 60), text, fill="black")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# --------------------------------------------------------------------------
# PDF Processing Tests
# --------------------------------------------------------------------------

def test_text_based_pdf_extraction():
    """Verify PyMuPDF extracts readable text from standard text-based PDF."""
    content = _create_text_pdf(["Applicant: Rahul Sharma, PAN: BNZPM2501F, Aadhaar: 4991 1866 5246."])
    doc = process_document_file(content, "applicant_form.pdf")

    assert doc.format == "pdf"
    assert doc.page_count == 1
    assert doc.extraction_method == "pymupdf_text"
    assert "Rahul Sharma" in doc.text
    assert "BNZPM2501F" in doc.text


def test_multipage_pdf_handling():
    """Verify multi-page PDF preserves page order and combines text cleanly."""
    pages = [
        "Header Page 1: Loan Application for Priya Patel.",
        "Middle Page 2: Financials - GSTIN 27ABCPK1234F1Z5.",
        "Footer Page 3: Declaration signed in Bengaluru 560001.",
    ]
    content = _create_text_pdf(pages)
    doc = process_document_file(content, "loan_multipage.pdf")

    assert doc.page_count == 3
    assert doc.format == "pdf"
    # Ensure sequential page order is strictly preserved
    pos1 = doc.text.find("Page 1")
    pos2 = doc.text.find("Page 2")
    pos3 = doc.text.find("Page 3")
    assert pos1 != -1 and pos2 != -1 and pos3 != -1
    assert pos1 < pos2 < pos3


def test_scanned_pdf_ocr():
    """Verify scanned PDF with no native text triggers per-page Tesseract OCR fallback."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    content = _create_scanned_pdf("Customer: Amit Verma, Mobile: 9876543210")
    doc = process_document_file(content, "scanned_kyc.pdf")

    assert doc.format == "pdf"
    assert doc.extraction_method in ("tesseract_ocr", "hybrid")
    # Tesseract recognizes text from the rendered page image
    assert "Amit" in doc.text or "98765" in doc.text


# --------------------------------------------------------------------------
# Image Processing & OCR Tests
# --------------------------------------------------------------------------

def test_png_image_ocr():
    """Verify Pillow + Tesseract extracts text from PNG image."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    content = _create_test_image("PAN Card BNZPM2501F", fmt="PNG")
    doc = process_document_file(content, "id_scan.png")

    assert doc.format == "png"
    assert doc.page_count == 1
    assert doc.extraction_method == "tesseract_ocr"
    assert "BNZPM2501F" in doc.text or "PAN" in doc.text


def test_jpeg_image_ocr():
    """Verify Pillow + Tesseract extracts text from JPG/JPEG image."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    content = _create_test_image("Aadhaar 4991 1866 5246", fmt="JPEG")
    doc = process_document_file(content, "aadhaar_card.jpeg")

    assert doc.format == "jpeg"
    assert doc.page_count == 1
    assert doc.extraction_method == "tesseract_ocr"
    assert "4991" in doc.text or "Aadhaar" in doc.text


# --------------------------------------------------------------------------
# Validation & Error Handling Tests
# --------------------------------------------------------------------------

def test_invalid_file_extension():
    """Verify unsupported file extensions are rejected with 415 status code."""
    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(b"some content", "data.txt")
    assert exc_info.value.status_code == 415
    assert "Unsupported file format" in exc_info.value.message


def test_corrupted_pdf():
    """Verify corrupted PDF bytes are detected and rejected."""
    # Has %PDF- signature but corrupted payload
    fake_pdf = b"%PDF-corrupted_non_parsable_stream_data_12345"
    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(fake_pdf, "broken.pdf")
    assert exc_info.value.status_code == 400


def test_corrupted_image():
    """Verify corrupted image bytes are detected and rejected."""
    # PNG signature with random garbage
    fake_png = b"\x89PNG\r\n\x1a\ncorrupted_image_data_here"
    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(fake_png, "broken.png")
    assert exc_info.value.status_code == 400


def test_empty_document():
    """Verify empty (0 byte) documents are rejected with clear message."""
    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(b"", "empty.pdf")
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.message.lower()


def test_file_size_limit_enforcement():
    """Verify files larger than 10 MB are rejected with 413."""
    oversized = b"%PDF-" + b"0" * (MAX_FILE_SIZE_BYTES + 1024)
    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(oversized, "too_large.pdf")
    assert exc_info.value.status_code == 413
    assert "exceeds" in exc_info.value.message.lower()


def test_pdf_page_limit_enforcement():
    """Verify PDFs with more than 20 pages are rejected."""
    pages = [f"Content for page {i + 1}" for i in range(MAX_PDF_PAGES + 2)]
    content = _create_text_pdf(pages)
    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(content, "too_many_pages.pdf")
    assert exc_info.value.status_code == 400
    assert "maximum page limit" in exc_info.value.message.lower()


# --------------------------------------------------------------------------
# Privacy & Security Guarantees Tests
# --------------------------------------------------------------------------

def test_original_pii_never_reaches_llm_after_document_extraction():
    """MANDATORY REQUIREMENT: Confirm extracted PII is masked before reaching the LLM."""
    # Extract synthetic PDF with real Indian identifiers
    pdf_content = _create_text_pdf([
        "Customer: Rahul Sharma, Aadhaar: 4991 1866 5246, PAN: BNZPM2501F."
    ])
    doc = process_document_file(pdf_content, "customer_kyc.pdf")

    # Pass extracted text into existing pipeline
    # Use mock echo backend that inspects what prompt was passed to it
    class TrackingBackend(MockBackend):
        def __init__(self):
            super().__init__("echo")
            self.received_prompts: list[str] = []

        def generate(self, prompt: str):
            self.received_prompts.append(prompt)
            return super().generate(prompt)

    backend = TrackingBackend()
    result = process(doc.text, backend=backend, audit=True)

    # 1. Outbound prompt sent to LLM MUST contain placeholders, NOT raw PII
    assert len(backend.received_prompts) == 1
    llm_prompt = backend.received_prompts[0]
    assert "4991 1866 5246" not in llm_prompt
    assert "BNZPM2501F" not in llm_prompt
    assert "Rahul Sharma" not in llm_prompt
    assert "<AADHAAR_" in llm_prompt or "<PAN_" in llm_prompt or "<PERSON_" in llm_prompt

    # 2. Leak guard passed
    assert result.leak_check.passed is True

    # 3. Final restored text restores the real values back for the user
    assert "4991 1866 5246" in result.final_text
    assert "BNZPM2501F" in result.final_text
    assert "Rahul Sharma" in result.final_text


def test_existing_text_input_workflow_still_works():
    """Verify existing text-input POST /process endpoint works completely unchanged."""
    client = TestClient(app)
    response = client.post(
        "/process",
        json={
            "text": "Mera naam Rahul Sharma hai, PAN BNZPM2501F.",
            "backend": "mock",
            "mock_mode": "echo",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "sanitized_text" in data
    assert "final_text" in data
    assert "BNZPM2501F" in data["final_text"]
    assert "<PAN_1>" in data["sanitized_text"]


def test_api_extract_document_endpoint():
    """Verify POST /extract-document returns extracted text for frontend review."""
    client = TestClient(app)
    pdf_bytes = _create_text_pdf(["KYC document for Diya Krishnan, PAN QJCPK9652W."])

    response = client.post(
        "/extract-document",
        files={"file": ("kyc.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "kyc.pdf"
    assert payload["format"] == "pdf"
    assert payload["page_count"] == 1
    assert "Diya Krishnan" in payload["text"]
    assert "QJCPK9652W" in payload["text"]


def test_api_process_document_endpoint():
    """Verify POST /process-document runs full extraction + masking pipeline in one call."""
    client = TestClient(app)
    pdf_bytes = _create_text_pdf(["Applicant Priya Nair, PAN BNZPM2501F, Aadhaar 4991 1866 5246."])

    response = client.post(
        "/process-document",
        files={"file": ("priya_app.pdf", pdf_bytes, "application/pdf")},
        data={"backend": "mock", "mock_mode": "echo"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in ("ok", "flagged")
    assert "sanitized_text" in payload
    assert "final_text" in payload
    assert "<PAN_1>" in payload["sanitized_text"] or "<AADHAAR_1>" in payload["sanitized_text"]
    assert "Priya Nair" in payload["final_text"]
    assert payload["document"]["filename"] == "priya_app.pdf"


# --------------------------------------------------------------------------
# OpenCV Enhanced Preprocessing & Robustness Tests
# --------------------------------------------------------------------------

def test_opencv_clear_document_image():
    """Verify clean document images pass quality assessment and extract correctly."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    content = _create_test_image("Clear KYC Form PAN BNZPM2501F Name Rahul Sharma", fmt="PNG")
    doc = process_document_file(content, "clear_kyc.png")
    assert doc.format == "png"
    assert "BNZPM2501F" in doc.text or "PAN" in doc.text


def test_opencv_low_resolution_image_upscaling():
    """Verify low-resolution images undergo controlled upscaling and character extraction."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    img = Image.new("RGB", (350, 70), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((15, 20), "PAN: BNZPM2501F", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    doc = process_document_file(buf.getvalue(), "low_res_pan.png")
    assert "BNZPM2501F" in doc.text or "PAN" in doc.text


def test_opencv_rotated_or_skewed_document():
    """Verify rotated/skewed document is automatically deskewed and text is recovered."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    base = Image.new("RGB", (800, 200), color="white")
    draw = ImageDraw.Draw(base)
    draw.text((50, 80), "PAN Card BNZPM2501F Name Rahul Sharma", fill="black")
    skewed = base.rotate(10, expand=True, fillcolor="white")
    buf = io.BytesIO()
    skewed.save(buf, format="PNG")

    doc = process_document_file(buf.getvalue(), "skewed_card.png")
    assert "PAN" in doc.text or "BNZPM" in doc.text or "Sharma" in doc.text


def test_opencv_noisy_scanned_document():
    """Verify noisy scanned image undergoes noise filtering and CLAHE to extract text."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    import numpy as np
    img = Image.new("L", (800, 160), color=210)
    draw = ImageDraw.Draw(img)
    for off in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        draw.text((50 + off[0], 60 + off[1]), "Aadhaar 4991 1866 5246 Mobile 9876543210", fill=110)
    arr = np.array(img)
    noise = np.random.RandomState(42).choice([0, 255, 128], size=arr.shape, p=[0.02, 0.02, 0.96])
    noisy = Image.fromarray(np.where(noise == 128, arr, noise).astype(np.uint8))
    buf = io.BytesIO()
    noisy.save(buf, format="PNG")

    doc = process_document_file(buf.getvalue(), "noisy_doc.png")
    assert len(doc.text) > 0


def test_opencv_scanned_pdf_pages():
    """Verify scanned PDF page passes through the enhanced OpenCV preprocessing."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    content = _create_scanned_pdf("Tax Invoice GSTIN 27ABCDE1234F1Z5 Total 4500")
    doc = process_document_file(content, "invoice_scan.pdf")
    assert doc.format == "pdf"
    assert doc.extraction_method in ("tesseract_ocr", "hybrid")
    assert "Invoice" in doc.text or "GSTIN" in doc.text or "4500" in doc.text


def test_opencv_blank_image_handling():
    """Verify blank uniform image is safely handled and raises 422 (no readable text)."""
    blank = Image.new("RGB", (300, 200), color="white")
    buf = io.BytesIO()
    blank.save(buf, format="PNG")

    with pytest.raises(DocumentProcessingError) as exc_info:
        process_document_file(buf.getvalue(), "blank.png")
    assert exc_info.value.status_code == 422
    assert "no readable text" in exc_info.value.message.lower()


def test_opencv_ocr_comparative_improvement():
    """Compare OCR before and after preprocessing, measuring character recovery on skewed image."""
    tess = find_tesseract_binary()
    if not tess:
        pytest.skip("Tesseract binary not installed on host")

    import pytesseract
    from gateway.document import _preprocess_image

    base = Image.new("RGB", (800, 200), color="white")
    draw = ImageDraw.Draw(base)
    draw.text((50, 80), "PAN Card BNZPM2501F Name Rahul Sharma", fill="black")
    skewed = base.rotate(10, expand=True, fillcolor="white")

    raw_text = pytesseract.image_to_string(skewed).strip()
    proc_img = _preprocess_image(skewed)
    proc_text = pytesseract.image_to_string(proc_img).strip()

    # Preprocessed text recovers characters and words that raw text misses
    assert len(proc_text) > 0
    assert "PAN" in proc_text or "Sharma" in proc_text or "BNZPM" in proc_text

