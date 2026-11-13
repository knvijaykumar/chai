"""Concurrency and request isolation tests for document processing.

Verifies:
1. Concurrent document uploads (/process-document) do not mix images, page spans, or original bytes.
2. Concurrent document upload and plain-text request (/process) do not cross-contaminate.
3. Pre-extraction (/extract-document) does not leak state into subsequent plain-text requests.
"""
from __future__ import annotations

import concurrent.futures
import io
import pytest
from fastapi.testclient import TestClient
import pymupdf

from gateway.api import app
from gateway.reports import get_cached_report


def _create_test_pdf(pages: list[str]) -> bytes:
    """Create an in-memory PDF with distinct text on each page."""
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), text, fontsize=12)
    buf = doc.tobytes()
    doc.close()
    return buf


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_concurrent_document_processing_isolation(client):
    """Verify concurrent /process-document calls maintain strict document isolation."""
    pdf_a_bytes = _create_test_pdf([
        "Document-A Page 1: Applicant Rajesh Verma, PAN BNZPM2501F.",
        "Document-A Page 2: Secondary declaration for Rajesh Verma in Mumbai 400001.",
    ])

    pdf_b_bytes = _create_test_pdf([
        "Document-B Single Page: KYC for Priya Nair, Aadhaar 4991 1866 5246. Contact 9876543210.",
    ])

    def run_doc_a():
        return client.post(
            "/process-document",
            files={"file": ("doc_a.pdf", pdf_a_bytes, "application/pdf")},
            data={"backend": "mock", "mock_mode": "echo"},
        )

    def run_doc_b():
        return client.post(
            "/process-document",
            files={"file": ("doc_b.pdf", pdf_b_bytes, "application/pdf")},
            data={"backend": "mock", "mock_mode": "echo"},
        )

    # Execute both requests simultaneously across worker threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(run_doc_a)
        future_b = executor.submit(run_doc_b)

        resp_a = future_a.result()
        resp_b = future_b.result()

    assert resp_a.status_code == 200, resp_a.text
    assert resp_b.status_code == 200, resp_b.text

    data_a = resp_a.json()
    data_b = resp_b.json()

    # 1. Response-level isolation
    assert data_a["document"]["filename"] == "doc_a.pdf"
    assert data_a["document"]["page_count"] == 2
    assert "Rajesh Verma" in data_a["final_text"]
    assert "Priya Nair" not in data_a["final_text"]

    assert data_b["document"]["filename"] == "doc_b.pdf"
    assert data_b["document"]["page_count"] == 1
    assert "Priya Nair" in data_b["final_text"]
    assert "Rajesh Verma" not in data_b["final_text"]

    # 2. Generated PDF Report Isolation
    report_a_bytes, status_a = get_cached_report(data_a["request_id"], "internal")
    report_b_bytes, status_b = get_cached_report(data_b["request_id"], "internal")

    assert status_a == "ok" and len(report_a_bytes) > 0
    assert status_b == "ok" and len(report_b_bytes) > 0

    doc_a = pymupdf.open(stream=report_a_bytes, filetype="pdf")
    doc_b = pymupdf.open(stream=report_b_bytes, filetype="pdf")

    text_a = "".join(p.get_text() for p in doc_a)
    text_b = "".join(p.get_text() for p in doc_b)

    # Report A must reflect only Doc A's data
    assert "BNZPM2501F" in text_a
    assert "Rajesh Verma" in text_a
    assert "Priya Nair" not in text_a
    assert "4991 1866 5246" not in text_a
    assert "Document-B" not in text_a

    # Report B must reflect only Doc B's data
    assert "4991 1866 5246" in text_b
    assert "Priya Nair" in text_b
    assert "Rajesh Verma" not in text_b
    assert "BNZPM2501F" not in text_b
    assert "Document-A" not in text_b


def test_concurrent_document_and_plain_text_isolation(client):
    """Verify concurrent document processing does not leak document data into text requests."""
    pdf_c_bytes = _create_test_pdf([
        "Confidential Contract: Mohammed Iqbal, Passport K8765432.",
    ])
    plain_text_d = "General inquiry from Vikram Patel, Mobile 9123456789."

    def run_doc():
        return client.post(
            "/process-document",
            files={"file": ("contract_c.pdf", pdf_c_bytes, "application/pdf")},
            data={"backend": "mock", "mock_mode": "echo"},
        )

    def run_text():
        return client.post(
            "/process",
            json={"text": plain_text_d, "backend": "mock", "mock_mode": "echo"},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_doc = executor.submit(run_doc)
        future_text = executor.submit(run_text)

        resp_doc = future_doc.result()
        resp_text = future_text.result()

    assert resp_doc.status_code == 200, resp_doc.text
    assert resp_text.status_code == 200, resp_text.text

    data_doc = resp_doc.json()
    data_text = resp_text.json()

    # Plain text response must not have document metadata or leaked content
    assert "document" not in data_text
    assert "Vikram Patel" in data_text["final_text"]
    assert "Mohammed Iqbal" not in data_text["final_text"]

    # Verify Report for text request contains no document C information
    report_text_bytes, status_text = get_cached_report(data_text["request_id"], "internal")
    assert status_text == "ok"
    text_report = "".join(p.get_text() for p in pymupdf.open(stream=report_text_bytes, filetype="pdf"))

    assert "Vikram Patel" in text_report
    assert "Mohammed Iqbal" not in text_report
    assert "K8765432" not in text_report
    assert "contract_c.pdf" not in text_report


def test_extract_document_does_not_pollute_subsequent_text_request(client):
    """Verify that calling /extract-document does not leak original bytes into /process."""
    pdf_e_bytes = _create_test_pdf(["Extracted Preview Only: Ananya Sen, PAN BNZPM2501F."])

    # 1. User extracts document
    extract_resp = client.post(
        "/extract-document",
        files={"file": ("preview_e.pdf", pdf_e_bytes, "application/pdf")},
    )
    assert extract_resp.status_code == 200
    assert "Ananya Sen" in extract_resp.json()["text"]

    # 2. A separate plain text request comes in
    pure_text = "Independent text: Kiran Rao, Voter ID ABC1234567."
    process_resp = client.post(
        "/process",
        json={"text": pure_text, "backend": "mock", "mock_mode": "echo"},
    )
    assert process_resp.status_code == 200
    data_text = process_resp.json()

    # 3. Report for plain text request must not have any bytes or data from preview_e.pdf
    report_bytes, status = get_cached_report(data_text["request_id"], "internal")
    assert status == "ok"
    report_text = "".join(p.get_text() for p in pymupdf.open(stream=report_bytes, filetype="pdf"))

    assert "Kiran Rao" in report_text
    assert "Ananya Sen" not in report_text
    assert "preview_e.pdf" not in report_text

