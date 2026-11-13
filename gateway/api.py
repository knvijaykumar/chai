"""FastAPI wrapper (task 18 + document upload support).

Run:   uvicorn gateway.api:app --port 8000
Docs:  http://127.0.0.1:8000/docs

POST /process           run one document through the gateway (writes an audit row)
POST /extract-document  locally extract text from PDF/PNG/JPG/JPEG for user review
POST /process-document  extract document and run through gateway in a single call
GET  /audit             most recent audit rows (no raw values, ever)
GET  /audit/summary     counts by status: ok / flagged / blocked / error
GET  /health            liveness + which NER backend is active
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .audit import recent, summary
from .backends import GeminiBackend, MockBackend
from .document import (
    DocumentProcessingError,
    MAX_FILE_SIZE_BYTES,
    process_document_file,
)
from .pipeline import process
from .prompt import DEFAULT_TASK
from .reports import get_cached_report


@asynccontextmanager
async def lifespan(app: FastAPI):
    from .detect import detect

    detect("Warm-up for Rahul Sharma, PAN ABCPK1234F.")  # load models once at startup
    yield


app = FastAPI(
    title="PS-02 Privacy Gateway",
    description="Masks Indian PII before text reaches an LLM, then restores it in the answer.",
    version="1.1.0",
    lifespan=lifespan,
)

# Enable CORS for local web console and Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000,
                      examples=["Mera naam Rahul Sharma hai, PAN ABCPK1234F."])
    backend: Literal["mock", "gemini"] = "mock"
    mock_mode: Literal["echo", "paraphrase", "reorder", "drop", "fake"] = "echo"
    task: str = Field(DEFAULT_TASK, max_length=2_000)
    # Failure drills for demos: inject a fault on purpose.
    simulate: Literal["none", "detector_miss", "llm_outage"] = "none"
    # Check Aadhaar / PAN / GSTIN / passport / voter ID / phone; reject invalid ones.
    validate_ids: bool = True


def _detector_that_misses_a_repeat(text: str):
    """DRILL: real detection, then forget the last repeat of a value."""
    from .detect import detect
    from .values import normalize

    ents = detect(text)
    seen = {}
    for i, e in enumerate(ents):
        seen.setdefault((e.type, normalize(e.text)), []).append(i)
    repeats = [idx[-1] for idx in seen.values() if len(idx) > 1]
    if repeats:
        ents = [e for i, e in enumerate(ents) if i != max(repeats)]
    return ents


class _OutageBackend(MockBackend):
    """DRILL: an LLM provider that cannot be reached."""

    name = "gemini"

    def __init__(self):
        super().__init__("echo")
        self.model = "gemini (simulated outage)"

    def generate(self, prompt):
        raise ConnectionError("simulated outage")


@app.get("/health")
def health() -> dict:
    from .ner import ner_backend

    return {
        "status": "ok",
        "ner": ner_backend(),
        "app_name": "PS-02 Privacy Gateway",
        "version": "1.1.0",
    }


@app.post("/process")
def process_endpoint(req: ProcessRequest) -> dict:
    if req.simulate == "llm_outage":
        backend = _OutageBackend()
    elif req.backend == "gemini":
        try:
            backend = GeminiBackend()
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
    else:
        backend = MockBackend(req.mock_mode)
    detector = _detector_that_misses_a_repeat if req.simulate == "detector_miss" else None
    try:
        result = process(
            req.text,
            backend,
            task=req.task,
            audit=True,
            detector=detector,
            validate_ids=req.validate_ids,
        )
    except Exception as e:  # noqa: BLE001 - surface LLM failures as 502, not 500
        raise HTTPException(status_code=502, detail=f"LLM call failed: {type(e).__name__}") from e
    out = result.to_dict()
    from .audit import status_of

    out["status"] = status_of(result)
    return out


@app.post("/extract-document")
async def extract_document_endpoint(file: UploadFile = File(...)) -> dict:
    """Extract text from uploaded PDF or image file locally (PyMuPDF + Tesseract OCR).

    Returns extracted text and metadata for user review before running the gateway.
    Never uploads original documents or extracted text to external LLMs.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB maximum limit.",
            )
        extracted = process_document_file(content, file.filename, file.content_type)
        return extracted.to_dict()
    except DocumentProcessingError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {type(e).__name__}: {e}",
        ) from e
    finally:
        await file.close()


@app.post("/process-document")
async def process_document_endpoint(
    file: UploadFile = File(...),
    backend: Literal["mock", "gemini"] = Form("mock"),
    mock_mode: Literal["echo", "paraphrase", "reorder", "drop", "fake"] = Form("echo"),
    task: str = Form(DEFAULT_TASK),
    validate_ids: bool = Form(True),
) -> dict:
    """Extract text locally and run privacy gateway in a single call."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB maximum limit.",
            )
        extracted = process_document_file(content, file.filename, file.content_type)
    except DocumentProcessingError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
    finally:
        await file.close()

    if backend == "gemini":
        try:
            llm_backend = GeminiBackend()
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
    else:
        llm_backend = MockBackend(mock_mode)

    try:
        result = process(
            extracted.text,
            llm_backend,
            task=task,
            audit=True,
            validate_ids=validate_ids,
            source_images=extracted.images,
            page_spans=extracted.page_spans,
            original_doc_bytes=content,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {type(e).__name__}") from e

    out = result.to_dict()
    from .audit import status_of

    out["status"] = status_of(result)
    out["document"] = {
        "filename": extracted.filename,
        "format": extracted.format,
        "page_count": extracted.page_count,
        "extraction_method": extracted.extraction_method,
    }
    return out


@app.get("/", include_in_schema=False)
def demo_page():
    from fastapi.responses import FileResponse

    return FileResponse(os.path.join(os.path.dirname(__file__), "static", "demo.html"))


@app.get("/audit")
def audit_endpoint(limit: int = 50) -> list[dict]:
    return recent(max(1, min(limit, 500)))


@app.get("/audit/summary")
def audit_summary_endpoint() -> dict:
    """Requests by status (ok / flagged / blocked / error), leaks blocked, LLM errors."""
    return summary()


@app.get("/reports/internal/{request_id}")
def download_internal_risk_report(
    request_id: str,
    role: str = Query("authorized", description="Employee role. Must be 'authorized'."),
    x_employee_role: str | None = Header(None, alias="X-Employee-Role"),
):
    """Download confidential Internal Employee Risk Assessment PDF.

    Restricted to authorized personnel. Returns 403 if unauthorized.
    Returns 400 if the processing request failed or was blocked.
    """
    if isinstance(x_employee_role, str) and x_employee_role.strip():
        effective_role = x_employee_role.strip().lower()
    elif isinstance(role, str) and role.strip():
        effective_role = role.strip().lower()
    else:
        effective_role = "authorized"

    if effective_role != "authorized":
        raise HTTPException(
            status_code=403,
            detail="Access denied: Internal risk assessment report is restricted to authorized employees.",
        )

    pdf_bytes, status = get_cached_report(request_id, "internal")
    if status == "not_found":
        raise HTTPException(status_code=404, detail=f"No report found for request ID '{request_id}'.")
    if status == "failed":
        raise HTTPException(
            status_code=400,
            detail="Cannot generate report: processing did not complete successfully (request blocked or validation failed).",
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Internal_Risk_Assessment_{request_id}.pdf"'},
    )

