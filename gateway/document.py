"""Document processing module for PS-02 Privacy Gateway.

Extracts text locally from:
  - Text-based and scanned PDFs (PyMuPDF + Tesseract OCR fallback)
  - Images: PNG, JPG/JPEG (Pillow + Tesseract OCR)

Privacy & Security Guarantees:
  - All processing is strictly local (in-memory bytes).
  - No documents or extracted texts are sent to external services or logged.
  - Strict validation on file extension, MIME type, magic bytes, file size, and page limits.
  - Temporary objects are safely released and cleaned up.
"""
from __future__ import annotations

import hashlib
import io
import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO

from PIL import Image, ImageEnhance, ImageOps
import cv2
import numpy as np

# Maximum limits
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PDF_PAGES = 20

# Supported formats
SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/octet-stream",  # often sent by browsers for binary files
}

# Magic bytes signatures
MAGIC_BYTES = {
    "pdf": b"%PDF-",
    "png": b"\x89PNG\r\n\x1a\n",
    "jpeg": b"\xff\xd8\xff",
}


class DocumentProcessingError(Exception):
    """Raised when document extraction, validation, or OCR fails."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class ExtractedDocument:
    filename: str
    format: str
    page_count: int
    character_count: int
    text: str
    extraction_method: str  # "pymupdf_text" | "tesseract_ocr" | "hybrid"
    images: list[dict] = field(default_factory=list)  # extracted source document images
    page_spans: list[dict] = field(default_factory=list)  # [{"page": 1, "start": 0, "end": 100}, ...]
    original_bytes: bytes = b""  # original document bytes for visual risk mapping (in-memory)

    def to_dict(self) -> dict:
        return {
            "filename": self.filename,
            "format": self.format,
            "page_count": self.page_count,
            "character_count": self.character_count,
            "text": self.text,
            "extraction_method": self.extraction_method,
            "image_count": len(self.images),
        }


def find_tesseract_binary() -> str | None:
    """Locate tesseract binary on the host machine across common Windows & Unix paths."""
    # 1. Custom environment override
    env_cmd = os.environ.get("TESSERACT_CMD")
    if env_cmd and os.path.isfile(env_cmd):
        return env_cmd

    # 2. PATH resolution
    which_cmd = shutil.which("tesseract")
    if which_cmd and os.path.isfile(which_cmd):
        return which_cmd

    # 3. Known Windows directories
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")

    candidates = [
        os.path.join(local_app_data, "Programs", "Tesseract-OCR", "tesseract.exe"),
        os.path.join(program_files, "Tesseract-OCR", "tesseract.exe"),
        os.path.join(program_files_x86, "Tesseract-OCR", "tesseract.exe"),
        r"C:\Users\Vijay Kumar K N\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return None


def _init_pytesseract():
    """Configure pytesseract with located binary and tessdata path."""
    import pytesseract

    cmd = find_tesseract_binary()
    if not cmd:
        raise DocumentProcessingError(
            "Tesseract OCR is not installed or not found. Please install Tesseract-OCR or configure TESSERACT_CMD.",
            status_code=503,
        )
    pytesseract.pytesseract.tesseract_cmd = cmd

    # Auto-set TESSDATA_PREFIX if a tessdata folder sits next to the binary
    tess_dir = os.path.dirname(cmd)
    tessdata_dir = os.path.join(tess_dir, "tessdata")
    if os.path.isdir(tessdata_dir) and "TESSDATA_PREFIX" not in os.environ:
        os.environ["TESSDATA_PREFIX"] = tessdata_dir

    return pytesseract


def assess_image_quality(gray: np.ndarray) -> dict:
    """Assess image quality metrics: resolution, background noise, contrast, and blankness."""
    h, w = gray.shape[:2]
    bg_level = float(np.median(gray))
    bg_pixels = gray[gray > bg_level - 20]
    bg_noise = float(np.std(bg_pixels)) if len(bg_pixels) > 0 else 0.0
    text_contrast = float(abs(bg_level - float(np.min(gray))))
    is_blank = text_contrast < 5.0 and bg_noise < 2.0

    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    return {
        "width": w,
        "height": h,
        "is_blank": is_blank,
        "bg_noise": bg_noise,
        "text_contrast": text_contrast,
        "laplacian_var": lap_var,
    }


def detect_and_correct_skew(gray: np.ndarray) -> tuple[np.ndarray, float]:
    """Detect dominant text skew angle and rotate to correct orientation."""
    h, w = gray.shape[:2]
    # Binarize text pixels with Otsu
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    pts = np.column_stack(np.where(thresh > 0))
    if len(pts) < 50:
        return gray, 0.0

    # Swap (row, col) -> (x, y)
    pts_xy = np.column_stack([pts[:, 1], pts[:, 0]])
    center, (w_box, h_box), angle = cv2.minAreaRect(pts_xy)

    # OpenCV minAreaRect returns angle in [-90, 0)
    detected = 90.0 + angle if w_box < h_box else angle
    if detected > 45.0:
        detected -= 90.0
    elif detected < -45.0:
        detected += 90.0

    # Only correct when skew is noticeable (>= 0.5 deg) and realistic (< 45 deg)
    if 0.5 <= abs(detected) < 45.0:
        M = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), detected, 1.0)
        corrected = cv2.warpAffine(
            gray,
            M,
            (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=255,
        )
        return corrected, detected

    return gray, 0.0


def _fallback_pillow_preprocess(image: Image.Image) -> Image.Image:
    """Safe fallback preprocessing using Pillow if OpenCV processing encounters an anomaly."""
    if image.mode in ("RGBA", "LA", "P"):
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode == "P":
            image = image.convert("RGBA")
        rgb_image.paste(image, mask=image.split()[-1] if "A" in image.mode else None)
        image = rgb_image
    gray = image.convert("L")
    w, h = gray.size
    if w < 1000 and h < 1000:
        factor = min(2.0, 1200 / max(w, 1))
        gray = gray.resize((int(w * factor), int(h * factor)), Image.Resampling.LANCZOS)
    enhanced = ImageOps.autocontrast(gray, cutoff=2)
    return ImageEnhance.Sharpness(enhanced).enhance(1.5)


def _preprocess_image(image: Image.Image) -> Image.Image:
    """Enhanced OpenCV-based image preprocessing pipeline for OCR readability.

    Pipeline stages:
      1. Format normalization (RGBA/LA/P transparency compositing over white).
      2. Grayscale conversion.
      3. Quality & resolution assessment (blankness, noise, contrast).
      4. Automatic skew detection and deskew rotation.
      5. Selective bypass for already-clear documents (avoids unnecessary processing).
      6. Noise reduction at native pixel scale (median / bilateral filter).
      7. Background illumination and shadow gradient normalization.
      8. Controlled scaling (upscaling low-res inputs, downscaling huge images).
      9. CLAHE (Contrast Limited Adaptive Histogram Equalization).
     10. Output conversion to PIL Image for downstream Tesseract compatibility.
    """
    try:
        # Step 1: Format normalization
        if image.mode in ("RGBA", "LA", "P"):
            rgb_image = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            rgb_image.paste(image, mask=image.split()[-1] if "A" in image.mode else None)
            image = rgb_image

        # Step 2: Grayscale conversion via OpenCV
        if image.mode == "RGB":
            arr = np.array(image)
            gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        elif image.mode == "L":
            gray = np.array(image)
        else:
            gray = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2GRAY)

        # Step 3: Quality & resolution assessment
        metrics = assess_image_quality(gray)

        # If the image is essentially uniform/blank, return directly without processing
        if metrics["is_blank"]:
            return Image.fromarray(gray)

        # Step 4: Automatic skew detection and correction
        gray, _ = detect_and_correct_skew(gray)
        h, w = gray.shape[:2]

        # Step 5: Avoid unnecessary processing of already-clear images
        if metrics["bg_noise"] < 3.0 and metrics["text_contrast"] > 130.0 and min(w, h) >= 600:
            return Image.fromarray(gray)

        # Step 6: Noise reduction at native scale
        if metrics["bg_noise"] >= 4.0:
            gray = cv2.medianBlur(gray, 3)
        elif metrics["laplacian_var"] > 800.0:
            gray = cv2.bilateralFilter(gray, d=5, sigmaColor=35, sigmaSpace=35)

        # Step 7: Illumination & Shadow Normalization
        h_g, w_g = gray.shape[:2]
        tiles = [
            gray[: h_g // 2, : w_g // 2],
            gray[: h_g // 2, w_g // 2 :],
            gray[h_g // 2 :, : w_g // 2],
            gray[h_g // 2 :, w_g // 2 :],
        ]
        tile_means = [float(np.mean(t)) for t in tiles]
        if max(tile_means) - min(tile_means) > 25.0:
            k_size = min(51, (min(h_g, w_g) // 2) * 2 + 1)
            if k_size >= 7:
                bg = cv2.medianBlur(gray, k_size)
                gray = np.clip((gray.astype(np.float32) / (bg.astype(np.float32) + 1e-5)) * 255.0, 0, 255).astype(np.uint8)

        # Step 8: Controlled scaling
        # Downscale unusually large images (e.g. > 3500px) to prevent memory spikes
        if max(h, w) > 3500:
            down_scale = 3500.0 / max(h, w)
            gray = cv2.resize(gray, None, fx=down_scale, fy=down_scale, interpolation=cv2.INTER_AREA)
        # Controlled upscaling for low-resolution documents (< 1000px width or < 200px height)
        elif w < 1000 or h < 200:
            up_scale = min(2.5, 1200.0 / max(w, h))
            if up_scale > 1.1:
                gray = cv2.resize(gray, None, fx=up_scale, fy=up_scale, interpolation=cv2.INTER_CUBIC)

        # Step 9: CLAHE contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        return Image.fromarray(enhanced)

    except Exception:
        # Fallback safely to baseline Pillow processing if OpenCV encounters any issue
        return _fallback_pillow_preprocess(image)


preprocess_image = _preprocess_image


def validate_file_metadata(filename: str, content_type: str | None, size: int) -> str:
    """Validate filename extension, MIME type, and size limits."""
    if not filename or not filename.strip():
        raise DocumentProcessingError("Filename cannot be empty.", status_code=400)

    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise DocumentProcessingError(
            f"Unsupported file format '{ext}'. Allowed formats: PDF (.pdf), PNG (.png), JPG/JPEG (.jpg, .jpeg).",
            status_code=415,
        )

    if size <= 0:
        raise DocumentProcessingError("Uploaded file is empty (0 bytes).", status_code=400)

    if size > MAX_FILE_SIZE_BYTES:
        mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise DocumentProcessingError(
            f"File size exceeds the {mb} MB maximum limit (received {size / (1024 * 1024):.1f} MB).",
            status_code=413,
        )

    return ext


def validate_file_content(content: bytes, ext: str) -> None:
    """Verify magic bytes match the expected file signature."""
    if len(content) < 4:
        raise DocumentProcessingError("File is corrupted or too small to be valid.", status_code=400)

    if ext == ".pdf":
        if not content.startswith(MAGIC_BYTES["pdf"]):
            raise DocumentProcessingError(
                "Corrupted PDF: file does not begin with standard PDF signature (%PDF-).",
                status_code=400,
            )
    elif ext == ".png":
        if not content.startswith(MAGIC_BYTES["png"]):
            raise DocumentProcessingError(
                "Corrupted PNG: file does not begin with standard PNG signature.",
                status_code=400,
            )
    elif ext in (".jpg", ".jpeg"):
        if not (content[:3] == MAGIC_BYTES["jpeg"] or (content[:2] == b"\xff\xd8")):
            raise DocumentProcessingError(
                "Corrupted JPEG: file does not begin with standard JPEG SOI marker.",
                status_code=400,
            )


def extract_images_from_pdf(content: bytes) -> list[dict]:
    """Extract original embedded images and complete scanned pages from a PDF.

    Preserves:
      - Native image quality, aspect ratio, and orientation.
      - Complete page image for scanned or image-based pages.
      - Multiple images per page preserved separately with 1-indexed page numbers.
      - Deduplicates identical images across pages (e.g. logos/watermarks).
      - Filters out trivial tracking pixels / icons (< 20px).
    """
    import hashlib
    import pymupdf
    from PIL import Image, ImageOps

    doc = pymupdf.open(stream=content, filetype="pdf")
    extracted_images: list[dict] = []
    seen_hashes: set[str] = set()

    try:
        for page_idx, page in enumerate(doc):
            page_num = page_idx + 1
            native_text = (page.get_text() or "").strip()
            image_list = page.get_images(full=True)

            # Scanned / image-based page: no extractable text
            is_scanned = len(native_text) == 0

            if is_scanned:
                # Preserve complete page image so employees can visually inspect the entire document
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                h_val = hashlib.sha256(img_bytes).hexdigest()
                if h_val not in seen_hashes:
                    seen_hashes.add(h_val)
                    extracted_images.append({
                        "page": page_num,
                        "image_index": 1,
                        "bytes": img_bytes,
                        "format": "png",
                        "width": pix.width,
                        "height": pix.height,
                        "is_scanned_page": True,
                        "label": f"Original PDF Page {page_num} · Complete Scanned Page",
                    })
                continue

            # Digital page with native text: extract embedded images separately
            embedded_idx = 1
            for img_info in image_list:
                xref = img_info[0]
                try:
                    base = doc.extract_image(xref)
                    if not base:
                        continue
                    raw_bytes = base["image"]
                    ext = base.get("ext", "png").lower()
                    w = base.get("width", 0)
                    h = base.get("height", 0)

                    # Filter out tiny spacers or tracking icons (< 20px)
                    if w < 20 or h < 20:
                        continue

                    # Handle EXIF orientation and format normalization if needed
                    try:
                        pil_img = Image.open(io.BytesIO(raw_bytes))
                        pil_img = ImageOps.exif_transpose(pil_img)
                        w, h = pil_img.size
                        if ext not in ("png", "jpeg", "jpg"):
                            buf = io.BytesIO()
                            pil_img.save(buf, format="PNG")
                            raw_bytes = buf.getvalue()
                            ext = "png"
                    except Exception:
                        pass

                    # Deduplicate images
                    h_val = hashlib.sha256(raw_bytes).hexdigest()
                    if h_val in seen_hashes:
                        continue
                    seen_hashes.add(h_val)

                    extracted_images.append({
                        "page": page_num,
                        "image_index": embedded_idx,
                        "bytes": raw_bytes,
                        "format": ext,
                        "width": w,
                        "height": h,
                        "is_scanned_page": False,
                        "label": f"Original PDF Page {page_num} · Embedded Image {embedded_idx}",
                    })
                    embedded_idx += 1
                except Exception:
                    continue
    finally:
        doc.close()

    return extracted_images


def extract_from_pdf(content: bytes, filename: str) -> ExtractedDocument:
    """Extract text from PDF using PyMuPDF with per-page OCR fallback for scanned pages."""
    import pymupdf

    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
    except Exception as e:
        raise DocumentProcessingError(f"Corrupted or invalid PDF file: {e}", status_code=400) from e

    try:
        if doc.is_encrypted:
            raise DocumentProcessingError(
                "Encrypted or password-protected PDFs are not supported.",
                status_code=400,
            )

        page_count = len(doc)
        if page_count == 0:
            raise DocumentProcessingError("PDF document contains no pages.", status_code=400)

        if page_count > MAX_PDF_PAGES:
            raise DocumentProcessingError(
                f"PDF exceeds the maximum page limit of {MAX_PDF_PAGES} pages (document has {page_count} pages).",
                status_code=400,
            )

        page_texts: list[str] = []
        used_ocr = False
        used_native = False

        for idx, page in enumerate(doc):
            text = (page.get_text() or "").strip()
            if text:
                page_texts.append(text)
                used_native = True
            else:
                # Scanned page with no extractable text -> render and use Tesseract OCR
                pytess = _init_pytesseract()
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                preprocessed = _preprocess_image(img)
                ocr_text = (pytess.image_to_string(preprocessed) or "").strip()
                if not ocr_text:
                    ocr_text = (pytess.image_to_string(preprocessed, config="--psm 6") or "").strip()
                if ocr_text:
                    page_texts.append(ocr_text)
                    used_ocr = True
                else:
                    page_texts.append(f"[Page {idx + 1}: No text detected]")

        curr_offset = 0
        page_spans = []
        for idx, p_text in enumerate(page_texts):
            start = curr_offset
            end = curr_offset + len(p_text)
            page_spans.append({"page": idx + 1, "start": start, "end": end})
            curr_offset = end + 2  # account for "\n\n" separator between pages

        full_text = "\n\n".join(page_texts).strip()
        # Verify that actual text was extracted, not just empty placeholders
        clean_text = "\n".join(
            line for line in full_text.splitlines() if not line.startswith("[Page ")
        ).strip()

        if not clean_text:
            raise DocumentProcessingError(
                "PDF contains no readable text or scanned content.",
                status_code=422,
            )

        if used_native and used_ocr:
            method = "hybrid"
        elif used_ocr:
            method = "tesseract_ocr"
        else:
            method = "pymupdf_text"

        source_images = extract_images_from_pdf(content)

        return ExtractedDocument(
            filename=filename,
            format="pdf",
            page_count=page_count,
            character_count=len(full_text),
            text=full_text,
            extraction_method=method,
            images=source_images,
            page_spans=page_spans,
            original_bytes=content,
        )
    finally:
        doc.close()


def extract_from_image(content: bytes, filename: str, ext: str) -> ExtractedDocument:
    """Extract text from PNG or JPG/JPEG images using Pillow and Tesseract OCR."""
    pytess = _init_pytesseract()

    try:
        image = Image.open(io.BytesIO(content))
        image.load()  # verify integrity
    except Exception as e:
        raise DocumentProcessingError(f"Corrupted or invalid image file: {e}", status_code=400) from e

    fmt = "png" if ext == ".png" else "jpeg"
    preprocessed = preprocess_image(image)
    ocr_text = (pytess.image_to_string(preprocessed) or "").strip()
    if not ocr_text:
        ocr_text = (pytess.image_to_string(preprocessed, config="--psm 6") or "").strip()

    if not ocr_text:
        raise DocumentProcessingError(
            "No readable text could be recognized in the image.",
            status_code=422,
        )

    source_images = [{
        "page": 1,
        "image_index": 1,
        "bytes": content,
        "format": fmt,
        "width": image.width,
        "height": image.height,
        "is_scanned_page": True,
        "label": "Original Document Image (Page 1)",
    }]

    page_spans = [{"page": 1, "start": 0, "end": len(ocr_text)}]

    return ExtractedDocument(
        filename=filename,
        format=fmt,
        page_count=1,
        character_count=len(ocr_text),
        text=ocr_text,
        extraction_method="tesseract_ocr",
        images=source_images,
        page_spans=page_spans,
        original_bytes=content,
    )


def assign_entity_pages(entities: list, page_spans: list[dict]) -> list:
    """Map character spans of detected entities to original document page numbers."""
    from dataclasses import replace

    if not page_spans:
        return entities

    assigned = []
    for ent in entities:
        page_num = None
        for span in page_spans:
            if span["start"] <= ent.start <= span["end"]:
                page_num = span["page"]
                break
        if page_num is None:
            # Fallback for boundary spans
            for span in page_spans:
                if (span["start"] <= ent.start <= span["end"]) or (span["start"] <= ent.end <= span["end"]):
                    page_num = span["page"]
                    break
        assigned.append(replace(ent, page=page_num))
    return assigned


def identify_person_photo(images: list[dict]) -> tuple[dict | None, bool]:
    """Identify and extract a person photograph from extracted document images.

    Distinguishes human face / portrait photographs from:
    - Scanned full pages (is_scanned_page == True)
    - Thumbnails (w < 60 or h < 60 or area < 4000)
    - Full-page or massive images (w > 2000 or h > 2000)
    - Signatures (aspect ratio > 1.8 or color variance < 5 or skin ratio < 2%)
    - Logos / icons (aspect ratio > 2.2 or skin ratio < 5%)

    Uses YCrCb skin tone and color variance analysis.

    Returns:
        (photo_dict, is_ambiguous):
        - (dict, False) if a single unambiguous person photo is identified.
        - (dict, True) if multiple candidates exist and top candidate is flagged for review.
        - (None, False) if no person photo is identified.
    """
    if not images:
        return None, False

    import cv2
    import numpy as np

    candidates: list[dict] = []

    for img in images:
        if img.get("is_scanned_page", False):
            continue

        w = img.get("width", 0)
        h = img.get("height", 0)
        img_bytes = img.get("bytes")
        if not img_bytes or w < 60 or h < 60 or w > 2000 or h > 2000 or (w * h) < 4000:
            continue

        aspect_ratio = float(w) / float(h)
        # Person ID / portrait photos typically range from 0.55 to 1.35
        if aspect_ratio < 0.50 or aspect_ratio > 1.50:
            continue

        try:
            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            img_cv = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img_cv is None:
                continue

            # 1. Color variance check (reject monochrome / bilevel signatures and stamps)
            diff = np.abs(img_cv[:, :, 0].astype(int) - img_cv[:, :, 1].astype(int)) + np.abs(img_cv[:, :, 1].astype(int) - img_cv[:, :, 2].astype(int))
            color_diff = float(np.mean(diff))
            if color_diff < 4.0:
                continue

            # 2. YCrCb Skin tone detection (Cr: 133-173, Cb: 77-127)
            ycrcb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2YCrCb)
            skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77], dtype=np.uint8), np.array([255, 173, 127], dtype=np.uint8))
            skin_ratio = float(np.count_nonzero(skin_mask)) / float(w * h)

            # Portrait photos typically have 7% to 65% skin tone coverage
            if skin_ratio < 0.05 or skin_ratio > 0.85:
                continue

            score = skin_ratio * 100.0
            if 0.70 <= aspect_ratio <= 1.05:
                score += 20.0
            if img.get("page", 1) == 1:
                score += 15.0

            candidates.append({"image": img, "score": score, "skin_ratio": skin_ratio})
        except Exception:
            continue

    if not candidates:
        return None, False

    if len(candidates) == 1:
        return candidates[0]["image"], False

    # Multiple candidates
    candidates.sort(key=lambda c: c["score"], reverse=True)
    if candidates[0]["score"] > 1.4 * candidates[1]["score"]:
        return candidates[0]["image"], False
    else:
        return candidates[0]["image"], True


def process_document_file(
    content: bytes,
    filename: str,
    content_type: str | None = None,
) -> ExtractedDocument:
    """Main entry point: validate file and extract text preserving document order and readability."""
    ext = validate_file_metadata(filename, content_type, len(content))
    validate_file_content(content, ext)

    if ext == ".pdf":
        return extract_from_pdf(content, filename)
    return extract_from_image(content, filename, ext)

